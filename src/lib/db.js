import { createClient } from "@supabase/supabase-js";

// ✅ URL และ KEY มาจากไฟล์ .env.local
const supabaseUrl = 'https://bkhsjgkgwtfpphunwgab.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ✅ สร้าง client สำหรับติดต่อฐานข้อมูล Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;