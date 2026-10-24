// The drawings: the band row, the pane's header tiles, one row per agent, and the
// compact strip. Each returns SVG text that the engine draws; the terminal gets text
// rows from register.tsx instead.

import type { Agent, AgentStatus, Role } from '../types'

import { cacheLevel, fmtCost, fmtTime, fmtTokens, statusOf } from './model'
import type { Lang } from './model'
import { COLOR, FONT, ditherBar, figureSvg, MOTION_CSS, statusMark, xml } from './sprites'

export const ACCENT = '#8f8cf4'
export const DONE = '#5fbf8f'
export const WARN = '#e2a94e'
export const ALERT = '#e0846b'
export const CACHE = '#4fb3a9'
export const CONTEXT = '#5fa8d3'

// The panel's paper and inks, light and dark, as the savvy panel sets them.
const PANE_CSS = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.m{fill:#9a9a96}.k{fill:#ecebe8}.ln{stroke:#e4e4e1}.tile{fill:#f4f3f0}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.m{fill:#7d7d79}.k{fill:#2c2c2b}.ln{stroke:#333331}.tile{fill:#262625}}
</style>`

// Rough advance of system UI text, in pixels; enough to place a right-hand block.
export const textWidth = (s: string, size: number): number => [...s].length * size * 0.56

const svg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${PANE_CSS}${MOTION_CSS}${body}</svg>`

const levelColor = (level: 'ok' | 'warn' | 'alert'): string => (level === 'alert' ? ALERT : level === 'warn' ? WARN : CACHE)

// Context fill colors, as session-band does: amber from 65%, red from 85%.
const contextColor = (percent: number): string => (percent >= 85 ? ALERT : percent >= 65 ? WARN : DONE)

export type BandInput = {
  W: number
  figures: { role: Role; status: AgentStatus }[]
  ratio: number
  steps: string
  time: string
  cost: string
  cache: string
  cacheSeconds: number
  context: number
  isFinished: boolean
}

// The band: figures on the left, the steps bar in the middle, the engine's own figures on the right.
export const bandSvg = (b: BandInput): string => {
  const H = 28
  const figs = b.figures.slice(0, 4)
  const figW = figs.length * 22 + 4
  const figuresSvg = figs.map((f, i) => figureSvg(f.role, f.status, 4 + i * 22, 1, 0.9)).join('')

  // The right block is laid out from its right edge, so each item keeps its own color.
  const items: { text: string; color: string }[] = [
    { text: b.time, color: '#1f1f1f' },
    { text: b.cost, color: DONE },
    { text: b.cache, color: levelColor(cacheLevel(b.cacheSeconds)) },
    { text: `${b.context}%`, color: contextColor(b.context) },
  ]
  const gap = 14
  let x = b.W - 6
  const placed = [...items].reverse().map(item => {
    const w = textWidth(item.text, 12)
    const at = x - w
    x = at - gap
    return { ...item, at, w }
  })
  const rightEdge = placed.length ? Math.min(...placed.map(p => p.at)) : b.W
  const steps = `<text class="s" x="${rightEdge - 10}" y="${H / 2 + 4}" text-anchor="end" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(b.steps)}</text>`
  const barX = figW + 12
  const stepsW = textWidth(b.steps, 11)
  const barW = Math.max(60, rightEdge - 10 - stepsW - 12 - barX)
  const color = b.isFinished ? DONE : ACCENT
  const texts = placed
    .map(p => `<text x="${p.at}" y="${H / 2 + 4}" font-family="${FONT}" font-size="12" font-weight="600" font-variant-numeric="tabular-nums" fill="${p.color}">${xml(p.text)}</text>`)
    .join('')
  return svg(
    b.W,
    H,
    `${figuresSvg}
<g transform="translate(${barX},${(H - 16) / 2})">${ditherBar(barW, 16, b.ratio, color)}</g>
${steps}${texts}`,
  )
}

// The pane's header: three tiles, the same shape as the savvy header.
export const headerSvg = (W: number, tiles: { k: string; v: string }[]): string => {
  const gap = 6
  const tw = (W - gap * (tiles.length - 1)) / tiles.length
  const body = tiles
    .map(
      (t, i) =>
        `<rect class="tile" x="${i * (tw + gap)}" y="0" width="${tw}" height="40" rx="8"/>` +
        `<text class="s" x="${i * (tw + gap) + 9}" y="16" font-family="${FONT}" font-size="11">${xml(t.k)}</text>` +
        `<text class="t" x="${i * (tw + gap) + 9}" y="33" font-family="${FONT}" font-size="15" font-weight="600" font-variant-numeric="tabular-nums">${xml(t.v)}</text>`,
    )
    .join('')
  return svg(W, 40, body)
}

export type RowInput = {
  agent: Agent
  all: readonly Agent[]
  at: number
  lang: Lang
  words: { tokens: string; tools: string }
  roleName: string
  statusName: string
}

// One agent: its figure, name and role, status, the bar (its own progress or the context), and the stats.
export const agentSvg = (W: number, r: RowInput): string => {
  const a = r.agent
  const status = statusOf(a, r.all)
  const color = COLOR[a.role]
  const textW = W - 42 - 22
  const elapsed = (a.endedAt || r.at) - a.startedAt
  const stats = `${fmtTokens(a.tokens)} ${r.words.tokens}  ≈${fmtCost(a.cost, r.lang)}  ${fmtTime(elapsed)}`
  const meta = [a.model, `${a.tools} ${r.words.tools}`].filter(Boolean).join('  ·  ')
  const fill = status === 'done' ? 1 : a.tools > 0 ? Math.min(0.95, a.tools / 20) : 0
  const bar = fill > 0 ? ditherBar(textW, 4, fill, color) : ''
  return svg(
    W,
    66,
    `${figureSvg(a.role, status, 2, 2, 1.1)}
<text class="t" x="42" y="18" font-family="${FONT}" font-size="13" font-weight="600">${xml(a.name)}  ·  ${xml(r.roleName)}</text>
<text x="42" y="34" font-family="${FONT}" font-size="11"><tspan fill="${color}">${xml(r.statusName)}</tspan><tspan class="s">  ${xml(meta)}</tspan></text>
<text class="s" x="42" y="49" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(a.description)}</text>
<text class="s" x="${W - 8}" y="49" text-anchor="end" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(stats)}</text>
<rect class="k" x="42" y="55" width="${textW}" height="4" rx="2"/><g transform="translate(42,55)">${bar}</g>
${statusMark(W - 8, 16, status, color)}
<line class="ln" x1="0" y1="65.5" x2="${W}" y2="65.5"/>`,
  )
}

// The compact strip: one small figure per agent, the totals on the right.
export const compactSvg = (W: number, agents: readonly Agent[], totals: string): string => {
  const shown = agents.slice(0, Math.max(1, Math.floor((W - 170) / 30)))
  const more = agents.length - shown.length
  const body = shown.map((a, i) => figureSvg(a.role, a.status, i * 30, 0, 0.9)).join('')
  const x = shown.length * 30 + 4
  return svg(
    W,
    30,
    `${body}${more > 0 ? `<text class="s" x="${x}" y="19" font-family="${FONT}" font-size="12">+${more}</text>` : ''}` +
      `<text class="s" x="${W - 2}" y="19" text-anchor="end" font-family="${FONT}" font-size="12" font-variant-numeric="tabular-nums">${xml(totals)}</text>`,
  )
}
