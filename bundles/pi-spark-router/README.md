# Pi Spark Router bundle

Bundle slug: `pi-spark-router`

## Purpose

Spark control-plane spillover role for Todo Runner, Backlog Promoter, and script-first scheduled controllers when GLM weekly quota should be preserved.

## Resources

- `extensions/status.ts` — registers `/pi-spark-router:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle pi-spark-router
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-spark-router` to avoid global command collisions.
