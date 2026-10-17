// scripts/judge-fn.ts
import { put, list } from "@vercel/blob";

// scripts/ratelimit.ts
var hits = /* @__PURE__ */ new Map();
function ipOf(h) {
  const v = h?.["x-real-ip"] ?? h?.["x-forwarded-for"];
  const s = Array.isArray(v) ? v[0] : v;
  return (s ?? "").split(",")[0].trim() || "unknown";
}
function allow(scope, ip, max, windowMs, now = Date.now()) {
  const k = scope + "|" + ip, arr = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(k, arr);
    return false;
  }
  arr.push(now);
  hits.set(k, arr);
  if (hits.size > 5e3) {
    for (const [kk, ts] of hits) if (!ts.length || now - ts[ts.length - 1] > windowMs) hits.delete(kk);
  }
  return true;
}

// scripts/judge-fn.ts
var KEY = /^([0-5]?\d)_([0-5]?\d)_([0-5]?\d)_([0-5]?\d)$/;
var MAX_QUEUE = 300;
var keyOf = (v) => {
  const m = typeof v === "string" ? KEY.exec(v) : null;
  if (!m) return null;
  const n = m.slice(1).map(Number);
  return n.every((x) => x >= 0 && x < 60) ? n.join("_") : null;
};
async function result(key) {
  const b = (await list({ prefix: `jr/${key}/`, limit: 5 })).blobs[0];
  if (!b) return null;
  const m = /\/([0-4x])\.txt$/.exec(b.pathname);
  return !m ? null : m[1] === "x" ? "x" : Number(m[1]);
}
async function handler(req, res) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({ ok: false });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  if (!allow(req.method === "POST" ? "judge-post" : "judge-get", ipOf(req.headers), req.method === "POST" ? 20 : 600, 36e5)) {
    res.status(429).json({ ok: false, status: "busy" });
    return;
  }
  let raw = req.query?.p;
  if (req.method === "POST") {
    try {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      raw = b.p;
    } catch {
      res.status(400).end();
      return;
    }
  } else if (req.method !== "GET") {
    res.status(405).end();
    return;
  }
  const key = keyOf(Array.isArray(raw) ? raw[0] : raw);
  if (!key) {
    res.status(400).json({ ok: false });
    return;
  }
  const r = await result(key);
  if (r !== null) {
    res.status(200).json({ ok: true, status: "done", el: r === "x" ? null : r });
    return;
  }
  const queued = (await list({ prefix: `jq/${key}.txt`, limit: 1 })).blobs.length > 0;
  if (queued || req.method === "GET") {
    res.status(200).json({ ok: true, status: queued ? "queued" : "none" });
    return;
  }
  if ((await list({ prefix: "jq/", limit: MAX_QUEUE })).blobs.length >= MAX_QUEUE) {
    res.status(200).json({ ok: true, status: "busy" });
    return;
  }
  await put(`jq/${key}.txt`, "1", { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "text/plain" });
  res.status(200).json({ ok: true, status: "queued" });
}
export {
  handler as default
};
