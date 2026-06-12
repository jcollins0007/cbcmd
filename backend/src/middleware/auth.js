import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_IN_PRODUCTION";
export function generateToken(user) { return jwt.sign({ id: user.id, username: user.username, role: user.role, displayName: user.display_name }, JWT_SECRET, { expiresIn: "24h" }); }
export function authRequired(req, res, next) { const h = req.headers.authorization; if (!h||!h.startsWith("Bearer ")) return res.status(401).json({error:"Auth required"}); try{req.user=jwt.verify(h.slice(7),JWT_SECRET);next();}catch(e){return res.status(401).json({error:"Invalid token"});} }
export function adminRequired(req, res, next) { if (req.user?.role!=="admin") return res.status(403).json({error:"Admin required"}); next(); }
