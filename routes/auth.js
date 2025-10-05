import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import pool from "../utils/db.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const router = Router();

/** POST /auth/register */
router.post("/register", async (req, res) => {
  const { email, password, username, name } = req.body || {};

  try {
    // เช็ค username ซ้ำ
    const { rows: exist } = await pool.query(
      "SELECT 1 FROM users WHERE username=$1",
      [username]
    );
    if (exist.length) {
      return res.status(400).json({ error: "This username is already taken" });
    }

    // สมัครบน Supabase Auth
    const { data, error: supaErr } = await supabase.auth.signUp({ email, password });
    if (supaErr) {
      if (supaErr.code === "user_already_exists") {
        return res.status(400).json({ error: "User with this email already exists" });
      }
      return res.status(400).json({ error: "Failed to create user. Please try again." });
    }

    const uid = data.user.id;

    // บันทึกโปรไฟล์ใน Postgres
    const insertSql = `
      INSERT INTO users (id, username, name, role)
      VALUES ($1,$2,$3,$4)
      RETURNING id, username, name, role, profile_pic;
    `;
    const { rows } = await pool.query(insertSql, [uid, username, name, "user"]);

    return res.status(201).json({ message: "User created successfully", user: rows[0] });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "An error occurred during registration" });
  }
});

/** POST /auth/login */
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === "invalid_credentials" || error.message.includes("Invalid login")) {
        return res.status(400).json({
          error: "Your password is incorrect or this email doesn't exist",
        });
      }
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({
      message: "Signed in successfully",
      access_token: data.session.access_token,
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "An error occurred during login" });
  }
});

/** GET /auth/get-user  (Authorization: Bearer <token>) */
router.get("/get-user", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized: Token missing" });

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return res.status(401).json({ error: "Unauthorized or token expired" });

    const uid = data.user.id;
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [uid]);
    if (!rows.length) return res.status(404).json({ error: "Profile not found" });

    const u = rows[0];
    return res.status(200).json({
      id: data.user.id,
      email: data.user.email,
      username: u.username,
      name: u.name,
      role: u.role,
      profilePic: u.profile_pic,
    });
  } catch (err) {
    console.error("get-user error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** PUT /auth/reset-password  (Authorization: Bearer <token>) */
router.put("/reset-password", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const { oldPassword, newPassword } = req.body || {};

  if (!token) return res.status(401).json({ error: "Unauthorized: Token missing" });
  if (!newPassword) return res.status(400).json({ error: "New password is required" });

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr) return res.status(401).json({ error: "Unauthorized: Invalid token" });

    // verify old password
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: oldPassword,
    });
    if (loginErr) return res.status(400).json({ error: "Invalid old password" });

    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ message: "Password updated successfully", user: data.user });
  } catch (err) {
    console.error("reset-password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;