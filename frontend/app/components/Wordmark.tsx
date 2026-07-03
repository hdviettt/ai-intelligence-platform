import Link from "next/link";

// Mark: four signal dots (Google's own brand palette) converging on one
// synthesized center — "many sources, one read." No gradients, no violet.
export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-9 w-9" : "h-7 w-7";
  const text = size === "lg" ? "text-xl" : "text-base";
  return (
    <Link href="/" className="group flex items-center gap-2 font-medium">
      <span
        className={`${dim} flex items-center justify-center rounded-full bg-surface-2 transition-colors group-hover:bg-surface-3`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-full w-full">
          <circle cx="12" cy="5.25" r="2" fill="#4285F4" />
          <circle cx="18.75" cy="12" r="2" fill="#34A853" />
          <circle cx="12" cy="18.75" r="2" fill="#FBBC05" />
          <circle cx="5.25" cy="12" r="2" fill="#EA4335" />
          <circle cx="12" cy="12" r="3.25" className="fill-foreground" />
        </svg>
      </span>
      <span className={`${text} tracking-tight text-foreground`}>
        AI<span className="text-accent">Search</span>
      </span>
    </Link>
  );
}
