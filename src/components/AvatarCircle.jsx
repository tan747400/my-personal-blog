import { useState } from "react";

export default function AvatarCircle({
  src,
  alt = "avatar",
  size = 40,
  zoom = 1.21,
  focusX = 50,
  focusY = 30,
  className = "",
  fallback = null,
}) {
  const [error, setError] = useState(false);
  const defaultAvatar = "/avatar-default.svg"; // ✅ SVG อยู่ใน public/

  const hasImage = src && !error;

  return (
    <div
      className={`relative overflow-hidden rounded-full flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: "#f5f5f5",
        flexShrink: 0,
      }}
    >
      {/* ถ้ามีรูปจริง */}
      {hasImage ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setError(true)}
          className="absolute inset-0 block h-full w-full object-cover select-none"
          style={{
            objectPosition: `${focusX}% ${focusY}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${focusX}% ${focusY}%`,
          }}
        />
      ) : (
        <>
          {/* default avatar (พื้นเทา + เส้นหัว/ไหล่สีขาว) */}
          <img
            src={defaultAvatar}
            alt="default avatar"
            className="absolute inset-0 h-full w-full object-cover select-none"
            draggable={false}
          />
          {/* ถ้ามี fallback (เช่น ตัวอักษรย่อ) */}
          {fallback && (
            <div className="absolute inset-0 flex items-center justify-center text-white font-semibold">
              {fallback}
            </div>
          )}
        </>
      )}
    </div>
  );
}