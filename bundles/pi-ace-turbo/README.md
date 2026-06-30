# Pi Ace Turbo bundle

Bundle slug: `pi-ace-turbo`

## Purpose

Fast queue control role such as Todo Runner and Backlog Promoter.

## Resources

- `extensions/status.ts` — registers `/pi-ace-turbo:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.1.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/pi-ace-turbo/extensions/*.ts"
  ],
  "skills": [
    "+bundles/pi-ace-turbo/skills/*/SKILL.md"
  ]
}
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-ace-turbo` to avoid global command collisions.
