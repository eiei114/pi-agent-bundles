# Pi GLM Builder bundle

Bundle slug: `pi-glm-builder`

## Purpose

Implementation fallback builder role, normally GLM-backed with model fallback available.

## Resources

- `extensions/status.ts` — registers `/pi-glm-builder:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle pi-glm-builder
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-glm-builder` to avoid global command collisions.
