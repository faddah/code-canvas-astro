import { D as DatabaseStorage } from '../../../chunks/storage_JrBc8kTT.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params }) => {
  const storage = new DatabaseStorage();
  const file = await storage.getFile(Number(params.id));
  if (!file) {
    return new Response(JSON.stringify({ message: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify(file), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
const PUT = async ({ params: { id }, request }) => {
  const storage = new DatabaseStorage();
  const file = await storage.getFile(Number(id));
  if (!file) {
    return new Response(JSON.stringify({ message: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const body = await request.json();
  const updatedFile = await storage.updateFile(Number(id), body);
  return new Response(JSON.stringify(updatedFile), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
const PATCH = async ({ params: { id }, request }) => {
  const storage = new DatabaseStorage();
  const file = await storage.getFile(Number(id));
  if (!file) {
    return new Response(JSON.stringify({ message: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const body = await request.json();
  const updatedFile = await storage.updateFile(Number(id), body);
  return new Response(JSON.stringify(updatedFile), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
const DELETE = async ({ params: { id } }) => {
  const storage = new DatabaseStorage();
  const file = await storage.getFile(Number(id));
  if (!file) {
    return new Response(JSON.stringify({ message: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  await storage.deleteFile(Number(id));
  return new Response(null, { status: 204 });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    DELETE,
    GET,
    PATCH,
    PUT
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
