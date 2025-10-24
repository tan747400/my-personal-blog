import { Link } from "react-router-dom";

const DEFAULT_AVATAR = "/avatar-default.svg";

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function BlogCard({
  id,
  image,
  category,
  title,
  description,
  date,
  authorName,
  authorPic,
}) {
  const avatar = authorPic || DEFAULT_AVATAR;

  return (
    // ทำการ์ดให้สูงเท่าแทร็กของ grid และวางเป็นคอลัมน์
    <article className="group flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      {/* ภาพปก (ความสูงแน่นอนด้วย aspect-ratio) */}
      <Link
        to={`/post/${id}`}
        className="block overflow-hidden rounded-2xl"
        aria-label={title}
      >
        <div className="relative aspect-[16/9] w-full md:aspect-[5/3]">
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="absolute inset-0 h-full w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      </Link>

      {/* เนื้อหา */}
      {/* ให้ส่วนข้อความกินที่เหลือด้วย flex-1 และภายในเป็นคอลัมน์ */}
      <div className="mt-4 flex flex-1 flex-col">
        {/* หมวดหมู่ */}
        <div className="mb-3">
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
            {category}
          </span>
        </div>

        {/* หัวข้อ */}
        <Link to={`/post/${id}`} className="block cursor-pointer">
          <h3 className="text-[20px] font-extrabold leading-snug tracking-tight text-stone-900 hover:underline md:text-[22px]">
            {title}
          </h3>
        </Link>

        {/* ไม่ต้อง fix ความสูง แค่ให้มีระยะด้านล่าง แล้วให้ meta ดันลงด้วย mt-auto */}
        <p className="mt-2 text-[15px] leading-relaxed text-stone-600 line-clamp-3">
          {description}
        </p>

        {/* ผู้เขียน + วันที่ */}
        {/* ดันแถบนี้ลงล่างสุดเสมอ */}
        <div className="mt-auto pt-4 flex items-center gap-3 text-[14px] text-stone-600">
          <img
            src={avatar}
            alt={authorName || "author"}
            loading="lazy"
            className="h-6 w-6 rounded-full object-cover"
          />
          <span className="font-medium">{authorName || "Unknown"}</span>
          <span className="text-stone-400">•</span>
          <time dateTime={date}>{formatDate(date)}</time>
        </div>
      </div>
    </article>
  );
}