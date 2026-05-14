import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native-binding modules must be loaded by Node, not bundled by Turbopack.
  // Without this, requires inside @napi-rs/canvas can't find the platform .node
  // binary (and pdfjs-dist's worker resolution is also unreliable).
  serverExternalPackages: ["@napi-rs/canvas", "canvas", "pdfjs-dist"],
};

export default nextConfig;
