// The state contract of the agents-monitor mod: every value a drawing reads.

export type Role = 'main' | 'research' | 'plan' | 'build' | 'review' | 'test' | 'agent'

export type AgentStatus = 'running' | 'waiting' | 'done' | 'failed'

export type Agent = {
  id: string
  name: string
  role: Role
  description: string
  status: AgentStatus
  startedAt: number
  endedAt: number
  tokens: number
  cost: number
  tools: number
  model: string
  lastAction: string
}

export type Step = { id: string; label: string; status: 'running' | 'done' }

export type LogLine = { at: number; text: string }

export type Board = {
  isOn: boolean
  now: number
  // 0 until the first prompt of the session; 0 for turnEndedAt while the turn runs.
  turnStartedAt: number
  turnEndedAt: number
  // The engine's own figures, not an estimate: session cost in USD, context fill in percent.
  sessionCost: number
  sessionCostAtStart: number
  context: number
  // Epoch milliseconds when the prompt cache expires: one hour after the last answer. 0 when unknown.
  cacheExpiresAt: number
  // The main session first, then the subagents in the order they started.
  agents: Agent[]
  // The main session's tool calls, oldest first.
  steps: Step[]
  // Newest first.
  log: LogLine[]
  isCompact: boolean
  isDoneCollapsed: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'agents-monitor': { board: Board }
  }
}
