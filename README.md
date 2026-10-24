# Agents Monitor for Claude Code

A Claude Code mod that shows what Claude is doing, in the same place as the savvy-progress band and pane: a band above the prompt, and a pane you open with `/monitor`. Each agent is a small figure that walks while it works, waits while another agent runs, and hops when it finishes. The pane also shows time, tokens, estimated cost, the steps of the main session, and an activity log.

It works in any conversation, not only in savvy-flow runs. It makes no model calls, reads no files, uses no network, and adds no tools for Claude to see, so it costs no extra tokens.

## Install

In a terminal session, at the prompt:

```
/plugin install agents-monitor --marketplace ThiagoLimaf/claude-agents-monitor
```

From a shell:

```bash
claude plugin install agents-monitor --marketplace ThiagoLimaf/claude-agents-monitor
```

In the desktop app, click + next to the prompt box, then Plugins, Add marketplace with `ThiagoLimaf/claude-agents-monitor`, then Add plugin.

## Commands

- `/monitor` opens or closes the pane.
- `/monitor on` turns the monitor on. It stays on across sessions.
- `/monitor off` turns it off. Nothing is tracked and nothing is drawn while it is off.
- `/monitor status` says whether it is on.

## Language

The `language` option is `pt` (Português, the default) or `en`. Set it in `/config`, or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "agents-monitor": { "options": { "language": "en" } } } }
```

## What the numbers mean

- **Cost** is an estimate: tokens multiplied by a built-in price table (`hooks/model.ts`, list prices as of 2026-10-10). It is not your bill.
- **Steps** are the main session's tool calls, in order. They are detected from the calls themselves, not from a plan.
- **Time** is the elapsed time of the current turn. The clock only ticks while the turn or a subagent is running.

## Privacy and safety

The mod reads only the events Claude Code sends to it. It sends nothing anywhere, writes nothing to disk except its on/off setting, and does not read your files. Mods run with your permissions, so read the code before you install any mod. It is in this repository.

## Requirements

Claude Code 2.1.286 or newer, with mods enabled.

## Credits and license

Inspired by [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress) by johnnyvizz. The code and the figures are written from scratch. Licensed under the MIT License; see [LICENSE](LICENSE).

## Contributing

Issues and pull requests are welcome. Run `claude plugin validate .` and `claude plugin test .` before you open one. See [CONTRIBUTING.md](CONTRIBUTING.md).
