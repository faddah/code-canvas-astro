import { D as DatabaseStorage } from "../../chunks/storage_dTmlIzb0.mjs";
import { renderers } from "../../renderers.mjs";
const GET = async () => {
  const storage = new DatabaseStorage();
  const existingFiles = await storage.getStarterFiles();
  if (existingFiles.length === 0) {
    await storage.createFile({
      name: "main.py",
      content: `import sys
import utils

# This is the main entry point
print("Hello from Python!")
print("<h1>This is HTML output</h1>")

# Example of using the 'js' module to interact with the DOM directly
# (This works in Pyodide!)
# js.document.title = "Updated from Python"
`
    });
    await storage.createFile({
      name: "utils.py",
      content: `def greet(name):
    return f"Hello, {name}!"
`
    });
  }
  const files = await storage.getStarterFiles();
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
