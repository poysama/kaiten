
import { getRedis } from "../redis.js";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "replace_secret";

function checkAuth(req){
  const h = req.headers.authorization;
  if (!h) return false;
  const p = h.split(" ");
  if (p[0] !== "Bearer") return false;
  try {
    const payload = jwt.verify(p[1], JWT_SECRET);
    return payload && payload.role === "admin";
  } catch { return false; }
}

export default async function (req, res){
  const redis = getRedis();
  if (req.method === "GET"){
    const ids = await redis.smembers("games:ids");
    const multi = redis.multi();
    ids.forEach(id => multi.get(`game:${id}`));
    const vals = await multi.exec();
    const games = vals.map(([e,v])=> JSON.parse(v));
    return res.json({ games });
  }
  if (!checkAuth(req)) return res.status(401).json({ error:"unauthorized" });
  if (req.method === "POST"){
    const { id, name, meta } = req.body;
    if (!name) return res.status(400).json({ error:"name required" });
    const gameId = id || `g_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const obj = { id: gameId, name, meta: meta||{} };
    await redis.set(`game:${gameId}`, JSON.stringify(obj));
    await redis.sadd("games:ids", gameId);
    await redis.hset(`stats:game:${gameId}`, { played:0, skipped:0, picks:0 });
    return res.json({ ok:true, game: obj });
  }
  if (req.method === "PUT"){
    const { id, name, meta } = req.body;
    if (!id) return res.status(400).json({ error:"id required" });
    const raw = await redis.get(`game:${id}`);
    if (!raw) return res.status(404).json({ error:"not found" });
    const obj = JSON.parse(raw);
    if (name) obj.name = name;
    if (meta) obj.meta = meta;
    await redis.set(`game:${id}`, JSON.stringify(obj));
    return res.json({ ok:true, game: obj });
  }
  if (req.method === "DELETE"){
    const { id } = req.body;
    if (!id) return res.status(400).json({ error:"id required" });
    await redis.del(`game:${id}`);
    await redis.srem("games:ids", id);
    await redis.del(`stats:game:${id}`);
    return res.json({ ok:true });
  }
  res.status(405).json({ error:"method not allowed" });
}
