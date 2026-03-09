import { D as DatabaseStorage } from "../../chunks/storage_dTmlIzb0.mjs";
import { renderers } from "../../renderers.mjs";
const GET = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const storage = new DatabaseStorage();
  const files = await storage.getUserFiles(userId);
  return new Response(JSON.stringify(files), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
