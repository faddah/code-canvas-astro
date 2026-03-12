import "piccolore";
import { o as decodeKey } from "./chunks/astro/server_C9sFvLnE.mjs";
import "clsx";
import "./chunks/astro-designed-error-pages_iAuHBSMo.mjs";
import "es-module-lexer";
import { N as NOOP_MIDDLEWARE_FN } from "./chunks/noop-middleware_Bk6jd7Og.mjs";
function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}
function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}
function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}
const manifest = deserializeManifest({"hrefRoot":"file:///Users/faddah/Documents/code/code%20-%20projects/code-canvas-astro/","cacheDir":"file:///Users/faddah/Documents/code/code%20-%20projects/code-canvas-astro/node_modules/.astro/","outDir":"file:///Users/faddah/Documents/code/code%20-%20projects/code-canvas-astro/dist/","srcDir":"file:///Users/faddah/Documents/code/code%20-%20projects/code-canvas-astro/src/","publicDir":"file:///Users/faddah/Documents/code/code%20-%20projects/code-canvas-astro/public/","buildClientDir":"file:///Users/faddah/Documents/code/code%20-%20projects/code-canvas-astro/dist/client/","buildServerDir":"file:///Users/faddah/Documents/code/code%20-%20projects/code-canvas-astro/dist/server/","adapterName":"@astrojs/node","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/node.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[],"routeData":{"route":"/404","isIndex":false,"type":"page","pattern":"^\\/404\\/?$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[],"routeData":{"route":"/api/files/create","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/files\\/create\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"files","dynamic":false,"spread":false}],[{"content":"create","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/files/create.ts","pathname":"/api/files/create","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[],"routeData":{"route":"/api/files/[id]","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/files\\/([^/]+?)\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"files","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false}]],"params":["id"],"component":"src/pages/api/files/[id].ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[],"routeData":{"route":"/api/files","isIndex":true,"type":"endpoint","pattern":"^\\/api\\/files\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"files","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/files/index.ts","pathname":"/api/files","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[],"routeData":{"route":"/api/starter-files","isIndex":true,"type":"endpoint","pattern":"^\\/api\\/starter-files\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"starter-files","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/starter-files/index.ts","pathname":"/api/starter-files","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[],"routeData":{"route":"/api/user-files/create","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/user-files\\/create\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"user-files","dynamic":false,"spread":false}],[{"content":"create","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/user-files/create.ts","pathname":"/api/user-files/create","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[],"routeData":{"route":"/api/user-files/[id]","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/user-files\\/([^/]+?)\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"user-files","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false}]],"params":["id"],"component":"src/pages/api/user-files/[id].ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[],"routeData":{"route":"/api/user-files","isIndex":true,"type":"endpoint","pattern":"^\\/api\\/user-files\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"user-files","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/user-files/index.ts","pathname":"/api/user-files","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[],"routeData":{"route":"/api/user-profile","isIndex":true,"type":"endpoint","pattern":"^\\/api\\/user-profile\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"user-profile","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/user-profile/index.ts","pathname":"/api/user-profile","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.C1lTaD14.js"}],"styles":[{"type":"external","src":"/_astro/index.9B_O58Fx.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/Users/faddah/Documents/code/code - projects/code-canvas-astro/src/pages/index.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000astro-internal:middleware":"_astro-internal_middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:src/pages/404@_@astro":"pages/404.astro.mjs","\u0000@astro-page:src/pages/api/files/create@_@ts":"pages/api/files/create.astro.mjs","\u0000@astro-page:src/pages/api/files/[id]@_@ts":"pages/api/files/_id_.astro.mjs","\u0000@astro-page:src/pages/api/files/index@_@ts":"pages/api/files.astro.mjs","\u0000@astro-page:src/pages/api/starter-files/index@_@ts":"pages/api/starter-files.astro.mjs","\u0000@astro-page:src/pages/api/user-files/create@_@ts":"pages/api/user-files/create.astro.mjs","\u0000@astro-page:src/pages/api/user-files/[id]@_@ts":"pages/api/user-files/_id_.astro.mjs","\u0000@astro-page:src/pages/api/user-files/index@_@ts":"pages/api/user-files.astro.mjs","\u0000@astro-page:src/pages/api/user-profile/index@_@ts":"pages/api/user-profile.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/node@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_Cp6omgAo.mjs","/Users/faddah/Documents/code/code - projects/code-canvas-astro/node_modules/@astrojs/react/dist/vnode-children.js":"chunks/vnode-children_BeL9aKBN.mjs","/Users/faddah/Documents/code/code - projects/code-canvas-astro/node_modules/unstorage/drivers/fs-lite.mjs":"chunks/fs-lite_BcglG1vc.mjs","/Users/faddah/Documents/code/code - projects/code-canvas-astro/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_D8_oKtZf.mjs","astro:scripts/before-hydration.js":"_astro/astro_scripts/before-hydration.js.Bh9BPHG1.js","@/components/App.tsx":"_astro/App.CI_tVDIx.js","@astrojs/react/client.js":"_astro/client.B-YBm5vZ.js","astro:scripts/page.js":"_astro/page.C1lTaD14.js","\u0000astro:transitions/client":"_astro/client.Cz7IsWXI.js"},"inlinedScripts":[],"assets":["/_astro/index.9B_O58Fx.css","/favicon.ico","/favicon.svg","/python-repl-ide-app-screenshot.png","/_astro/App.CI_tVDIx.js","/_astro/chunk-IFEBM3MJ.DBJFYiTh.js","/_astro/client.B-YBm5vZ.js","/_astro/client.Cz7IsWXI.js","/_astro/index.Aybnhu_z.js","/_astro/index.DiPZdF3a.js","/_astro/page.C1lTaD14.js","/_astro/astro_scripts/before-hydration.js.Bh9BPHG1.js","/_astro/page.C1lTaD14.js"],"buildFormat":"directory","checkOrigin":false,"allowedDomains":[],"actionBodySizeLimit":1048576,"serverIslandNameMap":[],"key":"hc+jbAfGd0u7/ouJlWpgKf/nBn8Wz3Xbt/sVE4spowk=","sessionConfig":{"driver":"fs-lite","options":{"base":"/Users/faddah/Documents/code/code - projects/code-canvas-astro/node_modules/.astro/sessions"}}});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = () => import("./chunks/fs-lite_BcglG1vc.mjs");
export {
  manifest
};
