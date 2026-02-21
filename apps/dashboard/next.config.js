/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@atlas/database", "@atlas/services", "@atlas/shared"],
};

module.exports = nextConfig;
