# iOS Codex 5.5 Fixer bundle

Bundle slug: `ios-codex55-fixer`

## Purpose

Repair role for Xcode/SwiftPM/signing/build-log issues, simulator debugging, and integration stabilization.

## Resources

- `extensions/index.ts` — loads this bundle's role-specific extension profile.
- `extensions/status.ts` — registers `/ios-codex55-fixer:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.
- `mcp.json` — source-controlled MCP adapter config that can be copied into the Multica agent MCP config. No secrets.
- Delegated Pi extensions are loaded by `extensions/index.ts`; Multica custom args should point at the git package plus `--agent-bundle`, not local runtime paths.

## Operating notes

- Use after normal builders get blocked by Xcode, SwiftPM, simulator, or test failures.
- Context-mode and MCP adapter support are included for large logs and xcodebuildmcp workflows.
- Use the checked-in `mcp.json` as a non-secret template, then store the actual agent MCP config in Multica instead of passing a local path.
- Do not commit Apple credentials, MCP OAuth tokens, signing assets, or personal simulator state.

## Agent-specific MCP config

This bundle includes `mcp.json` as the checked-in template for this role. Do **not** pass a local `--mcp-config <path>` in Multica custom args: that path belongs to the editor machine and may not exist on the runtime. Instead, write the JSON into the Multica agent MCP config when updating the agent:

```bash
multica agent update <agent-id> --mcp-config-file bundles/ios-codex55-fixer/mcp.json
```

The file includes a lazy `xcodebuildmcp` server by default (`npx -y xcodebuildmcp@2.6.2 mcp`) with `directTools: false` so Pi uses the token-efficient MCP proxy. Never commit OAuth tokens, Apple credentials, signing assets, or machine-specific auth state.

## Recommended Multica custom args

Keep Multica agent config portable: load the git package and select the role profile. Do not pass local `C:/...` extension paths; runtime machines may have different paths. Do not add `--no-extensions`; Pi skips Git package extension loading when that flag is present.

```txt
-e git:github.com/eiei114/pi-agent-bundles@v0.6.5
--agent-bundle ios-codex55-fixer
```

Agent MCP config should be stored through `multica agent update --mcp-config-file`, not passed as a local path.

Extension profile: Codex provider, smart-fetch, file search, build/test MCP, context-mode, and bundle status.

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `ios-codex55-fixer` to avoid global command collisions.
- Keep MCP output token-efficient; prefer the adapter proxy tool unless a small direct-tool allowlist is intentionally configured.
