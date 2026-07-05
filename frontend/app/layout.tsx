import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// DM Sans is the closest open-source match to "Google Sans" (the font Google
// uses on Search, Workspace, blog.google, etc.) — "Google Sans" itself isn't
// a published Google Font and can't be loaded via next/font. JetBrains Mono
// covers code / tabular admin surfaces. Same pairing as personal-blog.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crux — what actually matters in AI",
  description:
    "Crux reads the AI beat and tells you what actually matters — a daily, persona-anchored intelligence brief, plus search over papers, releases, news, and discussion.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131314" },
  ],
  colorScheme: "light dark",
};

// Runs before paint (next/script beforeInteractive) so the stored/preferred
// theme is applied before first render — no light-mode flash for dark-mode users.
const THEME_INIT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored === "dark" || stored === "light"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="bg-md-background text-md-on-surface font-sans antialiased" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        {children}
        <footer className="border-t border-md-outline-variant">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 md-body-small text-md-on-surface-variant sm:flex-row">
            <span>Crux — what actually matters in AI, every morning.</span>
            <span>Indexed hourly · papers · releases · news · discussion</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
