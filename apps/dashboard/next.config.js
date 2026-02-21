const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@atlas/database", "@atlas/services", "@atlas/shared"],
};

module.exports = nextConfig;
