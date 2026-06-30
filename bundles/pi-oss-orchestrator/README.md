# Pi OSS Orchestrator bundle

Bundle slug: `pi-oss-orchestrator`

## Purpose

Coordination and decomposition role for OSS maintenance and incubator control.

## Resources

- `extensions/status.ts` — registers `/pi-oss-orchestrator:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.1.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/pi-oss-orchestrator/extensions/*.ts"
  ],
  "skills": [
    "+bundles/pi-oss-orchestrator/skills/*/SKILL.md"
  ]
}
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-oss-orchestrator` to avoid global command collisions.
