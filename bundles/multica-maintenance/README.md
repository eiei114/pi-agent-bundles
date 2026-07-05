# Multica Maintenance bundle

Bundle slug: `multica-maintenance`

## Purpose

Shared Multica maintenance runtime defaults used by controller/sentinel agents.

## Resources

- `extensions/status.ts` — registers `/multica-maintenance:bundle-status` for load verification.
- `skills/` — reserved for future maintenance-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle multica-maintenance
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `multica-maintenance` to avoid global command collisions.
