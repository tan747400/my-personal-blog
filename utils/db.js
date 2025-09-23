import * as pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg.default;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

});

export default pool;