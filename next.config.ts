import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright 與教室內其他本機預覽工具常以 127.0.0.1 存取 dev server。
  // 明確允許本機來源，避免 Next.js 16 阻擋 HMR 後造成互動未 hydration。
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
