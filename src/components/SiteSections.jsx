import { Linkedin, Github, Globe, Mail, Menu } from "lucide-react";

// shadcn/ui dropdown menu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/* ========== NavBar ========== */
export function NavBar() {
  return (
    <nav aria-label="Primary" className="w-full border-b border-stone-200 bg-white">
      <div className="flex w-full items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="/" className="text-3xl font-extrabold tracking-tight text-stone-800">
          Thomson P<span className="text-green-500">•</span>
        </a>

        {/* ปุ่ม Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <button className="rounded-full border border-stone-300 px-5 py-1.5 text-xl font-medium text-stone-700 hover:bg-stone-50">
            Log in
          </button>
          <button className="rounded-full bg-stone-900 px-5 py-1.5 text-xl font-semibold text-white hover:bg-stone-800">
            Sign up
          </button>
        </div>

        {/* Dropdown เฉพาะ Mobile */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Open menu"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 p-2.5"
            >
              <Menu className="h-5 w-5" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="mt-2 rounded-xl">
              <DropdownMenuLabel>Menu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/login" className="w-full">Log in</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/signup" className="w-full">Sign up</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/about" className="w-full">About</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/contact" className="w-full">Contact</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

/* ========== HeroSection ========== */
export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="rounded-[2rem] border border-stone-200 bg-white p-6 md:p-10 lg:p-12 shadow-md"
    >
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1.15fr_1fr_1.1fr] md:gap-12">
        {/* Left */}
        <div className="order-2 md:order-1">
          <h1
            id="hero-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight"
          >
            Stay <span className="block">Informed,</span>
            <span className="block">Stay Inspired</span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-stone-600 max-w-prose">
            Discover a world of knowledge at your fingertips. Your daily dose of
            inspiration and information.
          </p>
        </div>

        {/* Middle (Image) */}
        <div className="order-1 md:order-2">
          <figure className="overflow-hidden rounded-3xl border border-stone-200 shadow-lg">
            <img
              src="/profile.jpg"
              alt="Author with a cat"
              className="aspect-[4/5] w-full object-cover"
            />
          </figure>
        </div>

        {/* Right (Author) */}
        <aside className="order-3">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 lg:p-7">
            <p className="text-xs uppercase tracking-wide text-stone-500">– Author</p>
            <h3 className="mt-1 text-xl font-semibold">Thompson P.</h3>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-stone-600">
              I am a pet enthusiast and freelance writer specializing in animal
              behavior and care. With a deep love for cats, I share insights on
              feline companionship and wellness.
            </p>
            <p className="mt-4 text-sm md:text-base leading-relaxed text-stone-600">
              When I’m not writing, I volunteer at my local animal shelter,
              helping cats find loving homes.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* ========== Footer ========== */
export function Footer() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-6 py-6">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-5">
          <span className="text-stone-900 text-xl font-bold">Get in touch</span>
          <a href="https://linkedin.com" className="inline-flex">
            <Linkedin className="h-5 w-5" />
          </a>
          <a href="https://github.com" className="inline-flex">
            <Github className="h-5 w-5" />
          </a>
          <a href="/" className="inline-flex">
            <Globe className="h-5 w-5" />
          </a>
          <a href="mailto:example@mail.com" className="inline-flex">
            <Mail className="h-5 w-5" />
          </a>
        </div>
        <a
          href="/"
          className="text-stone-900 underline underline-offset-4 hover:no-underline text-xl font-bold"
        >
          Home page
        </a>
      </div>
    </div>
  );
}