import Link from "next/link";

export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-8 w-8" : "h-7 w-7";
  const text = size === "lg" ? "text-xl" : "text-base";
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold">
      <span
        className={`${dim} flex items-center justify-center rounded-xl text-white shadow-sm`}
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-3.6-3.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`${text} tracking-tight text-foreground`}>
        AI<span className="text-gradient">Search</span>
      </span>
    </Link>
  );
}
