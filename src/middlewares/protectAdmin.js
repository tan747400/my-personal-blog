import { createClient } from "@supabase/supabase-js";
import pool from "../utils/db.js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function protectAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized: Token missing" });

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: "Unauthorized: Invalid token" });

    const uid = data.user.id;
    const { rows } = await pool.query("SELECT role FROM users WHERE id=$1", [uid]);
    if (!rows.length) return res.status(404).json({ error: "User role not found" });

    if (rows[0].role !== "admin") {
      return res.status(403).json({ error: "Forbidden: You do not have admin access" });
    }
    req.user = { ...data.user, role: rows[0].role };
    next();
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}