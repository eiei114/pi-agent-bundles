# Pi Ace Balanced bundle

Bundle slug: `pi-ace-balanced`

## Purpose

Balanced controller/sentinel role for routine Multica maintenance.

## Resources

- `extensions/status.ts` — registers `/pi-ace-balanced:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.4.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/pi-ace-balanced/extensions/*.ts"
  ],
  "skills": [
    "+bundles/pi-ace-balanced/skills/*/SKILL.md"
  ]
}
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-ace-balanced` to avoid global command collisions.
