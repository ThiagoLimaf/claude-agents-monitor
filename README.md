# claude-agents-monitor

Mods for [Claude Code](https://claude.com/claude-code). Every item is a standalone plugin under `plugins/`: install only what you need.

| Plugin | Type | What it does |
| --- | --- | --- |
| [agents-monitor](plugins/agents-monitor) | mod | A light alternative to savvy-progress, in the same place: a band above the prompt and a `/monitor` pane with pixel agents, steps, time, the engine's cost and context, and the prompt cache countdown. No model tokens. |

## Install

### From the marketplace

In Claude Code:

```
/plugin marketplace add ThiagoLimaf/claude-agents-monitor
/plugin install agents-monitor@claude-agents-monitor
```

Restart the session afterwards, or run `/reload-plugins`.

From a shell:

```bash
claude plugin marketplace add ThiagoLimaf/claude-agents-monitor
claude plugin install agents-monitor@claude-agents-monitor --scope user
```

### By hand

```bash
git clone https://github.com/ThiagoLimaf/claude-agents-monitor.git ~/claude-agents-monitor
claude --plugin-dir ~/claude-agents-monitor/plugins/agents-monitor
```

For every session, set `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json`, as the [claude-kit README](https://github.com/johnnyvizz/claude-kit) describes.

## Credits and license

The look and the motion follow [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress) and [session-band](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/session-band) by johnnyvizz, both MIT. The code here is written from scratch. Licensed under the MIT License; see [LICENSE](LICENSE).
