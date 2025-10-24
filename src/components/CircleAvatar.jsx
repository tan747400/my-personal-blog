
import { useState } from "react";

export default function CircleAvatar({
  src,
  alt = "avatar",
  size = 40,
  zoom = 1.2,
  focusX = 50,
  focusY = 35,
  className = "",
  fallback = <span className="text-[10px] font-semibold">?</span>,
  fallbackImage = "/avatar-default.svg",
}) {
  const [imgErr, setImgErr] = useState(false);
  const [fallbackErr, setFallbackErr] = useState(false);

  const hasSrc = !!src && !imgErr;
  const hasFallbackImage = !hasSrc && !!fallbackImage && !fallbackErr;

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-stone-200 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label={alt}
    >
      {/* ถ้ามีรูปจริง */}
      {hasSrc && (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setImgErr(true)}
          className="absolute inset-0 h-full w-full object-cover select-none"
          style={{
            objectPosition: `${focusX}% ${focusY}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${focusX}% ${focusY}%`,
          }}
        />
      )}

      {/* ถ้าไม่มีรูปจริง ใช้รูป default */}
      {!hasSrc && hasFallbackImage && (
        <img
          src={fallbackImage}
          alt="default avatar"
          draggable={false}
          onError={() => setFallbackErr(true)}
          className="absolute inset-0 h-full w-full object-cover select-none"
          style={{
            objectPosition: `${focusX}% ${focusY}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${focusX}% ${focusY}%`,
          }}
        />
      )}

      {/* ถ้ารูป default โหลดพังอีก ใช้อักษรย่อ fallback */}
      {!hasSrc && (!hasFallbackImage || fallbackErr) && (
        <div className="text-stone-600">{fallback}</div>
      )}
    </div>
  );
}