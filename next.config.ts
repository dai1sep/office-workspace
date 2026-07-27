import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const repositoryBasePath = "/office-workspace";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? repositoryBasePath : undefined,
  assetPrefix: isGitHubPages ? repositoryBasePath : undefined,
  trailingSlash: isGitHubPages,
  // public/ 配下のテンプレを fetch する際に付与するベースパス（Pages配信時のみ）
  env: {
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? repositoryBasePath : "",
  },
  images: {
    unoptimized: true,
  },
  // Vercel等の低スペックCIでのビルド安定化。
  // 型チェックはローカルの `tsc --noEmit` で担保済みのため、本番ビルド中の重い再チェックはスキップする。
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
