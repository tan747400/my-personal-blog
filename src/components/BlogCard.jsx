export default function BlogCard({
    image,
    category,
    title,
    description,
    author,
    date,
  }) {
    return (
      <article className="flex flex-col gap-4">
        <a href="#" className="h-[212px] sm:h-[360px]">
          <img
            className="h-full w-full rounded-md"
            src={image}
            alt={title}
          />
        </a>
  
        <div className="flex flex-col">
          {/* category */}
          <div className="flex">
            <span className="mb-2 rounded-full bg-green-200 px-3 py-1 text-sm font-semibold text-green-600">
              {category}
            </span>
          </div>
  
          {/* title */}
          <a href="#">
            <h3 className="mb-2 line-clamp-2 text-start text-xl font-bold hover:underline">
              {title}
            </h3>
          </a>
  
          {/* description */}
          <p className="mb-4 flex-grow line-clamp-3 text-sm text-muted-foreground">
            {description}
          </p>
  
          {/* meta */}
          <div className="flex items-center text-sm">
            {/* ถ้ายังไม่มีรูปผู้เขียน ก็ใช้โลโกรูปบทความแทนได้ */}
            <img
              className="mr-2 h-8 w-8 rounded-full object-cover"
              src="/profile.jpg"
              alt={author}
              loading="lazy"
            />
            <span>{author}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span>{date}</span>
          </div>
        </div>
      </article>
    );
  }  