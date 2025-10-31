
import { getRedis } from "./redis.js";

export default async function (req, res){
  const redis = getRedis();
  const ids = await redis.smembers("games:ids");
  if (!ids || ids.length === 0) return res.json({ error:"no games" });
  const idx = Math.floor(Math.random()*ids.length);
  const id = ids[idx];
  const raw = await redis.get(`game:${id}`);
  const pick = JSON.parse(raw);
  await redis.hincrby(`stats:game:${id}`,'picks',1);
  await redis.set("last:pick", JSON.stringify({ id, pick, ts:Date.now() }), "EX", 60);
  return res.json({ index: idx, pick });
}
