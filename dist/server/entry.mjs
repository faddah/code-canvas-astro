import { renderers } from "./renderers.mjs";
import { c as createExports, s as serverEntrypointModule } from "./chunks/_@astrojs-ssr-adapter_Zy3_j-6s.mjs";
import { manifest } from "./manifest_BQoSD6BX.mjs";
const serverIslandMap = /* @__PURE__ */ new Map();
;
const _page0 = () => import("./pages/_image.astro.mjs");
const _page1 = () => import("./pages/404.astro.mjs");
const _page2 = () => import("./pages/api/files/create.astro.mjs");
const _page3 = () => import("./pages/api/files/_id_.astro.mjs");
const _page4 = () => import("./pages/api/files.astro.mjs");
const _page5 = () => import("./pages/api/starter-files.astro.mjs");
const _page6 = () => import("./pages/api/user-files/create.astro.mjs");
const _page7 = () => import("./pages/api/user-files/_id_.astro.mjs");
const _page8 = () => import("./pages/api/user-files.astro.mjs");
const _page9 = () => import("./pages/api/user-profile.astro.mjs");
const _page10 = () => import("./pages/index.astro.mjs");
const pageMap = /* @__PURE__ */ new Map([
  ["node_modules/astro/dist/assets/endpoint/node.js", _page0],
  ["src/pages/404.astro", _page1],
  ["src/pages/api/files/create.ts", _page2],
  ["src/pages/api/files/[id].ts", _page3],
  ["src/pages/api/files/index.ts", _page4],
  ["src/pages/api/starter-files/index.ts", _page5],
  ["src/pages/api/user-files/create.ts", _page6],
  ["src/pages/api/user-files/[id].ts", _page7],
  ["src/pages/api/user-files/index.ts", _page8],
  ["src/pages/api/user-profile/index.ts", _page9],
  ["src/pages/index.astro", _page10]
]);
const _manifest = Object.assign(manifest, {
  pageMap,
  serverIslandMap,
  renderers,
  actions: () => import("./noop-entrypoint.mjs"),
  middleware: () => import("./_astro-internal_middleware.mjs")
});
const _args = {
  "mode": "standalone",
  "client": "file:///Users/faddah/Documents/code/code%20-%20projects/code-canvas-astro/dist/client/",
  "server": "file:///Users/faddah/Documents/code/code%20-%20projects/code-canvas-astro/dist/server/",
  "host": false,
  "port": 4321,
  "assets": "_astro",
  "experimentalStaticHeaders": false
};
const _exports = createExports(_manifest, _args);
const handler = _exports["handler"];
const startServer = _exports["startServer"];
const options = _exports["options"];
const _start = "start";
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
  serverEntrypointModule[_start](_manifest, _args);
}
export {
  handler,
  options,
  pageMap,
  startServer
};
