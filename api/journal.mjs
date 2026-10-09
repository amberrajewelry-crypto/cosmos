// scripts/journal-fn.ts
import { put, list, del } from "@vercel/blob";
import { createHash } from "node:crypto";
var TYPES = /* @__PURE__ */ new Set(["peak", "peak-hit", "calm", "heavy"]);
var TONES = /* @__PURE__ */ new Set(["good", "bad", "mixed", "calm", "-"]);
var SPH = /* @__PURE__ */ new Set(["-", "work", "money", "love", "health", "mood", "family"]);
var ok = (re, v) => typeof v === "string" && re.test(v);
function recordPath(r) {
  const { h, iso, type, score, ans } = r;
  const luck = String(r.luck ?? "-"), year = String(r.year ?? "-"), conf = String(r.conf ?? "-"), sphere = String(r.sphere ?? "-");
  if (!ok(/^[a-f0-9]{16}$/, h) || !ok(/^\d{4}-\d{2}-\d{2}$/, iso) || !TYPES.has(String(type))) return null;
  if (![1, 2, 3, 4, 5].includes(Number(score)) || ![0, 1].includes(Number(ans))) return null;
  if (!TONES.has(luck) || !TONES.has(year) || !SPH.has(sphere) || !/^(mid|low|vlow|-)$/.test(conf)) return null;
  const dd = (Date.parse(`${iso}T12:00:00Z`) - Date.now()) / 864e5;
  if (!(dd <= 1.5 && dd >= -8)) return null;
  return `j/${h}/${iso}/${type}_${score}_${ans}_${luck}_${year}_${conf}_${sphere}.txt`;
}
function recogPath(r, ip = "-") {
  if (r.kind !== "recog" || !ok(/^[a-f0-9]{16}$/, r.h) || ![0, 1].includes(Number(r.hit))) return null;
  const ih = createHash("sha256").update("bazi-recog:" + ip).digest("hex").slice(0, 12);
  return `${Number(r.v) === 2 ? "r2" : "r"}/${ih}/${r.h}_${Number(r.hit)}.txt`;
}
function aggregate(paths) {
  const by = (k) => ({ k, n: 0, yes: 0 });
  const type = {}, score = {};
  const people = /* @__PURE__ */ new Set();
  for (const p of paths) {
    const m = /^j\/([a-f0-9]{16})\/[\d-]+\/([a-z-]+)_(\d)_([01])_/.exec(p);
    if (!m) continue;
    people.add(m[1]);
    const t = type[m[2]] ??= by(m[2]), s = score[m[3]] ??= by(m[3]);
    t.n++;
    s.n++;
    if (m[4] === "1") {
      t.yes++;
      s.yes++;
    }
  }
  return { answers: paths.length, people: people.size, type, score };
}
async function handler(req, res) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({ ok: false });
    return;
  }
  if (req.method === "GET") {
    const paths = [];
    let cursor;
    do {
      const r = await list({ prefix: "j/", cursor, limit: 1e3 });
      paths.push(...r.blobs.map((b) => b.pathname));
      cursor = r.hasMore ? r.cursor : void 0;
    } while (cursor && paths.length < 2e4);
    const rp = (await list({ prefix: "r/", limit: 1e3 })).blobs.map((b) => b.pathname);
    const rp2 = (await list({ prefix: "r2/", limit: 1e3 })).blobs.map((b) => b.pathname);
    const recog = { n: rp.length, hit: rp.filter((x) => x.endsWith("_1.txt")).length };
    const recog2 = { n: rp2.length, hit: rp2.filter((x) => x.endsWith("_1.txt")).length };
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=600");
    res.status(200).json({ ...aggregate(paths), recog, recog2 });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
  } catch {
    res.status(400).end();
    return;
  }
  if (body.kind === "recog") {
    const xf = req.headers?.["x-forwarded-for"], ip = String(Array.isArray(xf) ? xf[0] : xf ?? "-").split(",")[0].trim();
    const rp = recogPath(body, ip);
    if (!rp) {
      res.status(400).json({ ok: false });
      return;
    }
    if ((await list({ prefix: rp.slice(0, rp.lastIndexOf("/") + 1) })).blobs.length) {
      res.status(200).json({ ok: true, dup: true });
      return;
    }
    await put(rp, "1", { access: "private", addRandomSuffix: false, contentType: "text/plain" });
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true });
    return;
  }
  const path = recordPath(body);
  if (!path) {
    res.status(400).json({ ok: false });
    return;
  }
  const dir = path.slice(0, path.lastIndexOf("/") + 1);
  const old = (await list({ prefix: dir })).blobs.map((b) => b.url);
  if (old.length) await del(old);
  await put(path, "1", { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "text/plain" });
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
}
export {
  aggregate,
  handler as default,
  recogPath,
  recordPath
};
