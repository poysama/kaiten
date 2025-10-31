
import { getRedis } from "./redis.js";

export default async function (req, res){
  const redis = getRedis();
  const ids = await redis.smembers("games:ids");
  const multi = redis.multi();
  ids.forEach(id => multi.hgetall(`stats:game:${id}`));
  const statsArr = (await multi.exec()).map(([e,v])=>v);
  const games = [];
  for (const id of ids){
    const raw = await redis.get(`game:${id}`);
    games.push(JSON.parse(raw));
  }
  const detailed = ids.map((id, i)=> {
    const g = games[i];
    const s = statsArr[i] || {};
    return { id, name: g.name, played: parseInt(s.played||0), skipped: parseInt(s.skipped||0), picks: parseInt(s.picks||0) };
  });
  detailed.sort((a,b)=> b.played - a.played);
  const mostPlayed = detailed.slice(0,100);
  const neverPlayed = detailed.filter(d=> d.played===0).slice(0,100);
  return res.json({ mostPlayed, neverPlayed });
}
