import type { NextConfig } from "next";

// HSTS is only meaningful over HTTPS (browsers ignore it on plain HTTP), so it is
// added to the production build and left out of `next dev`. No includeSubDomains:
// it is only safe once every subdomain is guaranteed to serve HTTPS.
const isProduction = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
];

const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow" };

const nextConfig: NextConfig = {
  output: "standalone",
  // Removes `X-Powered-By: Next.js`, which advertises the stack for no benefit.
  poweredByHeader: false,
  // Native image optimization needs `sharp`, which shared hosting cannot compile.
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Belt-and-braces with the admin metadata: robots.txt is advisory only.
      { source: "/admin/:path*", headers: [noindex] },
      { source: "/api/:path*", headers: [noindex] },
      // Uploaded filenames are UUID-based and never change content, so they are
      // immutable. Deliberately not applied to `/`, admin HTML, or dynamic pages.
      {
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
