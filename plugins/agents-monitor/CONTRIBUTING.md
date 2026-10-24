# Contributing

1. Install Claude Code 2.1.286 or newer.
2. Clone this repository and run the plugin from its folder: `claude --plugin-dir plugins/agents-monitor`.
3. Before a pull request, run `claude plugin validate plugins/agents-monitor` and `claude plugin test plugins/agents-monitor`.
4. Keep the mod free of network calls and file reads. A change that adds either needs a note in the README first.
5. Update the price table in `hooks/model.ts` with its date when prices change.
