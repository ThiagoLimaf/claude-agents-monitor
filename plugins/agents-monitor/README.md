# agents-monitor

A Claude Code mod: a light, parallel alternative to [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress). It works in any conversation, not only in savvy-flow runs, and it costs no model tokens: it makes no model calls, reads no files, uses no network, and registers no tool for Claude to see.

- **Band** above the prompt: the figures of the turn, a dithered pixel bar of the main session's steps, the turn's time, the turn's cost, the prompt cache countdown and the context fill. The cache countdown turns amber 20 minutes before it expires and red at 10, as session-band does. `×N` opens the pane; `×` hides the band for the session.
- **Pane** (`/monitor`): three tiles (cost, tokens, time), the agents on a dotted grid, the steps, and the activity. Each agent is a pixel figure in its role's costume. Figures walk while they work, wait while a subagent runs, hop when they finish, and fade when they fail. `◀ ▶` reorder the subagents; the done group folds away.
- **Motion** is pure CSS, run by the compositor: the walk, the blinking pixels in the bar, the live dot. `prefers-reduced-motion` stops all of it. The clock redraws once a second only while a turn is live.
- **Cost and context** come from the engine's own session figures, so the band shows what the session really costs. Per-agent figures are estimates, marked `≈`.

## Commands

- `/monitor` opens or closes the pane.
- `/monitor on` and `/monitor off` turn the monitor on or off. The choice stays across sessions.
- `/monitor status` says whether it is on.
- `/monitor compact` folds the pane into one strip of figures.

## Settings

- `language`: `pt` (Português, the default) or `en`.
- `autoOpen`: `subagents` (the default) opens the pane when a subagent starts, once per turn; `never` opens it only with `/monitor`.

Set them in `/config`, or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "agents-monitor": { "options": { "language": "en", "autoOpen": "never" } } } }
```

## What the numbers mean

- **Steps** are the main session's tool calls, in order, detected from the calls themselves. They are not a plan.
- **Per-agent tokens and cost** are estimates from a built-in price table (`hooks/model.ts`, list prices as of 2026-10-10). They are not your bill.
- **Time** is the turn's elapsed time; it stops when the turn and its subagents finish.

## Credits

The layout, the dithered bar, the dotted grid, the walking motion and the band's countdown follow savvy-progress and session-band by johnnyvizz (MIT). The pixel figures and their costumes are drawn here from scratch.

## Privacy

The mod reads only the events Claude Code sends to it. It writes nothing to disk except its on/off choice, and it sends nothing anywhere. Mods run with your permissions, so read the code before you install a mod.

Install instructions are in the [repository README](../../README.md).
