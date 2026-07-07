# Codex Spark Patch Runner bundle

Bundle slug: `codex-spark-patch-runner`

## Purpose

Low-cost Spark PR-producing patch lane for tiny fixes before Pi GLM Builder or Codex Release Engineer escalation.

## Resources

- `extensions/status.ts` — registers `/codex-spark-patch-runner:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle codex-spark-patch-runner
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `codex-spark-patch-runner` to avoid global command collisions.
