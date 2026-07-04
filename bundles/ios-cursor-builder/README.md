# iOS Cursor Builder bundle

Bundle slug: `ios-cursor-builder`

## Purpose

SwiftUI/UI-heavy implementation role for reusable components, previews, screenshots, simulator verification, accessibility, and visual polish.

## Resources

- `extensions/status.ts` — registers `/ios-cursor-builder:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.
- `mcp.json` — agent-specific MCP adapter config. Starts with no servers and safe token-efficient defaults.
- Delegated Pi extensions are loaded through the filtered install example below, including `pi-mcp-adapter` for MCP proxy/direct-tool support.

## Operating notes

- Use for UI-heavy build slices and visual verification.
- MCP adapter is included so xcodebuildmcp or simulator-oriented MCP servers can be used when configured.
- MCP server definitions are not stored in this bundle. Put them in `.mcp.json`, `~/.config/mcp/mcp.json`, `<Pi agent dir>/mcp.json`, or `.pi/mcp.json`.
- Do not commit Apple credentials, MCP OAuth tokens, signing assets, or personal simulator state.

## Agent-specific MCP config

This bundle owns `mcp.json` for per-agent MCP settings. Point the Multica agent at it with:

```txt
--mcp-config C:/Users/Keisu/Projects/OSS/pi-agent-bundles/bundles/ios-cursor-builder/mcp.json
```

The file includes a lazy `xcodebuildmcp` server by default (`npx -y xcodebuildmcp@2.6.2 mcp`) with `directTools: false` so Pi uses the token-efficient MCP proxy. Add only non-secret server definitions here when a server should be available only to this agent, or keep project-wide servers in `.mcp.json`. Never commit OAuth tokens, Apple credentials, signing assets, or machine-specific auth state.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.6.3",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+node_modules/pi-fff/index.ts",
    "+node_modules/pi-fff-non-ascii-guard/extensions",
    "+node_modules/pi-mcp-adapter/index.ts",
    "+node_modules/pi-multica-spine/extensions",
    "+node_modules/context-mode/build/adapters/pi/extension.js",
    "+shared/post-context-mode/extensions",
    "+node_modules/@offbynan/pi-cursor-provider/index.ts",
    "+bundles/ios-cursor-builder/extensions/*.ts"
  ],
  "skills": [
    "+bundles/ios-cursor-builder/skills/*/SKILL.md"
  ]
}
```

Extension profile: Cursor provider, file search, simulator/MCP, and context-mode for UI evidence/logs. No smart-fetch by default.

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `ios-cursor-builder` to avoid global command collisions.
- Keep MCP output token-efficient; prefer the adapter proxy tool unless a small direct-tool allowlist is intentionally configured.
