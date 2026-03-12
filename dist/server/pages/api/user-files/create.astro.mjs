import { D as DatabaseStorage } from "../../../chunks/storage_dTmlIzb0.mjs";
import { renderers } from "../../../renderers.mjs";
const POST = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const storage = new DatabaseStorage();
    const file = await storage.createUserFile({
      ...body,
      clerkUserId: userId
    });
    return new Response(JSON.stringify(file), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: "Invalid input" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
