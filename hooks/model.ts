// Pure helpers for the monitor: prices, formatting, roles and text. No engine
// import here, so the tests can run on these functions alone.

import type { Agent, AgentStatus, Role } from '../types'

export type Lang = 'pt' | 'en'

// A usage record; the engine may leave a counter out, which counts as zero.
export type Usage = {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

// USD per million tokens: input, output, cache read, cache write. The first row
// that matches a model id wins. Cache writes are priced at the 1-hour rate.
// List prices as of 2026-10-10; update this table when prices change.
type Price = [input: number, output: number, cacheRead: number, cacheWrite: number]

const PRICES: [RegExp, Price][] = [
  [/(fable|mythos)-5-1/, [10, 50, 0.25, 20]],
  [/fable|mythos/, [10, 50, 1, 20]],
  [/opus-5-5/, [4, 20, 0.2, 8]],
  [/opus/, [5, 25, 0.5, 10]],
  [/sonnet-5-5/, [2, 10, 0.1, 4]],
  [/sonnet-5/, [2, 10, 0.2, 4]],
  [/sonnet/, [3, 15, 0.3, 6]],
  [/haiku-5-5/, [0.1, 0.5, 0.01, 0.2]],
  [/haiku/, [1, 5, 0.1, 2]],
]

// Haiku 5.5 is priced by prompt length: above 100,000 prompt tokens in one request.
const HAIKU_LONG_PROMPT = 100_000
const HAIKU_LONG: Price = [0.5, 2.5, 0.05, 1]

export const priceOf = (model: string, prompt: number): Price => {
  const id = model.toLowerCase()
  if (prompt > HAIKU_LONG_PROMPT && /haiku-5-5/.test(id)) return HAIKU_LONG
  return PRICES.find(([re]) => re.test(id))?.[1] ?? [4, 20, 0.2, 8]
}

// `isRequest` says the usage is one model request, which is what a prompt-length
// price is set by. A sum of requests is priced at the ordinary prices.
export const costOf = (model: string, u: Usage, isRequest: boolean): number => {
  const input = u.input_tokens ?? 0
  const output = u.output_tokens ?? 0
  const read = u.cache_read_input_tokens ?? 0
  const write = u.cache_creation_input_tokens ?? 0
  const prompt = isRequest ? input + read + write : 0
  const [i, o, r, w] = priceOf(model, prompt)
  return (input * i + output * o + read * r + write * w) / 1e6
}

export const tokensOf = (u: Usage): number =>
  (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)

export const fmtTime = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
}

export const fmtTokens = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : String(n))

export const fmtCost = (usd: number, lang: Lang): string => {
  const value = usd < 10 ? usd.toFixed(2) : usd.toFixed(1)
  return lang === 'pt' ? `US$ ${value.replace('.', ',')}` : `US$ ${value}`
}

// The role from a subagent type name. Unknown names are plain agents.
export const roleOf = (subagentType: string): Role => {
  const name = subagentType.toLowerCase()
  if (/explore|search|research|pesq/.test(name)) return 'research'
  if (/plan/.test(name)) return 'plan'
  if (/review|audit|critic|check/.test(name)) return 'review'
  if (/test/.test(name)) return 'test'
  if (/general|code|build|engineer|implement/.test(name)) return 'build'
  return 'agent'
}

const NAMES = ['Ana', 'Bruno', 'Carla', 'Dani', 'Eli', 'Fábio', 'Gabi', 'Hugo']

export const nameAt = (index: number): string => NAMES[index % NAMES.length] ?? 'Agente'

const TEXT = {
  pt: {
    pane: 'Monitor',
    band: 'Monitor',
    on: 'Monitor ligado.',
    off: 'Monitor desligado.',
    opened: 'Painel do monitor aberto.',
    closed: 'Painel do monitor fechado.',
    statusLine: (isOn: boolean) => (isOn ? 'Monitor ligado.' : 'Monitor desligado.'),
    main: 'Claude',
    mainDesc: 'Resposta ao seu pedido',
    team: 'Equipe',
    steps: 'Etapas',
    log: 'Atividade',
    none: 'Nenhuma atividade ainda.',
    time: 'tempo',
    tokens: 'tokens',
    cost: 'custo estimado',
    detected: 'detectadas',
    agents: 'agentes',
    move: ['Mover para a esquerda', 'Mover para a direita'],
    roles: {
      main: 'Principal',
      research: 'Pesquisa',
      plan: 'Planejamento',
      build: 'Engenharia',
      review: 'Revisão',
      test: 'Testes',
      agent: 'Agente',
    } as Record<Role, string>,
    status: { running: 'trabalhando', waiting: 'aguardando', done: 'concluído', failed: 'falhou' } as Record<AgentStatus, string>,
  },
  en: {
    pane: 'Monitor',
    band: 'Monitor',
    on: 'Monitor on.',
    off: 'Monitor off.',
    opened: 'Monitor pane opened.',
    closed: 'Monitor pane closed.',
    statusLine: (isOn: boolean) => (isOn ? 'Monitor is on.' : 'Monitor is off.'),
    main: 'Claude',
    mainDesc: 'Reply to your request',
    team: 'Team',
    steps: 'Steps',
    log: 'Activity',
    none: 'No activity yet.',
    time: 'time',
    tokens: 'tokens',
    cost: 'estimated cost',
    detected: 'detected',
    agents: 'agents',
    move: ['Move left', 'Move right'],
    roles: {
      main: 'Main',
      research: 'Research',
      plan: 'Planning',
      build: 'Engineering',
      review: 'Review',
      test: 'Testing',
      agent: 'Agent',
    } as Record<Role, string>,
    status: { running: 'working', waiting: 'waiting', done: 'done', failed: 'failed' } as Record<AgentStatus, string>,
  },
}

export const textOf = (lang: Lang) => TEXT[lang]

// The main session's status is derived: it waits while a subagent runs.
export const statusOf = (agent: Agent, agents: readonly Agent[]): AgentStatus => {
  if (agent.role !== 'main' || agent.status !== 'running') return agent.status
  return agents.some(a => a.role !== 'main' && a.status === 'running') ? 'waiting' : 'running'
}

// A short label for a tool call: the tool name and the file or command it works on.
export const toolLabel = (tool: string, input: Record<string, unknown>): string => {
  const raw = input.file_path ?? input.path ?? input.command ?? input.pattern ?? input.description ?? ''
  const text = typeof raw === 'string' ? raw : ''
  const shown = text.includes('/') && !text.includes(' ') ? text.split('/').pop() ?? text : text
  const detail = shown.length > 48 ? `${shown.slice(0, 47)}…` : shown
  return detail ? `${tool} ${detail}` : tool
}

// How many figures are working, for the band.
export const workingCount = (agents: readonly Agent[]): number =>
  agents.filter(a => a.status === 'running').length
