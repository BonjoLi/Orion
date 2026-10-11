import type { Metadata } from "next";
import "./globals.css";
import { SideMenu } from "@/components/SideMenu";

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
    <html lang="en">
      <body className="min-h-screen">
        <SideMenu />
        {children}
      </body>
    </html>
  );
}
