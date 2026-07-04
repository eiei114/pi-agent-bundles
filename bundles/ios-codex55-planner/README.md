# iOS Codex 5.5 Planner bundle

Bundle slug: `ios-codex55-planner`

## Purpose

Planning/review role for iOS architecture, issue slicing, App Store/privacy checks, testing strategy, and design guardrails.

## Resources

- `extensions/status.ts` — registers `/ios-codex55-planner:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.
- `mcp.json` — agent-specific MCP adapter config. Starts with no servers and safe token-efficient defaults.
- Delegated Pi extensions are loaded through the filtered install example below, including `pi-mcp-adapter` for MCP proxy/direct-tool support.

## Operating notes

- Use for review gates, implementation sequencing, and product/architecture tradeoff decisions.
- MCP adapter is available for read-only discovery if project MCP servers are configured, but implementation agents should run most build/test workflows.
- MCP server definitions are not stored in this bundle. Put them in `.mcp.json`, `~/.config/mcp/mcp.json`, `<Pi agent dir>/mcp.json`, or `.pi/mcp.json`.
- Do not commit Apple credentials, MCP OAuth tokens, signing assets, or personal simulator state.

## Agent-specific MCP config

This bundle owns `mcp.json` for per-agent MCP settings. Point the Multica agent at it with:

```txt
--mcp-config C:/Users/Keisu/Projects/OSS/pi-agent-bundles/bundles/ios-codex55-planner/mcp.json
```

The file intentionally starts with `"mcpServers": {}`. Add non-secret server definitions there when a server should be available only to this agent, or keep project-wide servers in `.mcp.json`. Never commit OAuth tokens, Apple credentials, signing assets, or machine-specific auth state.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.6.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+node_modules/pi-fff/index.ts",
    "+node_modules/pi-fff-non-ascii-guard/extensions",
    "+node_modules/pi-smart-fetch/dist/index.js",
    "+node_modules/pi-mcp-adapter/index.ts",
    "+node_modules/pi-multica-spine/extensions",
    "+node_modules/context-mode/build/adapters/pi/extension.js",
    "+shared/post-context-mode/extensions",
    "+node_modules/@howaboua/pi-codex-conversion/src/index.ts",
    "+bundles/ios-codex55-planner/extensions/*.ts"
  ],
  "skills": [
    "+bundles/ios-codex55-planner/skills/*/SKILL.md"
  ]
}
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `ios-codex55-planner` to avoid global command collisions.
- Keep MCP output token-efficient; prefer the adapter proxy tool unless a small direct-tool allowlist is intentionally configured.
