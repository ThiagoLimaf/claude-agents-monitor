# Histórico de versões

## 0.2.1

- Comandos com hífen e sem espaço: `/monitor-on`, `/monitor-off`, `/monitor-status` e `/monitor-compact`. O `/monitor` continua abrindo e fechando o painel.

## 0.2.0

- O mod foi movido para `plugins/agents-monitor/`, com o marketplace na raiz do repositório, no mesmo formato dos plugins do claude-kit.
- Faixa: personagens em pixel dos agentes, barra pontilhada das etapas, tempo do turno, custo do turno pelo engine, contagem do cache (âmbar aos 20 minutos, vermelha aos 10) e contexto usado.
- Painel: três blocos de resumo, agentes sobre uma grade pontilhada, movimento em CSS, grupo "Concluídos" recolhível, botões para reordenar e faixa compacta.
- Novos comandos: `/monitor-compact`. Nova configuração: `autoOpen`.
- Custo da sessão e contexto vêm do Claude Code, não de uma estimativa.

## 0.1.0

- Primeira versão: faixa acima do prompt, painel `/monitor`, `/monitor-on|off|status`, personagens animados, etapas, tempo, tokens e custo estimado. Em português e inglês.
