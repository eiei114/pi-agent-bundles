# Cursor Composer Builder bundle

Bundle slug: `cursor-composer-builder`

## Purpose

Cursor implementation role for bounded but ambiguous build tasks.

## Resources

- `extensions/status.ts` — registers `/cursor-composer-builder:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.1.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/cursor-composer-builder/extensions/*.ts"
  ],
  "skills": [
    "+bundles/cursor-composer-builder/skills/*/SKILL.md"
  ]
}
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `cursor-composer-builder` to avoid global command collisions.
