import Link from "next/link";

// Crux — a confident cross (the "x" of Crux) with the crux itself as a blue diamond
// node at the crossing. Strokes use currentColor so the mark adapts to any surface;
// only the node carries the brand blue.
export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-8 w-8" : "h-6 w-6";
  const text = size === "lg" ? "text-[26px]" : "text-xl";
  return (
    <Link href="/" className="group flex items-center gap-2 text-md-on-surface">
      <svg viewBox="0 0 100 100" className={`${dim} shrink-0`} aria-hidden="true">
        <g className="stroke-current" strokeWidth="13" strokeLinecap="round">
          <line x1="27" y1="27" x2="73" y2="73" />
          <line x1="73" y1="27" x2="27" y2="73" />
        </g>
        <path d="M50 38 L62 50 L50 62 L38 50 Z" className="fill-md-primary" />
      </svg>
      <span className={`${text} font-semibold tracking-tight`}>
        Cru<span className="text-md-primary">x</span>
      </span>
    </Link>
  );
}
