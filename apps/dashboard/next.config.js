/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@atlas/database", "@atlas/services", "@atlas/shared"],
};

module.exports = nextConfig;
