# Cursor Patch Runner bundle

Bundle slug: `cursor-patch-runner`

## Purpose

Cursor mechanical patch role for small fixes, formatting, typo and config changes.
The profile stays intentionally smaller than Cursor Composer: repository search,
work-agent completion gates, context control, and the Cursor provider only.

## Resources

- `extensions/status.ts` — registers `/cursor-patch-runner:bundle-status` for load verification.
- `shared/extensions/load-cursor-sdk.mjs` — loads `pi-cursor-embedded-compat` before the `pi-cursor-sdk` singleton.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle cursor-patch-runner
```

## Rules

- Do not store secrets in this bundle.
- Do not add `pi-smart-fetch` or `pi-mcp-adapter`; escalate research/MCP work to the Composer lane.
- Keep the exact-pinned Cursor dependency graph and do not reintroduce the OAuth provider.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `cursor-patch-runner` to avoid global command collisions.
