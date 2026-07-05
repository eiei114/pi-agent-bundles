# Multica Intake Agent bundle

Bundle slug: `multica-intake-agent`

## Purpose

Intake and triage role for new Multica work items.

## Resources

- `extensions/status.ts` — registers `/multica-intake-agent:bundle-status` for load verification.
- `skills/` — reserved for future agent-specific skills.

## Recommended Multica custom args

Use the installed Git package checkout, matching the iOS agent bundle pattern:

```txt
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle multica-intake-agent
```

## Rules

- Do not store secrets in this bundle.
- Seed config only when missing; never overwrite human-edited config.
- Keep command names prefixed with `multica-intake-agent` to avoid global command collisions.
