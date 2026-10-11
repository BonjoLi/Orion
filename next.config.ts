import type { NextConfig } from "next";

// The Flask app (login, sign-up, account) runs separately, by default on port 8080 of this
// computer. This is a server-side setting, so it never reaches the browser and may be a
// private address. Set BACKEND_URL when Flask lives somewhere else.
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "");

// Paths Flask answers. Next forwards them (a rewrite acts as a URL proxy and keeps the
// address bar and the session cookie on the site's own host), so every link in the app is a
// plain path like /login, and works from any address: localhost, a LAN IP, or a real domain.
// https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites
const FLASK_PATHS = [
  "/login",
  "/sign-up",
  "/logout",
  "/profile",
  "/account/:path*",
  "/auth_static/:path*",
  "/landing_static/:path*",
];

const nextConfig: NextConfig = {
  // `next dev` only trusts `localhost`. Opened from 127.0.0.1 or a computer's Wi-Fi address,
  // its scripts are blocked, so nothing on the page responds to clicks (the theme switch, Play, ...).
  // Dev only; a production build ignores this. https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*"],
  async rewrites() {
    return {
      // beforeFiles: checked before pages, so nothing in src/app can shadow these paths.
      beforeFiles: FLASK_PATHS.map((source) => ({ source, destination: `${BACKEND_URL}${source}` })),
    };
  },
};

export default nextConfig;
