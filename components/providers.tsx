"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

// next-themes injects a <script> for FOUC prevention.
// React 19 warns about script tags in client components.
// This is a known cosmetic warning — suppressHydrationWarning on <html>
// (already set in layout.tsx) is the official mitigation.
// See: https://github.com/pacocoursey/next-themes/issues/304
export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
