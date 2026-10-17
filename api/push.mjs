// scripts/push-fn.ts
import { put, del, list } from "@vercel/blob";
import { createHash } from "node:crypto";
var MAX = 2e4;
var idOf = (endpoint) => createHash("sha256").update(endpoint).digest("hex").slice(0, 24);
var okTz = (tz) => {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};
var PUSH_HOST = /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
var okEndpoint = (e) => {
  if (typeof e !== "string" || e.length > 1e3) return false;
  try {
    const u = new URL(e);
    return u.protocol === "https:" && !u.port && PUSH_HOST.test(u.hostname);
  } catch {
    return false;
  }
};
async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({ ok: false });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  let b;
  try {
    b = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
  } catch {
    res.status(400).end();
    return;
  }
  if (okEndpoint(b.off)) {
    const p = `ps/${idOf(b.off)}.json`;
    const hit = (await list({ prefix: p, limit: 1 })).blobs[0];
    if (hit) await del(hit.url);
    res.status(200).json({ ok: true, status: "off" });
    return;
  }
  const sub = b.sub;
  const q = typeof b.q === "string" ? b.q : "";
  if (!sub || !okEndpoint(sub.endpoint) || typeof sub.keys?.p256dh !== "string" || typeof sub.keys?.auth !== "string" || sub.keys.p256dh.length > 200 || sub.keys.auth.length > 100 || q.length > 600 || !/(^|&)d=\d{4}-\d{2}-\d{2}(&|$)/.test(q) || !okTz(b.z)) {
    res.status(400).json({ ok: false });
    return;
  }
  if ((await list({ prefix: "ps/", limit: MAX })).blobs.length >= MAX) {
    res.status(200).json({ ok: false, status: "full" });
    return;
  }
  const rec = { sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, q, z: b.z, at: (/* @__PURE__ */ new Date()).toISOString(), last: "" };
  await put(`ps/${idOf(sub.endpoint)}.json`, JSON.stringify(rec), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
  res.status(200).json({ ok: true, status: "on" });
}
export {
  handler as default,
  okEndpoint
};
