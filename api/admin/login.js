
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "replace_secret";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin";

export default async function (req, res){
  if (req.method !== "POST") return res.status(405).json({error:"POST only"});
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS){
    const token = jwt.sign({sub: username, role: "admin"}, JWT_SECRET, {expiresIn: "8h"});
    return res.json({ token });
  }
  return res.status(401).json({ error:"invalid" });
}
