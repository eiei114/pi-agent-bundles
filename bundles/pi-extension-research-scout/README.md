# Pi Extension Research Scout bundle

Bundle slug: `pi-extension-research-scout`

## Purpose

Research/scout role for Pi extension ideas and evidence gathering.

## Resources

- `extensions/status.ts` — registers `/pi-extension-research-scout:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.4.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/pi-extension-research-scout/extensions/*.ts"
  ],
  "skills": [
    "+bundles/pi-extension-research-scout/skills/*/SKILL.md"
  ]
}
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-extension-research-scout` to avoid global command collisions.
