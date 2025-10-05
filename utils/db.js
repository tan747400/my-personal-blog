import * as pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg.default || pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;