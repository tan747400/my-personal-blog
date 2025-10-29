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
          <span className="inline-flex rounded-full bg-[#D7F2E9] px-[12px] py-[4px] text-[14px] font-semibold font-sans text-[#12B279]">
            {category}
          </span>
        </div>

        {/* หัวข้อ */}
        <Link to={`/post/${id}`} className="block cursor-pointer">
          <h3 className="text-[18px] font-semibold leading-snug tracking-tight font-sans text-[#26231E] hover:underline md:text-[20px]">
            {title}
          </h3>
        </Link>

        {/* ไม่ต้อง fix ความสูง แค่ให้มีระยะด้านล่าง แล้วให้ meta ดันลงด้วย mt-auto */}
        <p className="mt-2 text-[14px] leading-relaxed text-[#75716B] font-sans line-clamp-3">
          {description}
        </p>

        {/* ผู้เขียน + วันที่ */}
        {/* ดันแถบนี้ลงล่างสุดเสมอ */}
        <div className="mt-auto pt-4 flex items-center gap-3 text-[14px] font-sans text-[#43403B]">
          <img
            src={avatar}
            alt={authorName || "author"}
            loading="lazy"
            className="h-6 w-6 rounded-full object-cover"
          />
          <span className="font-medium">{authorName || "Unknown"}</span>
          <span className="text-[#DAD6D1] text-[18px] font-sans">|</span>
          <time className="text-[14px] font-sans text-[#75716B]" dateTime={date}>{formatDate(date)}</time>
        </div>
      </div>
    </article>
  );
}