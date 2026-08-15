import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "pdfkit"],
  // Cursor browser preview proxies via 127.0.2.2; without this, /_next chunks are blocked
  // and client forms (admin login) never hydrate.
  allowedDevOrigins: ["127.0.2.2", "127.0.0.1", "localhost"],
};

export default nextConfig;
