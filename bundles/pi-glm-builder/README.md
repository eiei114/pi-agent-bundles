# Pi GLM Builder bundle

Bundle slug: `pi-glm-builder`

## Purpose

Implementation fallback builder role, normally GLM-backed with model fallback available.

## Resources

- `extensions/status.ts` — registers `/pi-glm-builder:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.4.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/pi-glm-builder/extensions/*.ts"
  ],
  "skills": [
    "+bundles/pi-glm-builder/skills/*/SKILL.md"
  ]
}
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-glm-builder` to avoid global command collisions.
