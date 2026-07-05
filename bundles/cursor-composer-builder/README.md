# Cursor Composer Builder bundle

Bundle slug: `cursor-composer-builder`

## Purpose

Cursor implementation role for bounded but ambiguous build tasks.

## Resources

- `extensions/status.ts` — registers `/cursor-composer-builder:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle cursor-composer-builder
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `cursor-composer-builder` to avoid global command collisions.
