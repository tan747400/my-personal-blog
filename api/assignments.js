import pool from "../utils/db.js";

export default async function handler(req, res) {
  
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { title, image, category_id, description, content, status_id } =
      req.body || {};

    if (!title || !image || !category_id || !content || !status_id) {
      return res.status(400).json({
        message:
          "Server could not create post because there are missing data from client",
      });
    }

    const sql = `
      INSERT INTO posts (title, image, category_id, description, content, status_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const values = [title, image, category_id, description ?? null, content, status_id];

    const result = await pool.query(sql, values);

    return res.status(201).json({
      message: "Created post successfully",
      id: result.rows[0].id,
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ message: "Server could not create post because database connection" });
  }
}