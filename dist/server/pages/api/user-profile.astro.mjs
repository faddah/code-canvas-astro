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
  const profile = await storage.getUserProfile(userId);
  if (!profile) {
    return new Response(JSON.stringify({ message: "Profile not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify(profile), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
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
    const profile = await storage.createUserProfile({
      ...body,
      clerkUserId: userId
    });
    return new Response(JSON.stringify(profile), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: "Invalid input or profile already exists" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const PUT = async ({ request, locals }) => {
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
    const profile = await storage.updateUserProfile(userId, body);
    if (!profile) {
      return new Response(JSON.stringify({ message: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: "Invalid input" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const DELETE = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const storage = new DatabaseStorage();
    await storage.deleteAllUserFiles(userId);
    await storage.deleteUserProfile(userId);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("Failed to delete user profile:", err);
    return new Response(JSON.stringify({ message: "Failed to delete profile" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DELETE,
  GET,
  POST,
  PUT
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
