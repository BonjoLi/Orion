import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Marcellus } from "next/font/google";
import "./globals.css";
import { SideMenu } from "@/components/SideMenu";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

// Marcellus: flared capitals drawn from Roman inscriptions, so the wordmark reads like an
// observatory plaque. Atkinson Hyperlegible Next: built for legibility, which suits people
// reading a dark screen outdoors. Only the weights the pages use are loaded.
const display = Marcellus({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Atkinson_Hyperlegible_Next({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Orion — where to watch the sky",
  description: "Pick a sky event. See where within reach the sky will be clear and dark, hour by hour.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ThemeScript sets data-theme before React hydrates, so the attribute differs from the server HTML.
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen">
        <SideMenu />
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
