import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Agent, AgentStatus, Board, Step } from '../types'

import { costOf, fmtCost, fmtTime, fmtTokens, nameAt, roleOf, statusOf, textOf, tokensOf, toolLabel, workingCount } from './model'
import type { Lang } from './model'
import { COLOR, sceneSvg } from './scene'

const PANE = 'agents-monitor'
const MAIN = 'main'
const ENABLED = 'enabled'
const LOG_MAX = 30
const STEP_MAX = 12
const AGENT_MAX = 30
const HEIGHT = 64

const EMPTY: Board = { isOn: true, now: 0, turnStartedAt: 0, turnEndedAt: 0, agents: [], steps: [], log: [] }

const board = atom({ plugin: 'agents-monitor', key: 'board' } as const, EMPTY)

// Module values start over on a hot reload; the board and the store do not.
let lang: Lang = 'pt'
let ticker: { cancel: () => void } | null = null

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
  lastAction: say('Pensando', 'Thinking'),
})

// A turn is live while it runs or a subagent still does: only then the clock ticks.
const isActive = (b: Board): boolean =>
  b.turnStartedAt > 0 && (b.turnEndedAt === 0 || b.agents.some(a => a.status === 'running'))

const startTicker = ($: EngineInterface): void => {
  if (ticker) return
  ticker = $.clock.every(1000, async () => {
    const at = await $.clock.now()
    const next = await update($, board, prev => ({ ...prev, now: at }))
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

// The one line the band and the pane share: time, estimated cost, tokens, steps.
const summaryOf = (b: Board): string => {
  const t = textOf(lang)
  const cost = b.agents.reduce((n, a) => n + a.cost, 0)
  const tokens = b.agents.reduce((n, a) => n + a.tokens, 0)
  const done = b.steps.filter(s => s.status === 'done').length
  const end = b.turnEndedAt || b.now
  return [
    fmtTime(end - b.turnStartedAt),
    fmtCost(cost, lang),
    `${fmtTokens(tokens)} ${t.tokens}`,
    `${done}/${b.steps.length} ${t.steps.toLowerCase()}`,
  ].join(' · ')
}

export const register: Register = (on, options) => {
  const chosen = String((options as { language?: unknown }).language ?? 'pt')
  lang = chosen === 'en' ? 'en' : 'pt'

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const saved = await $.store.get(ENABLED)
    await update($, board, prev => ({ ...prev, isOn: saved !== false }))
    await $.command.register({
      name: 'monitor',
      description: say(
        'Liga, desliga ou abre o painel do monitor: /monitor on, /monitor off, /monitor status',
        'Turn the monitor on or off, or open its pane: /monitor on, /monitor off, /monitor status',
      ),
    })

    return started
  })

  on('command.run', { command: 'monitor' }, async ($, e) => {
    const t = textOf(lang)
    const arg = e.args.trim().toLowerCase()
    if (arg === 'on' || arg === 'off') {
      const isOn = arg === 'on'
      await $.store.set(ENABLED, isOn)
      await update($, board, prev => ({ ...prev, isOn }))
      return { text: isOn ? t.on : t.off }
    }
    if (arg === 'status') {
      const b = await read($, board)
      return { text: t.statusLine(b.isOn) }
    }
    const opened = await togglePane($)
    return { text: opened ? t.opened : t.closed }
  })

  on('prompt.submit', async ($, e, next) => {
    const b = await read($, board)
    if (b.isOn) {
      const at = await $.clock.now()
      await update($, board, prev => ({
        ...prev,
        now: at,
        turnStartedAt: at,
        turnEndedAt: 0,
        agents: [newMain(at)],
        steps: [],
        log: addLog(prev.log, at, say('Turno iniciado', 'Turn started')),
      }))
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
        lastAction: say('Começou', 'Started'),
      }
      await update($, board, prev => ({
        ...prev,
        now: at,
        agents: [...prev.agents, agent].slice(-AGENT_MAX),
        log: addLog(prev.log, at, `${textOf(lang).roles[role]}: ${e.description}`),
      }))
      startTicker($)
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
          agents: prev.agents.map(a => {
            if (a.id === MAIN) return { ...a, status, endedAt: at }
            if (a.status !== 'running') return a
            return { ...a, status: 'failed' as const, endedAt: at, lastAction: say('Interrompido', 'Interrupted') }
          }),
          steps: prev.steps.map(s => (s.status === 'running' ? { ...s, status: 'done' as const } : s)),
          log: addLog(prev.log, at, say('Turno concluído', 'Turn finished')),
        }
      })
      await stopTickerIfIdle($)
    }

    return next(e)
  })

  // The band above the prompt: the same place as the savvy band, stacked beneath
  // any other mod's band the way savvy-progress does.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const b = await read($, board)
    if (!b.isOn || e.props.hasSurvey || b.turnStartedAt === 0) return next(e)

    const drawn = await Promise.resolve(next(e)).catch(() => null)
    const below = drawn && typeof drawn === 'object' && (drawn as { type?: string }).type !== 'engine' ? drawn : null

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const summary = summaryOf(b)
    const crew = b.agents.filter(a => a.role !== 'main').length
    const button = <Button key="agents-monitor-pane" label={`×${crew}`} plain onPress={() => void togglePane($)} />

    if (e.surface !== 'terminal' && 'Svg' in ui) {
      const { Svg } = ui
      const figures = b.agents.slice(0, 4).map((a, i) => ({ role: a.role, status: statusOf(a, b.agents), index: i }))
      const scene = sceneSvg(figures)
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" alignItems="center" gap={1}>
            <Svg source={scene.source} alt={`${textOf(lang).band}: ${summary}`} width={scene.width} height={HEIGHT} />
            <Text wrap="truncate-end">{summary}</Text>
            {button}
          </Box>
          {below}
        </Box>
      )
    }

    const working = workingCount(b.agents)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={2}>
          <Text color={COLOR.main}>● {textOf(lang).band}</Text>
          <Text dimColor>{summary}</Text>
          <Text dimColor>{working} {textOf(lang).agents}</Text>
          {button}
        </Box>
        {below}
      </Box>
    )
  })

  // The pane opened by /monitor: the figures, one card per agent, the steps and the activity.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const b = await read($, board)
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const t = textOf(lang)
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

    const stage = b.agents.slice(0, 8).map((a, i) => ({ role: a.role, status: statusOf(a, b.agents), index: i }))
    const scene = sceneSvg(stage)
    const Stage = e.surface !== 'terminal' && 'Svg' in ui ? ui.Svg : null

    return (
      <Box flexDirection="column">
        <Text dimColor wrap="truncate-end">{summaryOf(b)}</Text>
        {Stage && <Stage source={scene.source} alt={t.team} width={scene.width} height={HEIGHT} />}
        <Text bold>{t.team}</Text>
        {b.agents.slice(0, 8).map(a => {
          const status = statusOf(a, b.agents)
          const end = a.endedAt || b.now
          return (
            <Box key={a.id} flexDirection="column">
              <Text bold color={COLOR[a.role]}>
                {a.name} · {t.roles[a.role]} · {t.status[status as AgentStatus]}
              </Text>
              <Text dimColor wrap="truncate-end">{a.description}</Text>
              <Text dimColor>
                {fmtTime(end - a.startedAt)} · {fmtCost(a.cost, lang)} · {fmtTokens(a.tokens)} {t.tokens} · {a.tools}
              </Text>
              <Text wrap="truncate-end">{a.lastAction}</Text>
              {a.role !== 'main' && (
                <Box flexDirection="row" gap={1}>
                  <Button key={`left-${a.id}`} label="◀" plain onPress={() => move(a.id, -1)} />
                  <Button key={`right-${a.id}`} label="▶" plain onPress={() => move(a.id, 1)} />
                </Box>
              )}
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
