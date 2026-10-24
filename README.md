# claude-agents-monitor

Mods para o [Claude Code](https://claude.com/claude-code). Cada item é um plugin independente dentro de `plugins/`: instale só o que você precisa.

| Plugin | Tipo | O que faz |
| --- | --- | --- |
| [agents-monitor](plugins/agents-monitor) | mod | Uma alternativa leve ao savvy-progress, no mesmo lugar: uma faixa acima do campo de digitação e o painel `/monitor`, com agentes em pixel, etapas, tempo, custo e contexto. Não gasta tokens do modelo. |

## Instalação

### Pelo marketplace

No Claude Code, digite no campo de mensagem:

```
/plugin marketplace add ThiagoLimaf/claude-agents-monitor
/plugin install agents-monitor@claude-agents-monitor
```

Depois, rode `/reload-plugins` ou reinicie a sessão.

Pelo terminal:

```bash
claude plugin marketplace add ThiagoLimaf/claude-agents-monitor
claude plugin install agents-monitor@claude-agents-monitor --scope user
```

A opção `--scope user` deixa o mod ativo em todas as sessões.

### Manualmente

```bash
git clone https://github.com/ThiagoLimaf/claude-agents-monitor.git ~/claude-agents-monitor
claude --plugin-dir ~/claude-agents-monitor/plugins/agents-monitor
```

Esse comando carrega o mod só nesta sessão. Para carregar em todas as sessões, use `CLAUDE_CODE_PLUGIN_DIRS` no `~/.claude/settings.json`, como explica o [README do claude-kit](https://github.com/johnnyvizz/claude-kit).

### Atualizar

```bash
claude plugin marketplace update claude-agents-monitor
claude plugin update agents-monitor@claude-agents-monitor
```

### Desinstalar

```bash
claude plugin uninstall agents-monitor@claude-agents-monitor
```

## Requisitos

- Claude Code 2.1.286 ou mais recente, com mods habilitados.

## Créditos e licença

O visual e o movimento seguem o [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress) e o [session-band](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/session-band), de johnnyvizz, ambos com licença MIT. O código aqui foi escrito do zero. Licença MIT; veja [LICENSE](LICENSE).
