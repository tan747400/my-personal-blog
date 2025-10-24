// import * as pg from "pg";
// import dotenv from "dotenv";

// dotenv.config();

// const { Pool } = pg.default || pg;
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// export default pool;

import { createClient } from "@supabase/supabase-js";

// ดึงค่ามาจาก .env (ฝั่ง Frontend ต้องใช้ import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// สร้าง client สำหรับเชื่อม Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;