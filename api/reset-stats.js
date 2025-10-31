
import { getRedis } from "./redis.js";
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
  if (req.method !== "POST") return res.status(405).json({ error:"POST only" });
  if (!checkAuth(req)) return res.status(401).json({ error:"unauthorized" });
  const redis = getRedis();
  const ids = await redis.smembers("games:ids");
  const multi = redis.multi();
  ids.forEach(id => multi.hset(`stats:game:${id}`, { played:0, skipped:0, picks:0 }));
  await multi.exec();
  return res.json({ ok:true });
}
