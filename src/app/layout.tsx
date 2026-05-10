import type { Metadata } from "next";
import { Providers } from "./providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { ScrollProgress } from "@/components/ui/scroll-effects";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI爆款 - 抖音热门话题AI内容生成",
  description: "追踪抖音热门话题，AI自动生成爆款图片和视频",
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
      </body>
    </html>
  );
}
