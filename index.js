import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Connect DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Root test
app.get("/", (req, res) => {
  res.send("Personal Blog API is running 🚀");
});


// ========================== CREATE ==========================
app.post("/posts", async (req, res) => {
  try {
    const { title, image, category_id, description, content, status_id } = req.body;

    if (!title || !image || !category_id || !content || !status_id) {
      return res.status(400).json({
        message: "Server could not create post because there are missing data from client",
      });
    }

    const sql = `
      INSERT INTO posts (title, image, category_id, description, content, status_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const values = [title, image, category_id, description ?? null, content, status_id];
    const result = await pool.query(sql, values);

    return res.status(201).json({
      message: "Created post sucessfully",
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({
      message: "Server could not create post because database connection",
    });
  }
});


// ========================== READ ONE ==========================
app.get("/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const sql = `
      SELECT p.id, p.image, c.name AS category, p.title, p.description, p.date, 
             p.content, s.status, p.likes_count
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN statuses s ON p.status_id = s.id
      WHERE p.id = $1
    `;
    const result = await pool.query(sql, [postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Server could not find a requested post" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({
      message: "Server could not read post because database connection",
    });
  }
});


// ========================== UPDATE ==========================
app.put("/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, image, category_id, description, content, status_id } = req.body;

    const sql = `
      UPDATE posts
      SET title=$1, image=$2, category_id=$3, description=$4, content=$5, status_id=$6
      WHERE id=$7
      RETURNING id
    `;
    const values = [title, image, category_id, description ?? null, content, status_id, postId];
    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Server could not find a requested post to update" });
    }

    return res.status(200).json({ message: "Updated post sucessfully" });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({
      message: "Server could not update post because database connection",
    });
  }
});


// ========================== DELETE ==========================
app.delete("/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const sql = `DELETE FROM posts WHERE id=$1 RETURNING id`;
    const result = await pool.query(sql, [postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Server could not find a requested post to delete" });
    }

    return res.status(200).json({ message: "Deleted post sucessfully" });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({
      message: "Server could not delete post because database connection",
    });
  }
});


// ========================== READ ALL (pagination + filter) ==========================
app.get("/posts", async (req, res) => {
  try {
    const { page = 1, limit = 6, category, keyword } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.id, p.image, c.name AS category, p.title, p.description, p.date, 
             p.content, s.status, p.likes_count
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN statuses s ON p.status_id = s.id
      WHERE 1=1
    `;
    let values = [];
    let count = 1;

    if (category) {
      sql += ` AND c.name ILIKE $${count}`;
      values.push(`%${category}%`);
      count++;
    }

    if (keyword) {
      sql += ` AND (p.title ILIKE $${count} OR p.description ILIKE $${count} OR p.content ILIKE $${count})`;
      values.push(`%${keyword}%`);
      count++;
    }

    const countSql = `SELECT COUNT(*) FROM (${sql}) AS subquery`;
    const totalResult = await pool.query(countSql, values);
    const totalPosts = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalPosts / limit);

    sql += ` ORDER BY p.date DESC LIMIT $${count} OFFSET $${count + 1}`;
    values.push(limit, offset);

    const result = await pool.query(sql, values);

    return res.status(200).json({
      totalPosts,
      totalPages,
      currentPage: parseInt(page, 10),
      limit: parseInt(limit, 10),
      posts: result.rows,
      nextPage: parseInt(page, 10) < totalPages ? parseInt(page, 10) + 1 : null,
    });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({
      message: "Server could not read post because database connection",
    });
  }
});


// ========================== START SERVER ==========================
app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});