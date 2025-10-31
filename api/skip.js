
import { getRedis } from "./redis.js";
export default async function (req, res){
  if (req.method !== "POST") return res.status(405).json({ error:"POST only" });
  const { id } = req.body;
  const redis = getRedis();
  if (!id) return res.status(400).json({ error:"id required" });
  const redisClient = getRedis();
  await redisClient.hincrby(`stats:game:${id}`,'skipped',1);
  return res.json({ ok:true });
}
