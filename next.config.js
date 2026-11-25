/** @type {import('next').NextConfig} */
const nextConfig = {
  // The till's service worker must always be re-checked, or an old copy could
  // stick around on a device after an update.
  async headers() {
    return [
      {
        source: "/pos-sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/admin/" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

module.exports = nextConfig;
