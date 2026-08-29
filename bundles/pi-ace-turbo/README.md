# Pi Ace Turbo bundle

Bundle slug: `pi-ace-turbo`

## Purpose

Fast controller role for deterministic queue and maintenance automation. This
profile does not implement issues or produce pull requests.

## Resources

- `extensions/status.ts` — registers `/pi-ace-turbo:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle pi-ace-turbo
```

## Rules

- Do not store secrets in this bundle.
- Do not load `pi-multica-spine`; it is reserved for PR-producing work agents.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `pi-ace-turbo` to avoid global command collisions.
