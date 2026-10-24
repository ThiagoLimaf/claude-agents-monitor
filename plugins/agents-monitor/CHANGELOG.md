# Changelog

## 0.2.0

- Moved into the layout of the claude-kit plugins: `plugins/agents-monitor/`, with the marketplace at the repository root.
- Band: pixel figures of the turn, a dithered steps bar, the turn's time, the engine's turn cost, the prompt cache countdown (amber at 20 minutes, red at 10) and the context fill.
- Pane: three tiles, figures on a dotted grid, walking and state motion in CSS, collapsible done group, `◀ ▶` reorder, compact strip.
- `/monitor compact`, and the `autoOpen` setting.
- Session cost and context come from the engine, not from an estimate.

## 0.1.0

- First version: band above the prompt, `/monitor` pane, `/monitor on|off|status`, animated figures, steps, time, tokens and estimated cost. Portuguese and English.
