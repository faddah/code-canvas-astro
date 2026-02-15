exports.handler = async (event, context) => {
  const { handler } = await import("./entry.mjs");
  return handler(event, context);
};
