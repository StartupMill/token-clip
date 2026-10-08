import { it, expect } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import { pluginManifestV1Schema } from "@paperclipai/shared";
import plugin from "../src/plugin.js";
import manifest from "../src/manifest.js";
import type { Report } from "../src/domain.js";
it("validates the manifest against the actual pinned host schema", () => {
  expect(pluginManifestV1Schema.parse(manifest).id).toBe(
    "paperclip.token-clip",
  );
});
it("serves read-only, scoped reports through the SDK harness", async () => {
  const h = createTestHarness({ manifest });
  await plugin.definition.setup(h.ctx);
  const report = await h.getData<Report>("audit", {
    companyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    from: "2026-10-08",
    to: "2026-10-08",
  });
  expect(report.totals.records).toBe(0);
  expect(h.dbQueries).toHaveLength(2);
  expect(h.dbQueries[0]?.params?.[0]).toBe(
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  );
  expect(h.dbExecutes).toHaveLength(0);
});
