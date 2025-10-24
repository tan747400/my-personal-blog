import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";


import authRouter from "./routes/auth.js";
import protectUser from "./middlewares/protectUser.js";
import protectAdmin from "./middlewares/protectAdmin.js";

dotenv.config();

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 4000;

// CORS + Body parser
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// ---------- DB ----------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false }, // ใช้เมื่อเชื่อม Cloud DB ที่บังคับ SSL
});

// ---------- Utils ----------
const isString = (v) => typeof v === "string" && v.trim().length > 0;
const isNumber = (v) => typeof v === "number" && !Number.isNaN(v);

/** ตรวจ payload สำหรับ CREATE / UPDATE post */
function validatePostPayload(req, res, next) {
  const { title, image, category_id, description, content, status_id } = req.body ?? {};
  const errors = [];

  if (title === undefined) errors.push("Title is required");
  else if (!isString(title)) errors.push("Title must be a string");

  if (image === undefined) errors.push("Image is required");
  else if (!isString(image)) errors.push("Image must be a string");

  if (category_id === undefined) errors.push("Category ID is required");
  else if (!isNumber(category_id)) errors.push("Category ID must be a number");

  if (description === undefined) errors.push("Description is required");
  else if (!isString(description)) errors.push("Description must be a string");

  if (content === undefined) errors.push("Content is required");
  else if (!isString(content)) errors.push("Content must be a string");

  if (status_id === undefined) errors.push("Status ID is required");
  else if (!isNumber(status_id)) errors.push("Status ID must be a number");

  if (errors.length > 0) return res.status(400).json({ message: "Bad Request", errors });
  next();
}

// ---------- Health ----------
app.get("/", (_req, res) => {
  res.send("Personal Blog API is running 🚀");
});

// ---------- Auth Routes ----------
app.use("/auth", authRouter);

// ตัวอย่างเส้นทางที่ต้อง login ก่อนถึงจะเข้าได้
app.get("/protected-route", protectUser, (req, res) => {
  res.json({ message: "This is protected content", user: req.user });
});

// ตัวอย่างเฉพาะ admin เท่านั้น
app.get("/admin-only", protectAdmin, (req, res) => {
  res.json({ message: "This is admin-only content", admin: req.user });
});

// ---------- GET /posts (list + pagination + filters) ----------
app.get("/posts", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit ?? "6", 10), 1);
    const category = req.query.category; // by name ("Cat", "General")
    const keyword = req.query.keyword;   // search title/description/content

    const where = [];
    const values = [];

    if (category) {
      values.push(category);
      where.push(`c.name = $${values.length}`);
    }

    if (keyword) {
      const idx = values.length + 1;
      values.push(`%${keyword}%`);
      where.push(
        `(p.title ILIKE $${idx} OR p.description ILIKE $${idx} OR p.content ILIKE $${idx})`
      );
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // นับทั้งหมด
    const countSQL = `
      SELECT COUNT(*)::int AS total
      FROM posts p
      JOIN categories c ON c.id = p.category_id
      JOIN statuses s ON s.id = p.status_id
      ${whereSQL};
    `;
    const countRes = await pool.query(countSQL, values);
    const totalPosts = countRes.rows[0]?.total ?? 0;
    const totalPages = Math.max(Math.ceil(totalPosts / limit), 1);
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    // ดึงรายการ
    const listSQL = `
      SELECT
        p.id,
        p.image,
        c.name AS category,
        p.title,
        p.description,
        p.date,
        p.content,
        s.status AS status,
        p.likes_count
      FROM posts p
      JOIN categories c ON c.id = p.category_id
      JOIN statuses s ON s.id = p.status_id
      ${whereSQL}
      ORDER BY p.id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2};
    `;
    const listValues = [...values, limit, offset];
    const listRes = await pool.query(listSQL, listValues);

    return res.status(200).json({
      totalPosts,
      totalPages,
      currentPage,
      limit,
      posts: listRes.rows,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
    });
  } catch (err) {
    console.error("GET /posts error:", err);
    return res
      .status(500)
      .json({ message: "Server could not read post because database connection" });
  }
});

// ---------- GET /posts/:postId (single) ----------
app.get("/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const sql = `
      SELECT
        p.id,
        p.image,
        c.name AS category,
        p.title,
        p.description,
        p.date,
        p.content,
        s.status AS status,
        p.likes_count
      FROM posts p
      JOIN categories c ON c.id = p.category_id
      JOIN statuses s ON s.id = p.status_id
      WHERE p.id = $1;
    `;
    const result = await pool.query(sql, [postId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Server could not find a requested post" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("GET /posts/:postId error:", err);
    return res
      .status(500)
      .json({ message: "Server could not read post because database connection" });
  }
});

// ---------- POST /posts (create) ----------
app.post("/posts", validatePostPayload, async (req, res) => {
  try {
    const { title, image, category_id, description, content, status_id } = req.body;

    const sql = `
      INSERT INTO posts (title, image, category_id, description, content, status_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id;
    `;
    const values = [title, image, category_id, description, content, status_id];

    const result = await pool.query(sql, values);
    return res.status(201).json({
      message: "Created post sucessfully",
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error("POST /posts error:", err);
    return res
      .status(500)
      .json({ message: "Server could not create post because database connection" });
  }
});

// ---------- PUT /posts/:postId (update) ----------
app.put("/posts/:postId", validatePostPayload, async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, image, category_id, description, content, status_id } = req.body;

    const sql = `
      UPDATE posts
      SET title=$1, image=$2, category_id=$3, description=$4, content=$5, status_id=$6
      WHERE id=$7;
    `;
    const values = [title, image, category_id, description, content, status_id, postId];

    const result = await pool.query(sql, values);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Server could not find a requested post to update" });
    }
    return res.status(200).json({ message: "Updated post sucessfully" });
  } catch (err) {
    console.error("PUT /posts/:postId error:", err);
    return res
      .status(500)
      .json({ message: "Server could not update post because database connection" });
  }
});

// ---------- DELETE /posts/:postId (delete) ----------
app.delete("/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const sql = `DELETE FROM posts WHERE id=$1;`;
    const result = await pool.query(sql, [postId]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Server could not find a requested post to delete" });
    }
    return res.status(200).json({ message: "Deleted post sucessfully" });
  } catch (err) {
    console.error("DELETE /posts/:postId error:", err);
    return res
      .status(500)
      .json({ message: "Server could not delete post because database connection" });
  }
});

// ---------- Start ----------
app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});