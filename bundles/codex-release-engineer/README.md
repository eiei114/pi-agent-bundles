# Codex Release Engineer bundle

Bundle slug: `codex-release-engineer`

## Purpose

Expensive release/complex engineering fallback role after cheaper routes fail.

## Resources

- `extensions/status.ts` — registers `/codex-release-engineer:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle codex-release-engineer
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `codex-release-engineer` to avoid global command collisions.
