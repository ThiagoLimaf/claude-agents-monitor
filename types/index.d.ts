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
  // The main session first, then the subagents in the order they started.
  agents: Agent[]
  // The main session's tool calls, oldest first.
  steps: Step[]
  // Newest first.
  log: LogLine[]
}

declare module 'claude-code' {
  interface PluginState {
    'agents-monitor': { board: Board }
  }
}
