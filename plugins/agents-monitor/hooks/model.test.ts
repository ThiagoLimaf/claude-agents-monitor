import { expect, test } from 'claude-code/testing'

import type { Agent } from '../types'

import { cacheLevel, cacheSecondsLeft, costOf, fmtCost, fmtTime, fmtTokens, roleOf, statusOf, toolLabel, tokensOf } from './model'
import { ditherBar, figureSvg } from './sprites'

const agent = (over: Partial<Agent>): Agent => ({
  id: 'a',
  name: 'Ana',
  role: 'agent',
  description: '',
  status: 'running',
  startedAt: 0,
  endedAt: 0,
  tokens: 0,
  cost: 0,
  tools: 0,
  model: '',
  lastAction: '',
  ...over,
})

test('time reads as m:ss, or h:mm:ss past an hour', () => {
  expect(fmtTime(0)).toBe('00:00')
  expect(fmtTime(65_400)).toBe('01:05')
  expect(fmtTime(3_725_000)).toBe('1:02:05')
  expect(fmtTime(-5)).toBe('00:00')
})

test('tokens shorten past a thousand', () => {
  expect(fmtTokens(950)).toBe('950')
  expect(fmtTokens(38_200)).toBe('38,2k')
})

test('cost reads in the chosen language', () => {
  expect(fmtCost(0.4236, 'pt')).toBe('US$ 0,42')
  expect(fmtCost(0.4236, 'en')).toBe('US$ 0.42')
  expect(fmtCost(12.345, 'pt')).toBe('US$ 12,3')
})

test('a request is priced by its model and its tokens', () => {
  const usage = { input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
  expect(costOf('claude-sonnet-5-5', usage, true)).toBe(2)
  // Haiku 5.5 switches to its long-prompt rate above 100,000 prompt tokens.
  expect(costOf('claude-haiku-5-5', usage, true)).toBe(0.5)
  expect(costOf('claude-haiku-5-5', { input_tokens: 1_000 }, true) < 0.001).toBe(true)
})

test('a counter the engine leaves out counts as zero', () => {
  expect(tokensOf({ input_tokens: 10 })).toBe(10)
  expect(costOf('claude-haiku-5-5', {}, true)).toBe(0)
})

test('the prompt cache counts down one hour and turns amber, then red', () => {
  const expires = 3_600_000
  expect(cacheSecondsLeft(0, expires)).toBe(3600)
  expect(cacheSecondsLeft(expires + 1, expires)).toBe(0)
  expect(cacheSecondsLeft(0, 0)).toBe(-1)
  expect(cacheLevel(3600)).toBe('ok')
  expect(cacheLevel(19 * 60)).toBe('warn')
  expect(cacheLevel(9 * 60)).toBe('alert')
  expect(cacheLevel(-1)).toBe('ok')
})

test('the role follows the subagent type name', () => {
  expect(roleOf('Explore')).toBe('research')
  expect(roleOf('Plan')).toBe('plan')
  expect(roleOf('code-reviewer')).toBe('review')
  expect(roleOf('general-purpose')).toBe('build')
  expect(roleOf('something-else')).toBe('agent')
})

test('the main session waits while a subagent runs', () => {
  const main = agent({ id: 'main', role: 'main' })
  const worker = agent({ id: 'w', role: 'build', status: 'running' })
  expect(statusOf(main, [main, worker])).toBe('waiting')
  expect(statusOf(main, [main])).toBe('running')
  expect(statusOf({ ...worker, status: 'done' }, [])).toBe('done')
})

test('a tool label keeps the file name, not the whole path', () => {
  expect(toolLabel('Read', { file_path: '/a/b/checkout.ts' })).toBe('Read checkout.ts')
  expect(toolLabel('Bash', { command: 'npm test' })).toBe('Bash npm test')
  expect(toolLabel('Grep', {})).toBe('Grep')
})

test('a figure carries its role and state, and a bar fills with its ratio', () => {
  const figure = figureSvg('research', 'running', 0, 0, 1)
  expect(figure.includes('class="fig c-research run"')).toBe(true)
  expect(figureSvg('test', 'done', 0, 0, 1).includes('fig c-test done')).toBe(true)
  expect(ditherBar(100, 16, 0, '#000').includes('<rect class="t')).toBe(false)
  expect(ditherBar(100, 16, 1, '#000').includes('<rect class="t')).toBe(true)
})
