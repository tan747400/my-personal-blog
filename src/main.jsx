import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// Import Auth Context & JWT Interceptor
import { AuthProvider } from "./contexts/authentication.jsx";
import jwtInterceptor from "../utils/jwtInterceptor.js";

// เรียกใช้ Interceptor ก่อน render (แนบ token ทุก request)
jwtInterceptor();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* ครอบทั้งแอปด้วย AuthProvider เพื่อให้ทุกหน้าเข้าถึง state ได้ */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
