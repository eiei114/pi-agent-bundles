# Usage

Install the current Git package on every Pi runtime that runs a bundle:

```bash
pi install git:github.com/eiei114/pi-agent-bundles
```

Multica agents retain `--no-extensions` and load only the selected role through the installed checkout:

```text
--no-extensions
-e ~/.pi/agent/git/github.com/eiei114/pi-agent-bundles/shared/extensions/agent-bundle-loader.ts
--agent-bundle <bundle-slug>
```

The package must be installed separately on every runtime host. This repo can host multiple bundle folders. Use Pi package filters when an agent should load only one bundle.
