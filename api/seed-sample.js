
import { getRedis } from "./redis.js";

export default async function (req, res){
  const redis = getRedis();
  const ids = await redis.smembers("games:ids");
  if (ids && ids.length>0) return res.json({ ok:false, message: "already seeded" });
  const samples = [
    { id: 'g_catan', name: 'Catan', played:5, skipped:2 },
    { id: 'g_terraform', name: 'Terraforming Mars', played:3, skipped:1 },
    { id: 'g_wingspan', name: 'Wingspan', played:2, skipped:4 },
    { id: 'g_azul', name: 'Azul', played:1, skipped:0 },
    { id: 'g_thecrew', name: 'The Crew', played:0, skipped:0 }
  ];
  const multi = redis.multi();
  samples.forEach(s=>{
    multi.set(`game:${s.id}`, JSON.stringify({ id: s.id, name: s.name }));
    multi.sadd('games:ids', s.id);
    multi.hset(`stats:game:${s.id}`, { played: s.played, skipped: s.skipped, picks: 0 });
  });
  await multi.exec();
  return res.json({ ok:true, seeded: samples.length });
}
