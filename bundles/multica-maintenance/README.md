# Multica Maintenance bundle

Bundle slug: `multica-maintenance`

## Purpose

Shared Multica maintenance runtime defaults used by controller/sentinel agents.

## Resources

- `extensions/status.ts` — registers `/multica-maintenance:bundle-status` for load verification.
- `skills/` — reserved for future maintenance-specific skills.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.4.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/multica-maintenance/extensions/*.ts"
  ],
  "skills": [
    "+bundles/multica-maintenance/skills/*/SKILL.md"
  ]
}
```
