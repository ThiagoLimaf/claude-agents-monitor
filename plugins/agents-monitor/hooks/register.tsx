import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Agent, AgentStatus, Board, Step } from '../types'

import { bandSvg, compactSvg, headerSvg, agentSvg, ACCENT } from './draw'
import { costOf, cacheSecondsLeft, fmtCost, fmtTime, fmtTokens, nameAt, roleOf, statusOf, textOf, tokensOf, toolLabel } from './model'
import type { Lang } from './model'
import { COLOR, gridSvg } from './sprites'

const PANE = 'agents-monitor'
const MAIN = 'main'
const ENABLED = 'enabled'
const LOG_MAX = 30
const STEP_MAX = 12
const AGENT_MAX = 30
const CACHE_TTL_MS = 60 * 60 * 1000
const USAGE_EVERY = 5
const LINE_H = 24
const GRID_TILE = 4096

const EMPTY: Board = {
  isOn: true,
  now: 0,
  turnStartedAt: 0,
  turnEndedAt: 0,
  sessionCost: 0,
  sessionCostAtStart: 0,
  context: 0,
  cacheExpiresAt: 0,
  agents: [],
  steps: [],
  log: [],
  isCompact: false,
  isDoneCollapsed: true,
}

const board = atom({ plugin: 'agents-monitor', key: 'board' } as const, EMPTY)

// Module values start over on a hot reload; the board and the store do not.
let lang: Lang = 'pt'
let autoOpen: 'subagents' | 'never' = 'subagents'
let ticker: { cancel: () => void } | null = null
let ticks = 0
let autoOpenedThisTurn = false

const say = (pt: string, en: string): string => (lang === 'pt' ? pt : en)

const addLog = (log: Board['log'], at: number, text: string): Board['log'] => [{ at, text }, ...log].slice(0, LOG_MAX)

const newMain = (at: number): Agent => ({
  id: MAIN,
  name: 'Claude',
  role: 'main',
  description: textOf(lang).mainDesc,
  status: 'running',
  startedAt: at,
  endedAt: 0,
  tokens: 0,
  cost: 0,
  tools: 0,
  model: '',
  lastAction: textOf(lang).thinking,
})

// A turn is live while it runs or a subagent still does: only then the clock ticks.
const isActive = (b: Board): boolean =>
  b.turnStartedAt > 0 && (b.turnEndedAt === 0 || b.agents.some(a => a.status === 'running'))

// The engine's own figures: the session cost and the context fill. Not an estimate.
const refresh = async ($: EngineInterface): Promise<void> => {
  const usage = await $.session.usage().catch(() => null)
  if (!usage) return
  await update($, board, prev => ({
    ...prev,
    sessionCost: usage.cost?.usd ?? prev.sessionCost,
    context: usage.context.percent ?? prev.context,
  }))
}

// One redraw a second while a turn is live: the clock, the cache countdown, the figures' stats.
const startTicker = ($: EngineInterface): void => {
  if (ticker) return
  ticker = $.clock.every(1000, async () => {
    ticks += 1
    const at = await $.clock.now()
    const next = await update($, board, prev => ({ ...prev, now: at }))
    if (ticks % USAGE_EVERY === 0) await refresh($)
    if (!isActive(next) && ticker) {
      ticker.cancel()
      ticker = null
    }
  })
}

const stopTickerIfIdle = async ($: EngineInterface): Promise<void> => {
  const b = await read($, board)
  if (!isActive(b) && ticker) {
    ticker.cancel()
    ticker = null
  }
}

async function togglePane($: EngineInterface): Promise<boolean> {
  const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
  if (isOpen) {
    await $.ui.close({ id: PANE })
    return false
  }
  await $.ui.open({ id: PANE, title: textOf(lang).pane })
  return true
}

// The band's time, cache countdown and turn cost, as the savvy band words them.
const cacheTextOf = (b: Board): string => {
  if (b.cacheExpiresAt === 0) return '—'
  if (b.turnEndedAt === 0) return '…'
  const left = cacheSecondsLeft(b.now, b.cacheExpiresAt)
  if (left <= 0) return textOf(lang).expired
  return fmtTime(left * 1000)
}

const totalsOf = (b: Board) => {
  const end = b.turnEndedAt || b.now
  return {
    time: fmtTime(end - b.turnStartedAt),
    turnCost: Math.max(0, b.sessionCost - b.sessionCostAtStart),
    tokens: b.agents.reduce((n, a) => n + a.tokens, 0),
  }
}

const stepsWord = (): string => textOf(lang).steps.toLowerCase()

async function setOn($: EngineInterface, isOn: boolean): Promise<{ text: string }> {
  await $.store.set(ENABLED, isOn)
  await update($, board, prev => ({ ...prev, isOn }))
  return { text: isOn ? textOf(lang).on : textOf(lang).off }
}

export const register: Register = (on, options) => {
  const opts = options as { language?: unknown; autoOpen?: unknown }
  lang = String(opts.language ?? 'pt') === 'en' ? 'en' : 'pt'
  autoOpen = String(opts.autoOpen ?? 'subagents') === 'never' ? 'never' : 'subagents'

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const saved = await $.store.get(ENABLED)
    await update($, board, prev => ({ ...prev, isOn: saved !== false }))
    const t = textOf(lang)
    await $.command.register({ name: 'monitor', description: t.commandPane })
    await $.command.register({ name: 'monitor-on', description: t.commandOn })
    await $.command.register({ name: 'monitor-off', description: t.commandOff })
    await $.command.register({ name: 'monitor-status', description: t.commandStatus })
    await $.command.register({ name: 'monitor-compact', description: t.commandCompact })

    return started
  })

  // Each command has its own name with a hyphen: /monitor, /monitor-on, /monitor-off, /monitor-status, /monitor-compact.
  on('command.run', { command: 'monitor' }, async $ => {
    const opened = await togglePane($)
    return { text: opened ? textOf(lang).opened : textOf(lang).closed }
  })

  on('command.run', { command: 'monitor-on' }, async $ => setOn($, true))

  on('command.run', { command: 'monitor-off' }, async $ => setOn($, false))

  on('command.run', { command: 'monitor-status' }, async $ => {
    const b = await read($, board)
    return { text: textOf(lang).statusLine(b.isOn) }
  })

  on('command.run', { command: 'monitor-compact' }, async $ => {
    await update($, board, prev => ({ ...prev, isCompact: !prev.isCompact }))
    return { text: textOf(lang).compact }
  })

  on('prompt.submit', async ($, e, next) => {
    const b = await read($, board)
    if (b.isOn) {
      const at = await $.clock.now()
      autoOpenedThisTurn = false
      await update($, board, prev => ({
        ...prev,
        now: at,
        turnStartedAt: at,
        turnEndedAt: 0,
        sessionCostAtStart: prev.sessionCost,
        agents: [newMain(at)],
        steps: [],
        log: addLog(prev.log, at, textOf(lang).turnStarted),
      }))
      await refresh($)
      startTicker($)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const b = await read($, board)
    if (!b.isOn) return next(e)

    const at = await $.clock.now()
    const id = e.tool_use_id
    const agentId = e.agentId
    const label = toolLabel(e.tool, e as unknown as Record<string, unknown>)
    await update($, board, prev => {
      // A subagent's own tool calls count on its figure; the main session's become steps.
      if (agentId) {
        return {
          ...prev,
          now: at,
          agents: prev.agents.map(a => (a.id === agentId ? { ...a, tools: a.tools + 1, lastAction: label } : a)),
        }
      }
      const step: Step = { id, label, status: 'running' }
      return {
        ...prev,
        now: at,
        agents: prev.agents.map(a => (a.id === MAIN ? { ...a, tools: a.tools + 1, lastAction: label } : a)),
        steps: [...prev.steps, step].slice(-STEP_MAX),
        log: addLog(prev.log, at, label),
      }
    })

    const ran = await next(e)
    if (!agentId) {
      await update($, board, prev => ({
        ...prev,
        steps: prev.steps.map(s => (s.id === id ? { ...s, status: 'done' as const } : s)),
      }))
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.deny !== undefined) return started

    const b = await read($, board)
    if (b.isOn) {
      const at = await $.clock.now()
      const id = String(started.agentId ?? e.tool_use_id)
      const role = roleOf(e.subagentType)
      const agent: Agent = {
        id,
        name: nameAt(b.agents.length),
        role,
        description: e.description,
        status: 'running',
        startedAt: at,
        endedAt: 0,
        tokens: 0,
        cost: 0,
        tools: 0,
        model: String(started.model ?? ''),
        lastAction: textOf(lang).started,
      }
      await update($, board, prev => ({
        ...prev,
        now: at,
        agents: [...prev.agents, agent].slice(-AGENT_MAX),
        log: addLog(prev.log, at, `${textOf(lang).roles[role]}: ${e.description}`),
      }))
      startTicker($)
      if (autoOpen === 'subagents' && !autoOpenedThisTurn) {
        autoOpenedThisTurn = true
        const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
        if (!isOpen) await $.ui.open({ id: PANE, title: textOf(lang).pane })
      }
    }

    return started
  }).catch(($, e, next) => next(e))

  // Each model request: its tokens and cost go to the figure that made it.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const usage = result.usage
    if (!usage) return result

    const b = await read($, board)
    if (!b.isOn) return result

    const model = usage.model || e.model
    const agentId = e.agentId ?? MAIN
    await update($, board, prev => ({
      ...prev,
      agents: prev.agents.map(a =>
        a.id !== agentId
          ? a
          : { ...a, model, tokens: a.tokens + tokensOf(usage), cost: a.cost + costOf(model, usage, true) },
      ),
    }))

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const b = await read($, board)
    if (b.isOn) {
      const at = await $.clock.now()
      const status: AgentStatus = e.reason === 'answer' ? 'done' : 'failed'
      const agentId = e.agentId
      await update($, board, prev => {
        if (agentId) {
          return {
            ...prev,
            now: at,
            agents: prev.agents.map(a => {
              if (a.id !== agentId) return a
              // A subagent whose steps went unseen still gets the turn's own sum.
              const sum = a.tokens === 0 && e.usage ? { tokens: tokensOf(e.usage), cost: costOf(e.usage.model || a.model, e.usage, false) } : {}
              return { ...a, ...sum, status, endedAt: at }
            }),
          }
        }
        return {
          ...prev,
          now: at,
          turnEndedAt: at,
          cacheExpiresAt: status === 'done' ? at + CACHE_TTL_MS : prev.cacheExpiresAt,
          agents: prev.agents.map(a => {
            if (a.id === MAIN) return { ...a, status, endedAt: at }
            if (a.status !== 'running') return a
            return { ...a, status: 'failed' as const, endedAt: at, lastAction: textOf(lang).interrupted }
          }),
          steps: prev.steps.map(s => (s.status === 'running' ? { ...s, status: 'done' as const } : s)),
          log: addLog(prev.log, at, textOf(lang).turnFinished),
        }
      })
      await refresh($)
      await stopTickerIfIdle($)
    }

    return next(e)
  })

  // The band above the prompt, stacked beneath any other mod's band as savvy-progress does.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const b = await read($, board)
    if (!b.isOn || e.props.hasSurvey || b.turnStartedAt === 0) return next(e)

    const drawn = await Promise.resolve(next(e)).catch(() => null)
    const below = drawn && typeof drawn === 'object' && (drawn as { type?: string }).type !== 'engine' ? drawn : null

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const t = textOf(lang)
    const totals = totalsOf(b)
    const doneSteps = b.steps.filter(s => s.status === 'done').length
    const crew = b.agents.filter(a => a.role !== 'main').length
    const working = b.agents.filter(a => a.status === 'running').length
    const ratio = b.steps.length ? doneSteps / b.steps.length : 0
    const stepsText = `${doneSteps}/${b.steps.length} ${stepsWord()}`
    const cacheText = cacheTextOf(b)
    const cacheSeconds = b.cacheExpiresAt ? cacheSecondsLeft(b.now, b.cacheExpiresAt) : -1
    const button = (
      <Button key="agents-monitor-pane" label={`×${crew}`} plain onPress={() => void togglePane($)} />
    )
    const hide = (
      <Button key="agents-monitor-hide" label="×" role="dismiss" plain dimColor onPress={() => update($, board, prev => ({ ...prev, isOn: false }))} />
    )

    if (e.surface !== 'terminal' && 'Svg' in ui) {
      const { Svg } = ui
      const width = Math.max(240, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      const scene = bandSvg({
        W: width,
        figures: b.agents.map(a => ({ role: a.role, status: statusOf(a, b.agents) })),
        ratio,
        steps: stepsText,
        time: totals.time,
        cost: fmtCost(totals.turnCost, lang),
        cache: cacheText,
        cacheSeconds,
        context: Math.round(b.context),
        isFinished: b.turnEndedAt > 0,
      })
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" alignItems="center" gap={1}>
            <Svg source={scene} alt={`${t.band}: ${totals.time}, ${fmtCost(totals.turnCost, lang)}, ${stepsText}`} width={width} height={28} />
            {button}
            {hide}
          </Box>
          {below}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={2}>
          <Text color={ACCENT}>● {t.band}</Text>
          <Text dimColor>{totals.time}</Text>
          <Text dimColor>{fmtCost(totals.turnCost, lang)}</Text>
          <Text dimColor>{stepsText}</Text>
          <Text dimColor>{t.cache} {cacheText}</Text>
          <Text dimColor>{working} {t.team.toLowerCase()}</Text>
          {button}
          {hide}
        </Box>
        {below}
      </Box>
    )
  })

  // The pane opened by /monitor: header tiles, the figures on the dotted grid, the steps and the activity.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const b = await read($, board)
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const t = textOf(lang)
    const totals = totalsOf(b)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)

    const move = (id: string, dir: number) =>
      update($, board, prev => {
        const agents = [...prev.agents]
        const i = agents.findIndex(a => a.id === id)
        const j = i + dir
        const moved = agents[i]
        const other = agents[j]
        if (i <= 0 || j <= 0 || !moved || !other) return prev
        agents[i] = other
        agents[j] = moved
        return { ...prev, agents }
      })

    if (b.turnStartedAt === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>{t.none}</Text>
        </Box>
      )
    }

    const summary = `${fmtCost(totals.turnCost, lang)}, ${fmtTokens(totals.tokens)} ${t.tokens}, ${totals.time}`
    const toggleCompact = (
      <Button key="compact" label={b.isCompact ? t.expand : t.compact} plain onPress={() => update($, board, prev => ({ ...prev, isCompact: !prev.isCompact }))} />
    )
    const running = b.agents.filter(a => statusOf(a, b.agents) === 'running' || statusOf(a, b.agents) === 'waiting')
    const finished = b.agents.filter(a => !running.includes(a))
    const tiles = [
      { k: t.cost, v: fmtCost(totals.turnCost, lang) },
      { k: t.tokens, v: fmtTokens(totals.tokens) },
      { k: t.time, v: totals.time },
    ]
    const doneSteps = b.steps.filter(s => s.status === 'done').length
    const stepsLine = `${doneSteps}/${b.steps.length} ${stepsWord()}`

    if (e.surface !== 'terminal' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(240, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      if (b.isCompact) {
        const strip = compactSvg(W, b.agents.map(a => ({ ...a, status: statusOf(a, b.agents) })), summary)
        return (
          <Box flexDirection="column" gap={1}>
            <Svg source={strip} alt={`${b.agents.length} ${t.team}, ${summary}`} width={W} height={30} />
            {toggleCompact}
          </Box>
        )
      }
      const shownDone = b.isDoneCollapsed ? 0 : finished.length
      const lines = 1 + (running.length ? 1 : 0) + (finished.length ? 1 : 0) + 2
      const gridH = 48 + lines * LINE_H + (running.length + shownDone) * 96 + 16 * 8
      const gridTiles = Array.from({ length: Math.ceil(gridH / GRID_TILE) }, (_, i) => Math.min(GRID_TILE, gridH - i * GRID_TILE))
      const row = (a: Agent) => {
        const status = statusOf(a, b.agents)
        return (
          <Box key={a.id} flexDirection="column">
            <Svg
              source={agentSvg(W, { agent: a, all: b.agents, at: b.now, lang, words: { tokens: t.tokens, tools: t.tools }, roleName: t.roles[a.role], statusName: t.status[status] })}
              alt={`${a.name}, ${t.roles[a.role]}, ${t.status[status]}`}
              width={W}
              height={66}
            />
            {a.role !== 'main' && (
              <Box flexDirection="row" gap={1}>
                <Button key={`left-${a.id}`} label="◀" plain onPress={() => move(a.id, -1)} />
                <Button key={`right-${a.id}`} label="▶" plain onPress={() => move(a.id, 1)} />
              </Box>
            )}
          </Box>
        )
      }
      return (
        <Box flexDirection="column">
          {gridTiles.map((tileH, i) => (
            <Svg key={`grid-${i}`} source={gridSvg(W, tileH)} alt="dotted grid" width={W} height={tileH} />
          ))}
          <Box flexDirection="column" position="absolute" top={0} left={0} right={0}>
            <Svg source={headerSvg(W, tiles)} alt={summary} width={W} height={40} />
            {toggleCompact}
            {running.length > 0 && <Text dimColor>{t.running} · {running.length}</Text>}
            {running.map(row)}
            {finished.length > 0 && (
              <Button
                key="done"
                label={`${b.isDoneCollapsed ? '▸' : '▾'} ${t.finished} · ${finished.length}`}
                plain
                onPress={() => update($, board, prev => ({ ...prev, isDoneCollapsed: !prev.isDoneCollapsed }))}
              />
            )}
            {!b.isDoneCollapsed && finished.map(row)}
            <Text bold>{t.steps} · {stepsLine}</Text>
            {b.steps.slice(-room).map(s => (
              <Text key={s.id} dimColor={s.status === 'done'} wrap="truncate-end">
                {s.status === 'done' ? '✓' : '●'} {s.label}
              </Text>
            ))}
            <Text bold>{t.log}</Text>
            {b.log.slice(0, room).map(line => (
              <Text key={`${line.at}-${line.text}`} dimColor wrap="truncate-end">
                {line.text}
              </Text>
            ))}
          </Box>
        </Box>
      )
    }

    // Terminal: the same content as text rows.
    const cols = Math.max(24, e.props.bodyColumns || 40)
    const barW = Math.max(6, Math.min(20, cols - 34))
    const filled = Math.round(barW * (b.steps.length ? doneSteps / b.steps.length : 0))
    const TERM_GLYPH: Record<AgentStatus, string> = { running: '●', waiting: '◌', done: '✓', failed: '✗' }
    return (
      <Box flexDirection="column">
        <Text dimColor wrap="truncate-end">{summary}</Text>
        <Text>{'█'.repeat(filled)}{'░'.repeat(barW - filled)} {stepsLine}</Text>
        <Text bold>{t.team}</Text>
        {b.agents.slice(0, 8).map(a => {
          const status = statusOf(a, b.agents)
          return (
            <Box key={a.id} flexDirection="column">
              <Text bold color={COLOR[a.role]} wrap="truncate-end">
                ▣ {a.name} · {t.roles[a.role]} {TERM_GLYPH[status]} {t.status[status]}
              </Text>
              <Text dimColor wrap="truncate-end">
                {'  '}
                {a.description} · {fmtCost(a.cost, lang)} · {fmtTokens(a.tokens)} {t.tokens}
              </Text>
            </Box>
          )
        })}
        <Text bold>{t.steps}</Text>
        {b.steps.slice(-room).map(s => (
          <Text key={s.id} dimColor={s.status === 'done'} wrap="truncate-end">
            {s.status === 'done' ? '✓' : '●'} {s.label}
          </Text>
        ))}
        <Text bold>{t.log}</Text>
        {b.log.slice(0, room).map(line => (
          <Text key={`${line.at}-${line.text}`} dimColor wrap="truncate-end">
            {line.text}
          </Text>
        ))}
      </Box>
    )
  })
}
