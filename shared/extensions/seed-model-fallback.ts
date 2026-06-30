import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STATUS_KEY = "agent-bundle";

const DEFAULT_MODEL_FALLBACK_CONFIG = {
  version: 1,
  enabled: true,
  rules: [
    {
      name: "multica-zai-to-deepseek-flash",
      matchProviders: ["zai"],
      statuses: [429, 500, 502, 503, 504],
      fallback: { provider: "deepseek", model: "deepseek-v4-flash" },
    },
  ],
};

export default function seedModelFallback(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const configPath = modelFallbackConfigPath(ctx);
    if (existsSync(configPath)) {
      ctx.ui.setStatus(STATUS_KEY, "bundle:config-present");
      return;
    }

    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, `${JSON.stringify(DEFAULT_MODEL_FALLBACK_CONFIG, null, 2)}\n`, "utf8");
    ctx.ui.setStatus(STATUS_KEY, "bundle:seeded-fallback");
    ctx.ui.notify(`Agent bundle seeded model fallback config: ${configPath}`, "info");
  });
}

function modelFallbackConfigPath(ctx: ExtensionContext): string {
  const baseDir = shouldUseProjectLocalState(ctx) ? join(ctx.cwd, ".pi") : getAgentDir();
  return join(baseDir, "model-fallback", "config.json");
}

function shouldUseProjectLocalState(ctx: ExtensionContext): boolean {
  const projectSettingsPath = join(ctx.cwd, ".pi", "settings.json");
  return existsSync(projectSettingsPath) && projectSettingsIncludesThisPackage(projectSettingsPath);
}

function projectSettingsIncludesThisPackage(projectSettingsPath: string): boolean {
  try {
    const settings = JSON.parse(readFileSync(projectSettingsPath, "utf8")) as unknown;
    if (!isRecord(settings) || !Array.isArray(settings.packages)) return false;
    return settings.packages.some((entry) => packageEntryMatchesThisPackage(entry, dirname(projectSettingsPath)));
  } catch {
    return false;
  }
}

function packageEntryMatchesThisPackage(entry: unknown, settingsDir: string): boolean {
  const source = typeof entry === "string" ? entry : isRecord(entry) && typeof entry.source === "string" ? entry.source : undefined;
  if (!source) return false;
  if (source.includes("pi-agent-bundles")) return true;
  return resolve(settingsDir, source) === resolve(PACKAGE_ROOT);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
