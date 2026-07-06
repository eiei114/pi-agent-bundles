# Pi Spark Scout bundle

Bundle slug: `pi-spark-scout`

## Purpose

Spark text-only scout and seed-planning role for weekly seeds, collection rounds, external signals, and bounded incubator seed/wait steps.

## Resources

- `extensions/status.ts` — registers `/pi-spark-scout:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle pi-spark-scout
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-spark-scout` to avoid global command collisions.
