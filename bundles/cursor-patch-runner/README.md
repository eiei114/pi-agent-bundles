# Cursor Patch Runner bundle

Bundle slug: `cursor-patch-runner`

## Purpose

Cursor mechanical patch role for small fixes, formatting, typo and config changes.

## Resources

- `extensions/status.ts` — registers `/cursor-patch-runner:bundle-status` for load verification.
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
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `cursor-patch-runner` to avoid global command collisions.
