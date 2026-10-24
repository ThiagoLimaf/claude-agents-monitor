# agents-monitor

Um mod para o Claude Code que mostra o que está acontecendo na conversa: uma faixa acima do campo de digitação e um painel aberto com `/monitor`. É uma alternativa leve e paralela ao [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress). Funciona em qualquer conversa, não só nos fluxos do savvy-flow.

Ele não gasta tokens do modelo: não faz chamadas ao modelo, não lê arquivos, não usa a internet e não registra nenhuma ferramenta para o Claude.

## Como usar

### A faixa

Aparece acima do campo de digitação depois do primeiro pedido da sessão. Mostra:

- os bonequinhos da conversa: o Claude e os subagentes;
- uma barra pontilhada com as etapas feitas pelo Claude;
- o tempo do turno atual;
- o custo do turno, em dólares, pelos números reais da sessão;
- a contagem do cache de prompt. Ela fica âmbar nos últimos 20 minutos e vermelha nos últimos 10, porque o cache expira uma hora depois da última resposta;
- o contexto usado, em porcentagem. Fica âmbar a partir de 65% e vermelho a partir de 85%.

Os botões da faixa:

- `×N` abre ou fecha o painel. O N é o número de subagentes.
- `×` esconde a faixa nesta sessão. Para mostrar de novo, use `/monitor on`.

### O painel

Abra com `/monitor`. Ele mostra:

- três blocos: custo, tokens e tempo;
- os agentes sobre uma grade pontilhada. Cada um tem um personagem pixelado com a cor do seu papel;
- as etapas da conversa, na ordem em que aconteceram;
- o histórico de atividade, com as linhas mais recentes primeiro.

Os personagens andam quando estão trabalhando, ficam parados quando aguardam outro agente, pulam quando terminam e ficam apagados quando falham.

Os botões `◀` e `▶` mudam a ordem dos subagentes. O grupo "Concluídos" pode ser recolhido.

### Papéis

Cada subagente recebe um papel pelo nome do tipo dele:

| Papel | Quando aparece |
| --- | --- |
| Pesquisa | tipos com "explore", "search" ou "research" |
| Planejamento | tipos com "plan" |
| Engenharia | tipos com "general", "code", "build" ou "implement" |
| Revisão | tipos com "review", "audit", "critic" ou "check" |
| Testes | tipos com "test" |
| Agente | qualquer outro |

## Comandos

| Comando | O que faz |
| --- | --- |
| `/monitor` | abre ou fecha o painel |
| `/monitor on` | liga o monitor. A escolha fica salva entre sessões |
| `/monitor off` | desliga o monitor. Nada é acompanhado nem desenhado enquanto estiver desligado |
| `/monitor status` | diz se o monitor está ligado |
| `/monitor compact` | recolhe o painel em uma faixa com os personagens |

## Configurações

- `language`: `pt` (Português, o padrão) ou `en` (English).
- `autoOpen`: `subagents` (o padrão) abre o painel quando um subagente começa, uma vez por turno; `never` abre o painel só com `/monitor`.

Altere pelo `/config`, ou no `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "agents-monitor": { "options": { "language": "pt", "autoOpen": "never" } } } }
```

## O que os números significam

- **Custo do turno e contexto** vêm do próprio Claude Code, então são os valores reais da sessão.
- **Tokens e custo de cada agente** são estimativas, marcadas com `≈`. Eles usam uma tabela de preços guardada no código (`hooks/model.ts`, com preços de 10/10/2026). Não são a sua conta.
- **Etapas** são as chamadas de ferramenta do Claude, na ordem em que aconteceram. Não é um plano prévio.
- **Tempo** é o tempo do turno. Para quando o turno e os subagentes terminam.

## Solução de problemas

- **A faixa não aparece:** ela só aparece depois do primeiro pedido da sessão. Confira com `/monitor status`. Se estiver `desligado`, rode `/monitor on`. Se você já tiver escondido com `×`, reinicie a sessão.
- **Mudou alguma coisa e nada aparece:** rode `/reload-plugins` ou reinicie o Claude Code.
- **O painel não abre:** confira se `/plugin` mostra o `agents-monitor` como habilitado.
- **Quero o texto em inglês:** use a configuração `language` com `en`.

## Privacidade

O mod lê só os eventos que o Claude Code envia para ele. Não grava nada no disco, exceto a escolha de ligado ou desligado. Não envia nada para a internet. Mods rodam com as suas permissões, então leia o código antes de instalar qualquer mod.

## Créditos

O layout, a barra pontilhada, a grade, o movimento e a contagem do cache seguem o savvy-progress e o session-band, de johnnyvizz (MIT). Os personagens pixelados e as roupas de cada papel foram desenhados aqui do zero.

Instruções de instalação gerais estão no [README do repositório](../../README.md).
