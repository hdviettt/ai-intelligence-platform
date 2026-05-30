import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Search — what actually matters in AI",
  description:
    "A live search engine for the AI beat. Ask anything; get a cited synthesis, results organized by theme, and a live read on what's trending across papers, releases, news, and discussion.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
