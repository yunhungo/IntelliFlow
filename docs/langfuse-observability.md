# Langfuse observability

IntelliFlow follows the project-scoped Codex tracing pattern used by the sibling
quantitative project. Tracing is attached at the Codex plugin-hook boundary; the
Chrome extension itself does not upload ChatGPT page content or user prompts.

The project uses the official
[`tracing@codex-observability-plugin`](https://github.com/langfuse/codex-observability-plugin).
It creates one agent trace per Codex turn, captures model generations and tool
calls, nests subagent work, records token usage, and groups turns by Codex session.

## Local setup

Project activation is committed in `.codex/config.toml`. Local credentials live
in `.codex/langfuse.json`, which is ignored by Git. Fill these fields locally:

- `enabled`: set to `true` when the destination is ready.
- `public_key`: project public key.
- `secret_key`: project secret key.
- `base_url`: the matching Cloud region or self-hosted Langfuse URL.

The safe shape is versioned as `.codex/langfuse.example.json`. Never commit the
local credential file.

Environment variables are preferred for CI:

```bash
export TRACE_TO_LANGFUSE="true"
export LANGFUSE_CODEX_PUBLIC_KEY="pk-lf-..."
export LANGFUSE_CODEX_SECRET_KEY="sk-lf-..."
export LANGFUSE_CODEX_BASE_URL="https://cloud.langfuse.com"
export LANGFUSE_CODEX_ENVIRONMENT="development"
export LANGFUSE_CODEX_TAGS='["codex","intelliflow"]'
export LANGFUSE_CODEX_MAX_CHARS="12000"
```

Environment variables override project JSON. Keep
`LANGFUSE_CODEX_FAIL_ON_ERROR=false` for normal development so observability
cannot block a Codex turn.

## Verification

After credentials are filled and tracing is enabled:

```bash
codex plugin list
npx langfuse-cli api traces list \
  --from-timestamp <recent-iso-timestamp> \
  --limit 10 \
  --order-by timestamp.desc \
  --fields core,metrics,observations \
  --json
```

Audit the trace against the current Langfuse best practices: meaningful root
input/output, stable names and tags, correct agent/generation/tool nesting,
model and token attributes, the `development` environment, and session grouping.

The integration uploads completed Codex transcript data when enabled. Do not
enable it for work that contains information that must not be stored in the
configured Langfuse deployment.
