import Link from "next/link";

// Crux — the Southern Cross. Four bright stars in a cross (plus one faint), with the
// brightest at the foot carrying the single blue accent. Neutral stars use
// currentColor so the mark adapts to any surface; only the foot star is fixed to the
// brand blue. Faint connecting lines read the shape as a cross, not scattered dots.
export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-8 w-8" : "h-6 w-6";
  const text = size === "lg" ? "text-[26px]" : "text-xl";
  return (
    <Link href="/" className="group flex items-center gap-2 text-md-on-surface">
      <svg viewBox="0 0 100 100" className={`${dim} shrink-0`} aria-hidden="true">
        <g className="stroke-current opacity-20" strokeWidth="1.1" strokeLinecap="round" fill="none">
          <line x1="52" y1="15" x2="48" y2="87" />
          <line x1="19" y1="46" x2="82" y2="54" />
        </g>
        <circle cx="52" cy="15" r="5.4" className="fill-current" />
        <circle cx="19" cy="46" r="4.9" className="fill-current" />
        <circle cx="82" cy="54" r="4.4" className="fill-current" />
        <circle cx="61" cy="64" r="2.6" className="fill-current opacity-40" />
        <circle cx="48" cy="87" r="7" className="fill-md-primary" />
      </svg>
      <span className={`${text} font-semibold tracking-tight`}>
        Cru<span className="text-md-primary">x</span>
      </span>
    </Link>
  );
}
