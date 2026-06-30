# Bundle Authoring Guide

`pi-agent-bundles` is one Git repo with many Pi bundle slices. Each slice maps to one agent/runtime role.

## Directory shape

```txt
bundles/<agent-slug>/
  README.md
  extensions/
    status.ts
  skills/
```

Use the Multica agent name converted to kebab-case for `<agent-slug>`.

## Resource rules

- Keep bundle command names globally unique: `/<agent-slug>:bundle-status`, `/<agent-slug>:...`.
- Do not commit secrets, tokens, personal paths, or provider credentials.
- Config seed extensions may create missing config files, but must not overwrite existing files.
- Shared runtime capabilities go under `shared/`.
- Agent-specific behavior goes under `bundles/<agent-slug>/`.
- If a bundle adds a skill, the skill name must include the agent or package prefix.

## Install pattern

Prefer filtered Git installs so each agent loads only its own bundle:

```json
{
  "source": "git:github.com/eiei114/pi-agent-bundles@v0.1.0",
  "extensions": [
    "+node_modules/pi-model-fallback/extensions/index.ts",
    "+shared/extensions/seed-model-fallback.ts",
    "+bundles/pi-ace-balanced/extensions/*.ts"
  ],
  "skills": [
    "+bundles/pi-ace-balanced/skills/*/SKILL.md"
  ]
}
```

## PR acceptance checklist

- [ ] New bundle has `README.md`.
- [ ] Commands are prefixed by bundle slug.
- [ ] No secrets or local credentials are included.
- [ ] Existing config files are never overwritten.
- [ ] `npm run ci` passes.
- [ ] README or docs show filtered install if new resources are added.
