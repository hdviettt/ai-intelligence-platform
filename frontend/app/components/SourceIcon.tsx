import { faviconOf, hostOf } from "@/lib/format";

// Source favicon with a graceful fallback to the first letter of the host.
export function SourceIcon({ url, size = 16 }: { url: string; size?: number }) {
  const host = hostOf(url);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-md-surface-container text-[9px] font-medium uppercase text-md-on-surface-variant"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={faviconOf(url)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-cover opacity-90 grayscale transition-[filter] duration-200 group-hover:grayscale-0"
      />
      <span className="sr-only">{host}</span>
    </span>
  );
}
