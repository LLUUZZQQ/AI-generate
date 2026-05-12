import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { ScrollProgress } from "@/components/ui/scroll-effects";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  themeColor: "#a855f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "FrameCraft - 产品照片背景替换 · AI智能合成 · 电商卖家必备",
    template: "%s | FrameCraft",
  },
  description: "产品照片背景替换 · AI智能合成 · 电商卖家必备。上传产品照片，AI自动识别主体、移除背景、合成到真实场景。",
  keywords: ["背景替换", "产品照片", "AI合成", "电商卖家", "商品图", "场景替换", "抠图"],
  authors: [{ name: "FrameCraft" }],
  metadataBase: new URL("https://ai-generate-two.vercel.app"),
  openGraph: {
    title: "FrameCraft - 产品照片背景替换 · AI智能合成",
    description: "产品照片背景替换 · AI智能合成 · 电商卖家必备",
    siteName: "FrameCraft",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "FrameCraft",
    description: "产品照片背景替换 · AI智能合成 · 电商卖家必备",
  },
  manifest: "/manifest.json",
  icons: [{ url: "/icon.svg", type: "image/svg+xml" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FrameCraft",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${inter.variable}`}>
      <body className={`${inter.className} flex flex-col min-h-screen antialiased`}>
        <ScrollProgress />
        <SmoothScroll>
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <BackToTop />
        </Providers>
        </SmoothScroll>
        <Analytics />
      </body>
    </html>
  );
}
