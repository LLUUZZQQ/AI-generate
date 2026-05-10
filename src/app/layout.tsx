import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { ScrollProgress } from "@/components/ui/scroll-effects";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#a855f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "AI爆款 - 抖音热门话题AI内容生成",
    template: "%s | AI爆款",
  },
  description: "追踪抖音热门话题，AI自动生成爆款图片和视频。实时趋势追踪、多模型AI生成、智能发布建议。",
  keywords: ["AI生成", "抖音", "热门话题", "爆款内容", "图片生成", "视频生成", "内容创作"],
  authors: [{ name: "AI爆款" }],
  metadataBase: new URL("https://ai-generate-two.vercel.app"),
  openGraph: {
    title: "AI爆款 - 抖音热点AI内容生成",
    description: "追踪抖音热门话题，AI自动生成爆款图片和视频",
    siteName: "AI爆款",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI爆款",
    description: "抖音热点AI内容生成平台",
  },
  manifest: "/manifest.json",
  icons: [{ url: "/icon.svg", type: "image/svg+xml" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI爆款",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <ScrollProgress />
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <BackToTop />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
