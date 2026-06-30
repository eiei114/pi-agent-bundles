# Multica Intake Agent bundle

Bundle slug: `multica-intake-agent`

## Purpose

Intake and triage role for new Multica work items.

## Resources

- `extensions/status.ts` — registers `/multica-intake-agent:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.4.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/multica-intake-agent/extensions/*.ts"
  ],
  "skills": [
    "+bundles/multica-intake-agent/skills/*/SKILL.md"
  ]
}
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `multica-intake-agent` to avoid global command collisions.
