import { definePlugin } from "@paperclipai/plugin-sdk";
import { buildReport, ratesFromConfig } from "./domain.js";
import { readLedger } from "./repository.js";
export default definePlugin({
  multiCompanyConfig: true,
  async setup(ctx) {
    ctx.data.register("audit", async (params) => {
      const ledger = await readLedger(
        ctx.db,
        params.companyId,
        params.from,
        params.to,
      );
      const rates = ratesFromConfig(
        await ctx.config.get(String(params.companyId)),
      );
      return buildReport(
        ledger.rows,
        rates,
        ledger.from,
        ledger.to,
        ledger.unmeteredRuns,
      );
    });
  },
  async onHealth() {
    return {
      status: "ok",
      message: "Token Clip is ready to read the Paperclip cost ledger.",
    };
  },
});
