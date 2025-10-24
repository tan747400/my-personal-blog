import axios from "axios";

// กันไม่ให้ interceptor ถูกติดตั้งซ้ำตอน React reload
let isInstalled = false;

export default function jwtInterceptor() {
  if (isInstalled) return; // ถ้าเคยติดตั้งแล้วจะไม่ติดซ้ำอีก
  isInstalled = true;

  // แนบ token กับทุก request ที่ส่งออกไป
  axios.interceptors.request.use((req) => {
    const token = window.localStorage.getItem("token");
    if (token) {
      req.headers = { ...req.headers, Authorization: `Bearer ${token}` };
    }
    return req;
  });

  // ตรวจจับ token หมดอายุ / ไม่ถูกต้อง
  axios.interceptors.response.use(
    (res) => res,
    (error) => {
      if (
        error.response &&
        error.response.status === 401 &&
        String(error.response.data?.error || "").includes("Unauthorized")
      ) {
        window.localStorage.removeItem("token");
        window.location.replace("/"); // redirect ไปหน้าแรก (หรือ login)
      }
      return Promise.reject(error);
    }
  );
}