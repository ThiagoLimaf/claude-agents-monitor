// The figures: one small SVG character per agent, animated by CSS inside the SVG.
// The animation runs in the drawing itself, so it costs no model call and no
// re-render per frame. `prefers-reduced-motion` stops it.

import type { AgentStatus, Role } from '../types'

export type Figure = { role: Role; status: AgentStatus; index: number }

export const COLOR: Record<Role, string> = {
  main: '#D97757',
  research: '#2F4F6F',
  plan: '#6B5B95',
  build: '#8A3A18',
  review: '#4B3A7A',
  test: '#2E5E40',
  agent: '#5F5B52',
}

const SLOT = 56
const HEIGHT = 64

const CSS = `
.fig .body{animation:bob .5s ease-in-out infinite alternate}
.fig.idle .body{animation:breathe 2.4s ease-in-out infinite}
.fig.done .body{animation:hop 1.2s ease-out 2}
.fig.failed .body{opacity:.45}
.fig.walk .leg.a,.fig.walk .arm.b{animation:stepA .5s ease-in-out infinite alternate}
.fig.walk .leg.b,.fig.walk .arm.a{animation:stepB .5s ease-in-out infinite alternate}
@keyframes bob{from{transform:translateY(0)}to{transform:translateY(-2px)}}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
@keyframes hop{0%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}
@keyframes stepA{from{transform:translateY(0)}to{transform:translateY(-2px)}}
@keyframes stepB{from{transform:translateY(-2px)}to{transform:translateY(0)}}
@media (prefers-reduced-motion: reduce){.fig *{animation:none !important}}
`

// The accessory drawn above the shoulder, one per role, in the role's color.
const accessory = (role: Role): string => {
  const c = COLOR[role]
  switch (role) {
    case 'main':
      return `<path d="M5 3l3-3 3 3 3-3 3 3-1 4H6z" fill="${c}"/>`
    case 'research':
      return `<circle cx="12" cy="4" r="3" fill="none" stroke="${c}" stroke-width="1.6"/><line x1="14" y1="6" x2="16" y2="8" stroke="${c}" stroke-width="1.6"/>`
    case 'plan':
      return `<rect x="8" y="1" width="8" height="10" rx="1" fill="none" stroke="${c}" stroke-width="1.6"/>`
    case 'build':
      return `<path d="M10 0l3 3-5 5-3-3z" fill="${c}"/>`
    case 'review':
      return `<circle cx="9" cy="5" r="2.4" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="15" cy="5" r="2.4" fill="none" stroke="${c}" stroke-width="1.4"/>`
    case 'test':
      return `<path d="M8 5l3 3 5-6" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`
    default:
      return `<circle cx="13" cy="4" r="2" fill="${c}"/>`
  }
}

const figure = (f: Figure): string => {
  const c = COLOR[f.role]
  const x = SLOT * f.index + SLOT / 2
  const cls = f.status === 'running' ? 'walk' : f.status === 'waiting' ? 'idle' : f.status
  return `<g class="fig ${cls}" transform="translate(${x} 0)"><g class="body">` +
    `<line class="arm a" x1="-6" y1="30" x2="-11" y2="39" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` +
    `<line class="arm b" x1="6" y1="30" x2="11" y2="39" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` +
    `<rect x="-6" y="27" width="12" height="14" rx="4" fill="${c}"/>` +
    `<line class="leg a" x1="-3" y1="41" x2="-4" y2="55" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` +
    `<line class="leg b" x1="3" y1="41" x2="4" y2="55" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="0" cy="18" r="7" fill="#FAF9F5" stroke="${c}" stroke-width="2"/>` +
    `<circle cx="-2.5" cy="17" r="1" fill="${c}"/><circle cx="2.5" cy="17" r="1" fill="${c}"/>` +
    accessory(f.role) +
    `</g></g>`
}

// One SVG holding every figure, in the order given. Its width grows with the crew.
export const sceneSvg = (figures: readonly Figure[]): { source: string; width: number } => {
  const width = Math.max(SLOT, figures.length * SLOT)
  const body = figures.map(figure).join('')
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}">` +
    `<style>${CSS}</style>${body}</svg>`
  return { source, width }
}
