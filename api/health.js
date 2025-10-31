
import { getRedis } from "./redis.js";

export default async function (req, res){
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return res.json({ ok:true, redis: pong });
  } catch (err){
    return res.status(500).json({ ok:false, error: err.message });
  }
}
