import type { Metadata, Viewport } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Roboto is Google/Android's own typographic signature — the closest real
// Google Fonts entry to "Google Sans" without inventing a font that doesn't
// ship publicly. Roboto Mono covers code / JSON editing in the admin panel.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: "variable",
});
const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "AI Search — what actually matters in AI",
  description:
    "A live search engine for the AI beat. Ask anything; get a cited synthesis, results organized by theme, and a live read on what's trending across papers, releases, news, and discussion.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fa" },
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${roboto.variable} ${roboto.className} ${robotoMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        {children}
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-2 sm:flex-row">
            <span>AI Search — an understanding engine for the AI beat.</span>
            <span>Indexed hourly · papers · releases · news · discussion</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
