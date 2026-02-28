const { Hono } = require("hono");

const app = new Hono();

app.get("/", (c) => c.text("hello from sandboxed hono"));
app.get("/json", (c) => c.json({ ok: true, runtime: "secure-exec" }));

module.exports.fetch = app.fetch;
