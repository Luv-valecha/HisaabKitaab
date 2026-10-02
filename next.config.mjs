/** @type {import('next').NextConfig} */
const nextConfig = {
  // pg uses native Node APIs; keep it out of the bundler.
  serverExternalPackages: ["pg", "bcryptjs"],
  async headers() {
    return [
      // The service worker must never be cached by the browser/CDN, or updates won't roll out.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};
export default nextConfig;
