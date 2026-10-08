import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
const manifest: PaperclipPluginManifestV1 = {
  id: "paperclip.token-clip",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Token Clip",
  description:
    "Audit task tokens and compare recorded usage with API base rates.",
  author: "Toby Allen",
  categories: ["ui"],
  capabilities: [
    "database.namespace.migrate",
    "database.namespace.read",
    "instance.settings.register",
    "ui.dashboardWidget.register",
    "ui.page.register",
    "ui.sidebar.register",
  ],
  entrypoints: { worker: "./dist/worker.js", ui: "./dist/ui" },
  database: {
    namespaceSlug: "token_clip",
    migrationsDir: "migrations",
    coreReadTables: ["cost_events", "issues", "agents", "heartbeat_runs"],
  },
  instanceConfigSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      rates: {
        type: "array",
        title: "Custom API rates (USD per million tokens)",
        description:
          "Exact provider/model overrides. Unlisted models remain unpriced. Rate changes reprice the audit; export CSV to preserve a snapshot.",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "provider",
            "model",
            "input",
            "cached",
            "output",
            "inputIncludesCache",
            "source",
            "verified",
          ],
          properties: {
            provider: { type: "string" },
            model: { type: "string" },
            input: { type: "number", minimum: 0 },
            cached: { type: "number", minimum: 0 },
            output: { type: "number", minimum: 0 },
            inputIncludesCache: {
              type: "boolean",
              description:
                "True for OpenAI input totals; false for Anthropic separate cache counts.",
            },
            source: { type: "string" },
            verified: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          },
        },
      },
    },
  },
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: "token-spend",
        displayName: "Token spend",
        exportName: "TokenSpendWidget",
      },
      {
        type: "page",
        id: "token-audit",
        displayName: "Token audit",
        exportName: "TokenAuditPage",
        routePath: "token-clip",
      },
      {
        type: "sidebar",
        id: "token-sidebar",
        displayName: "Token audit",
        exportName: "TokenSidebar",
      },
    ],
  },
};
export default manifest;
