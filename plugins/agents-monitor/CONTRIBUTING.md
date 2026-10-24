# Como contribuir

1. Instale o Claude Code 2.1.286 ou mais recente.
2. Clone o repositório e carregue o plugin a partir da pasta dele: `claude --plugin-dir plugins/agents-monitor`.
3. Antes de abrir um pull request, rode `claude plugin validate plugins/agents-monitor` e `claude plugin test plugins/agents-monitor`.
4. Não adicione chamadas de rede nem leitura de arquivos. Se uma mudança precisar disso, descreva antes no README.
5. Quando os preços dos modelos mudarem, atualize a tabela em `hooks/model.ts` e a data nela.
6. Textos da interface ficam em `hooks/model.ts`, em português e inglês. Mantenha os dois idiomas alinhados.
