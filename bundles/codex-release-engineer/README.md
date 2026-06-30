# Codex Release Engineer bundle

Bundle slug: `codex-release-engineer`

## Purpose

Expensive release/complex engineering fallback role after cheaper routes fail.

## Resources

- `extensions/status.ts` — registers `/codex-release-engineer:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended filtered install

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.4.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/codex-release-engineer/extensions/*.ts"
  ],
  "skills": [
    "+bundles/codex-release-engineer/skills/*/SKILL.md"
  ]
}
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `codex-release-engineer` to avoid global command collisions.
