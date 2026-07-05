# Pi Ace bundle

Bundle slug: `pi-ace`

## Purpose

General high-capability Pi agent; keep default GLM primary and failure-only fallback support.

## Resources

- `extensions/status.ts` — registers `/pi-ace:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle pi-ace
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-ace` to avoid global command collisions.
