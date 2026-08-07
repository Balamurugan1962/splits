import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { UserNav } from "@/components/user-nav";

export const metadata: Metadata = {
  title: "Splits — Bill Splitter",
  description:
    "Split bills with friends, no sign-up required. All data is stored in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans antialiased">
        <Providers>
          <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
              <span className="font-extrabold tracking-tight text-2xl sm:text-3xl">Splits</span>
              <div className="flex items-center gap-3">
                <UserNav />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
