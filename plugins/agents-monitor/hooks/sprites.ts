// Pixel figures, the dithered progress bar and the dotted grid. Everything here is
// plain SVG text: the engine draws it, the CSS below runs the motion on the
// compositor, and nothing is redrawn per frame. `prefers-reduced-motion` stops it.

import type { AgentStatus, Role } from '../types'

export const CLAY = '#D97757'
export const INK = '#1F1E1D'
export const GOLD = '#F5C542'

export const COLOR: Record<Role, string> = {
  main: CLAY,
  research: '#2F4F6F',
  plan: '#6B5B95',
  build: '#8A3A18',
  review: '#4B3A7A',
  test: '#2E5E40',
  agent: '#5F5B52',
}

export const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"

// A figure is drawn on a 24 x 24 grid, one unit a pixel; feet stand on y = 24.
export const FIGURE_BOX = 24

// A pixel: x, y, width, height, color, and the group it moves with.
type Fill = (x: number, y: number, w: number, h: number, c: string, cls?: string) => void

// The shared crab: shell, claws, eye stalks and two pairs of legs that step in turn.
const crabBase = (f: Fill, clawLift = 0): void => {
  f(6, 12, 12, 8, CLAY)
  f(2, 14 + clawLift, 4, 4, CLAY, 'bd')
  f(18, 14 - clawLift, 4, 4, CLAY, 'bd')
  f(9, 9, 2, 4, CLAY)
  f(13, 9, 2, 4, CLAY)
  f(9, 7, 2, 2, INK)
  f(13, 7, 2, 2, INK)
  f(7, 20, 2, 4, CLAY, 'la')
  f(15, 20, 2, 4, CLAY, 'la')
  f(10, 20, 2, 4, CLAY, 'lb')
  f(12, 20, 2, 4, CLAY, 'lb')
}

// One costume per role: what the figure wears or holds. Each is its own drawing.
const COSTUMES: Record<Role, (f: Fill) => void> = {
  // Claude: a small gold crown.
  main: f => {
    crabBase(f)
    f(7, 5, 10, 2, GOLD, 'bd')
    f(7, 3, 2, 2, GOLD, 'bd')
    f(11, 2, 2, 3, GOLD, 'bd')
    f(15, 3, 2, 2, GOLD, 'bd')
  },
  // Research: explorer's hat and a magnifier in the right claw, sweeping.
  research: f => {
    crabBase(f)
    f(6, 6, 12, 1, '#8A6D3B', 'bd')
    f(8, 3, 8, 3, '#8A6D3B', 'bd')
    f(21, 9, 3, 3, '#2F4F6F', 'it')
    f(20, 12, 2, 2, '#2F4F6F', 'it')
  },
  // Planning: a clipboard on the back.
  plan: f => {
    crabBase(f)
    f(0, 7, 5, 9, '#F8F6F1', 'bd')
    f(1, 10, 3, 1, '#6B5B95', 'bd')
    f(1, 12, 3, 1, '#6B5B95', 'bd')
    f(2, 6, 2, 1, '#6B5B95', 'bd')
  },
  // Build: a yellow hard hat and a wrench in the left claw.
  build: f => {
    crabBase(f)
    f(6, 4, 12, 4, GOLD, 'bd')
    f(4, 7, 16, 2, '#D99A1E', 'bd')
    f(0, 12, 3, 2, '#8E929A', 'it')
    f(0, 14, 2, 7, '#8E929A', 'it')
  },
  // Review: a dark detective hat and a magnifier on the left, the lens sweeping.
  review: f => {
    crabBase(f)
    f(6, 5, 12, 2, '#3A3A3C', 'bd')
    f(8, 2, 8, 3, '#3A3A3C', 'bd')
    f(0, 10, 4, 4, '#3A3A3C', 'it')
    f(1, 11, 2, 2, '#A9D6F5', 'it')
  },
  // Testing: green goggles and a flask in the right claw, bubbling.
  test: f => {
    crabBase(f)
    f(7, 6, 4, 4, '#8BD3A8', 'bd')
    f(13, 6, 4, 4, '#8BD3A8', 'bd')
    f(20, 9, 3, 5, '#8BD3A8', 'it')
    f(20, 12, 3, 2, '#2E5E40', 'it')
  },
  // Agent: a plain crab with a ball antenna that blinks.
  agent: f => {
    crabBase(f)
    f(11, 2, 2, 4, CLAY, 'bd')
    f(10, 1, 4, 2, '#9A9A96', 'it')
  },
}

const groupsOf = (role: Role): Map<string, string[]> => {
  const groups = new Map<string, string[]>([['bd', []]])
  const f: Fill = (x, y, w, h, c, cls = 'bd') => {
    if (!groups.has(cls)) groups.set(cls, [])
    groups.get(cls)?.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`)
  }
  COSTUMES[role](f)
  return groups
}

// A figure at (x, y), scaled, in a state. The legs step apart only while running.
export const figureSvg = (role: Role, status: AgentStatus, x: number, y: number, scale: number, mirror = false): string => {
  const groups = groupsOf(role)
  const group = (cls: string) => `<g class="${cls}">${(groups.get(cls) ?? []).join('')}</g>`
  const props = [...groups.keys()].filter(k => !['bd', 'la', 'lb'].includes(k))
  const body = `<g class="bd">${(groups.get('bd') ?? []).join('')}${props.map(group).join('')}</g>`
  const state = status === 'running' ? 'run' : status === 'waiting' ? 'idle' : status
  const place = mirror
    ? `translate(${x + FIGURE_BOX * scale},${y}) scale(${-scale},${scale})`
    : `translate(${x},${y}) scale(${scale})`
  return `<g transform="${place}" shape-rendering="crispEdges"><g class="fig c-${role} ${state}">${body}${group('la')}${group('lb')}</g></g>`
}

// The motion, pure CSS. Periods divide a second so a redraw does not restart them out of phase.
export const MOTION_CSS = `<style>
.fig.run .la{animation:st .5s steps(1) infinite}.fig.run .lb{animation:st .5s steps(1) infinite -.25s}
.fig.run .bd{animation:bob .5s steps(1) infinite -.125s}
.fig.run g{transform-box:fill-box}
@keyframes st{50%{transform:translateY(-1px)}}@keyframes bob{50%{transform:translateY(1px)}}
.fig.idle .bd{animation:breathe 2.4s ease-in-out infinite}
@keyframes breathe{50%{transform:translateY(-1px)}}
.fig.done .bd{animation:hop 1.2s ease-out 2}
@keyframes hop{0%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
.fig.failed{opacity:.45}
.c-research.run .it{animation:sweep .8s steps(1) infinite}
.c-review.run .it{animation:sweep 1s steps(1) infinite -.5s}
.c-build.run .it{animation:tap .5s steps(1) infinite}
.c-test.run .it{animation:blink .5s steps(1) infinite}
.c-agent.run .it{animation:blink 1s steps(1) infinite}
@keyframes sweep{50%{transform:translate(-1px,-1px)}}
@keyframes tap{50%{transform:translateY(-1px)}}
@keyframes blink{50%{opacity:.25}}
.live{animation:p 1.6s ease-in-out infinite}@keyframes p{50%{opacity:.3}}
.t0,.t1,.t2,.t3{animation:tw 2.2s ease-in-out infinite}
.t1{animation-duration:2.8s;animation-delay:-.7s}.t2{animation-duration:1.9s;animation-delay:-1.3s}.t3{animation-duration:3.3s;animation-delay:-.4s}
@keyframes tw{0%,100%{opacity:1}50%{opacity:.3}}
@media (prefers-reduced-motion: reduce){.fig *,.fig,.live,.t0,.t1,.t2,.t3{animation:none !important}}
</style>`

// Deterministic noise, so the dither does not shimmer between redraws.
const noise = (x: number, y: number): number => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// The pixel bar: a dithered fill, sparse at its start and dense toward the head,
// with pixels twinkling in four groups. `ratio` is 0..1.
export const ditherBar = (w: number, h: number, ratio: number, color: string): string => {
  const CELL = 3
  const cols = Math.floor((w * Math.max(0, Math.min(1, ratio))) / CELL)
  const rows = Math.max(1, Math.floor(h / CELL))
  const dots: string[] = []
  for (let c = 0; c < cols; c++) {
    const density = 0.35 + 0.6 * Math.pow(c / Math.max(1, cols), 1.2)
    for (let r = 0; r < rows; r++) {
      if (noise(c, r) < density) {
        dots.push(`<rect class="t${Math.floor(noise(r, c) * 4)}" x="${c * CELL + 1}" y="${r * CELL + 1}" width="2" height="2"/>`)
      }
    }
  }
  return `<rect class="k" width="${w}" height="${h}" rx="${h / 2}"/><g fill="${color}">${dots.join('')}</g>`
}

// The dotted grid behind the pane: the same paper the savvy pane uses.
export const GRID_STEP = 16
export const gridSvg = (W: number, H: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  `<style>.d{fill:#d9d8d4}@media (prefers-color-scheme: dark){.d{fill:#3a3a38}}</style>` +
  `<defs><pattern id="g" width="${GRID_STEP}" height="${GRID_STEP}" patternUnits="userSpaceOnUse">` +
  `<circle class="d" cx="${GRID_STEP / 2}" cy="${GRID_STEP / 2}" r="1"/></pattern></defs>` +
  `<rect width="${W}" height="${H}" fill="url(#g)"/></svg>`

// Status marks, the same vocabulary as the savvy panel: live dot, check, cross, clock.
export const statusMark = (x: number, y: number, status: AgentStatus | 'planned', color: string): string => {
  if (status === 'running') return `<circle class="live" cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`
  if (status === 'done') return `<path d="M${x - 5} ${y}l3.5 3.5 6.5-7" fill="none" stroke="#3B9C5F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
  if (status === 'failed') return `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="#D0453F" stroke-width="1.8" stroke-linecap="round"/>`
  if (status === 'waiting') return `<circle cx="${x}" cy="${y}" r="3.5" fill="none" stroke="${color}" stroke-width="1.6"/>`
  return `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#9a9a96" stroke-width="1.4"/><path d="M${x} ${y - 2.5}v2.8l1.8 1.2" fill="none" stroke="#9a9a96" stroke-width="1.4" stroke-linecap="round"/>`
}

// XML-safe text for an attribute or a text node.
export const xml = (s: string): string => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
