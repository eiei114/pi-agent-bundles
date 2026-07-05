# Pi Extension Research Scout bundle

Bundle slug: `pi-extension-research-scout`

## Purpose

Research/scout role for Pi extension ideas and evidence gathering.

## Resources

- `extensions/status.ts` — registers `/pi-extension-research-scout:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle pi-extension-research-scout
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-extension-research-scout` to avoid global command collisions.
