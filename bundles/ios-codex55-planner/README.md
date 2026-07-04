# iOS Codex 5.5 Planner bundle

Bundle slug: `ios-codex55-planner`

## Purpose

Planning/review role for iOS architecture, issue slicing, App Store/privacy checks, testing strategy, and design guardrails.

## Resources

- `extensions/index.ts` — loads this bundle's role-specific extension profile.
- `extensions/status.ts` — registers `/ios-codex55-planner:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.
- `mcp.json` — source-controlled MCP adapter config that can be copied into the Multica agent MCP config. No secrets.
- Delegated Pi extensions are loaded by `extensions/index.ts`; Multica custom args should point at the git package plus `--agent-bundle`, not local runtime paths.

## Operating notes

- Use for review gates, implementation sequencing, and product/architecture tradeoff decisions.
- MCP adapter is available for read-only discovery if project MCP servers are configured, but implementation agents should run most build/test workflows.
- Use the checked-in `mcp.json` as a non-secret template, then store the actual agent MCP config in Multica instead of passing a local path.
- Do not commit Apple credentials, MCP OAuth tokens, signing assets, or personal simulator state.

## Agent-specific MCP config

Planner does not load MCP by default. Keep the Multica agent MCP config empty unless a planning task explicitly needs MCP-backed discovery.

## Recommended Multica custom args

Keep Multica agent config portable: install the Git package on the runtime, then load Pi's documented Git checkout path. Do not pass machine-local `C:/...` extension paths; runtime machines may have different paths.

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle ios-codex55-planner
```

No MCP config is passed by default.

Extension profile: Codex provider, smart-fetch, Multica spine, and bundle status. No MCP/context-mode/fff by default.

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `ios-codex55-planner` to avoid global command collisions.
- Keep MCP output token-efficient; prefer the adapter proxy tool unless a small direct-tool allowlist is intentionally configured.
