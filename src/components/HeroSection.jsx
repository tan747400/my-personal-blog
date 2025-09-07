export default function HeroSection() {
    return (
      <section
        aria-labelledby="hero-heading"
        className="rounded-[2rem] border border-stone-200 bg-stone-50/70 p-5 shadow-sm md:p-10"
      >
        {/* layout: mobile = stack, md+ = 3 columns */}
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3 md:gap-10">
          {/* Left: Headline & subtext */}
          <div className="order-2 md:order-1">
            <h1
              id="hero-heading"
              className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl"
            >
              Stay <span className="block">Informed,</span>
              <span className="block">Stay Inspired</span>
            </h1>
  
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-stone-600 md:text-base">
              Discover a world of knowledge at your fingertips. Your daily dose of
              inspiration and information.
            </p>
          </div>
  
          {/* Center: Hero Image */}
          <div className="order-1 md:order-2">
            <figure className="overflow-hidden rounded-2xl border border-stone-200">
              <img
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"
                alt="Author hiking with a cat, autumn forest background"
                className="aspect-[4/5] w-full object-cover md:aspect-[4/5]"
                loading="lazy"
              />
            </figure>
          </div>
  
          {/* Right: Author card */}
          <aside className="order-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <p className="text-[11px] uppercase tracking-wide text-stone-400">
                – Author
              </p>
              <h3 className="mt-1 text-lg font-semibold">Thompson P.</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                I am a pet enthusiast and freelance writer specializing in animal
                behavior and care. With a deep love for cats, I share insights on
                feline companionship and wellness.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                When I’m not writing, I volunteer at my local animal shelter,
                helping cats find loving homes.
              </p>
            </div>
          </aside>
        </div>
      </section>
    );
  }  