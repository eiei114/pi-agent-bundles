# Cursor Patch Runner bundle

Bundle slug: `cursor-patch-runner`

## Purpose

Cursor mechanical patch role for small fixes, formatting, typo and config changes.

## Resources

- `extensions/status.ts` — registers `/cursor-patch-runner:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.4.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/cursor-patch-runner/extensions/*.ts"
  ],
  "skills": [
    "+bundles/cursor-patch-runner/skills/*/SKILL.md"
  ]
}
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `cursor-patch-runner` to avoid global command collisions.
