import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'agents-monitor',
  component: 'Pane',
  requestId: 'agents-monitor',
  props: {
    title: 'Monitor',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('the pane lists the steps of the turn, on every surface', async ($, on) => {
  // Nothing sits beneath the mod: these hooks stand for the engine.
  on('command.register', () => ({ value: { command: 'monitor' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 1000 }))
  on('clock.every', () => ({ value: undefined }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: 'Corrija o checkout', wait: false, origin: { kind: 'composer' } })
  await $.tool.call({ tool: 'Read', file_path: '/src/checkout.ts' })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    const step = await ui.find({ type: 'Text', text: /checkout\.ts/ })
    expect(step?.text).toMatch(/Read checkout\.ts/)
    await ui.unmount()
  }
})

test('the pane says so before any turn', async ($, on) => {
  // Nothing sits beneath the mod: these hooks stand for the engine.
  on('command.register', () => ({ value: { command: 'monitor' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 1000 }))
  on('clock.every', () => ({ value: undefined }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const empty = await ui.find({ type: 'Text', text: /Nenhuma atividade|No activity/ })
  expect(empty?.text).toMatch(/Nenhuma atividade|No activity/)
  await ui.unmount()
})
