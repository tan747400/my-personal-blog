import { Link } from "react-router-dom";

export default function BlogCard({
  id,
  image,
  category,
  title,
  description,
  author,
  date,
}) {
  return (
    <article className="flex flex-col gap-4">
      <Link to={`/post/${id}`} className="relative h-[212px] sm:h-[260px] md:h-[320px]">
        <img
          className="h-full w-full rounded-md object-cover"
          src={image}
          alt={title}
          loading="lazy"
        />
      </Link>

      <div className="flex flex-col">
        <div className="flex">
          <span className="mb-2 rounded-full bg-green-200 px-3 py-1 text-sm font-semibold text-green-600">
            {category}
          </span>
        </div>

        <Link to={`/post/${id}`}>
          <h3 className="mb-2 line-clamp-2 text-start text-xl font-bold hover:underline">
            {title}
          </h3>
        </Link>

        <p className="mb-4 flex-grow line-clamp-3 text-sm text-muted-foreground">
          {description}
        </p>

        <div className="flex items-center text-sm">
          <img
            className="mr-2 h-8 w-8 rounded-full object-cover"
            src="https://res.cloudinary.com/dcbpjtd1r/image/upload/v1728449784/my-blog-post/xgfy0xnvyemkklcqodkg.jpg"
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