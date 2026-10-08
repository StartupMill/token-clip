import esbuild from "esbuild";
import { createPluginBundlerPresets } from "@paperclipai/plugin-sdk/bundlers";

const presets = createPluginBundlerPresets({
  uiEntry: "src/ui/index.tsx",
  minify: process.env.NODE_ENV === "production",
});
const watch = process.argv.includes("--watch");

const contexts = await Promise.all([
  esbuild.context(presets.esbuild.worker),
  esbuild.context(presets.esbuild.manifest),
  esbuild.context(presets.esbuild.ui),
]);

if (watch) {
  await Promise.all(contexts.map((context) => context.watch()));
  console.log("Token Clip watch mode enabled for worker, manifest, and UI");
} else {
  await Promise.all(contexts.map((context) => context.rebuild()));
  await Promise.all(contexts.map((context) => context.dispose()));
}
