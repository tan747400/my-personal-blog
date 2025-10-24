import supabase from "@/lib/db";

/**
 * คืน { id, name, username, profile_pic } ของ "ผู้ใช้ที่ล็อกอิน" พร้อม ensure ว่ามีอยู่ใน public.users
 * ถ้ายังไม่มีใน public.users จะพยายามสร้างจากข้อมูลใน auth.users ให้
 */
export async function getCurrentProfile() {
  // 1) Auth user
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    console.error("auth.getUser error:", authErr);
  }
  const authUser = authData?.user || null;

  // helper: query public.users by id
  const fetchUserRow = async (id) => {
    if (!id) return null;
    const { data } = await supabase
      .from("users")
      .select("id, username, name, profile_pic")
      .eq("id", id)
      .maybeSingle();
    return data || null;
  };

  // helper: upsert public.users from auth.users (เฉพาะกรณีมี authUser)
  const ensureUserRowFromAuth = async (au) => {
    if (!au?.id) return null;
    // สร้างค่าจาก metadata/email
    const username =
      au.user_metadata?.username || au.email || au.user_metadata?.name || null;
    const name = au.user_metadata?.name || username || null;

    // มีอยู่หรือยัง
    const existed = await fetchUserRow(au.id);
    if (existed) return existed;

    // สร้างใหม่ (พื้นฐาน)
    const { error: insErr } = await supabase.from("users").insert({
      id: au.id,
      username,
      name,
      profile_pic: null,
      role: "admin", // ระบุเป็นadmin
    });
    if (insErr) {
      console.error("insert users error:", insErr);
      return null;
    }
    return await fetchUserRow(au.id);
  };

  // ทางหลัก: ใช้ auth user id
  if (authUser?.id) {
    const row = await fetchUserRow(authUser.id);
    if (row) return row;
    // ยังไม่มีจะสร้าง
    const created = await ensureUserRowFromAuth(authUser);
    if (created) return created;
  }

  // สำรองสุดท้าย: localStorage
  const localId = localStorage.getItem("user_id");
  if (localId) {
    const row = await fetchUserRow(localId);
    if (row) return row;
  }

  return null;
}