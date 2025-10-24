import { createClient } from "@supabase/supabase-js";

// โหลด environment variables จากไฟล์ .env.local หรือ .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ตรวจสอบว่า environment ครบไหม
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase env. Check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

// สร้าง Supabase client ตัวเดียวใช้ทั้งแอป
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,      // จดจำ session ไว้หลัง refresh หน้า
    autoRefreshToken: true,    // auto refresh token ตอนหมดอายุ
    detectSessionInUrl: true,  // สำหรับ OAuth / magic link callback
    storage: window.localStorage, // เก็บ session ใน localStorage (default อยู่แล้ว)
  },
});

// export แบบ default เท่านั้น (ห้าม { supabase })
export default supabase;