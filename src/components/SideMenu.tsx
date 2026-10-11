"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import styles from "@/components/SideMenu.module.css";

// Ported from the Flask landing page (Orion/landing/templates/index.html).
// Sidebar expands on hover/focus; the logo button pins it open for touch and keyboard users.
// Database / Live / Account / About are placeholders until those pages exist.
const ITEMS = [
  {
    label: "Home",
    href: "/",
    icon: (
      <>
        <path d="M3.5 11 12 4.2 20.5 11" />
        <path d="M5.8 10v9.6h12.4V10" />
        <path d="M10.2 19.6v-4.9h3.6v4.9" />
      </>
    ),
  },
  {
    label: "Map",
    href: "/map",
    icon: (
      <>
        <path d="M2 6 8.5 3l7 3.5L22 3v14.5L15.5 21l-7-3.5L2 21Z" />
        <path d="M8.5 3v14.5M15.5 6.5V21" />
      </>
    ),
  },
  {
    label: "Database",
    href: "#database",
    icon: (
      <>
        <ellipse cx="12" cy="5.5" rx="8.5" ry="3" />
        <path d="M3.5 5.5v13c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3v-13" />
        <path d="M3.5 12c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3" />
      </>
    ),
  },
  {
    label: "Live",
    href: "#live",
    icon: (
      <>
        <circle className={styles.fill} cx="12" cy="12" r="2.2" />
        <path d="M7.9 7.9a5.8 5.8 0 0 0 0 8.2M16.1 7.9a5.8 5.8 0 0 1 0 8.2" />
        <path d="M4.8 4.8a10.2 10.2 0 0 0 0 14.4M19.2 4.8a10.2 10.2 0 0 1 0 14.4" />
      </>
    ),
  },
  {
    label: "Account",
    href: "#account",
    icon: (
      <>
        <circle cx="12" cy="7.5" r="4" />
        <path d="M19.5 20.5v-1a4 4 0 0 0-4-4h-7a4 4 0 0 0-4 4v1" />
      </>
    ),
  },
  {
    label: "About",
    href: "#about",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11.2v5.4" />
        <circle className={styles.fill} cx="12" cy="7.9" r="1.2" />
      </>
    ),
  },
];

export function SideMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className={`${styles.logo} ${open ? styles.on : ""}`}
        aria-label="Toggle menu"
        aria-expanded={open}
        aria-controls="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Logo />
      </button>

      <nav id="menu" className={`${styles.menu} ${open ? styles.open : ""}`} aria-label="Main menu">
        <small>Navigate</small>
        <ul className={styles.nav}>
          {ITEMS.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className={pathname === item.href ? styles.active : undefined}>
                <svg className={styles.ico} viewBox="0 0 24 24" aria-hidden="true">
                  {item.icon}
                </svg>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
