import type { Metadata } from "next";
import { Providers } from "./providers";
import { Header } from "@/components/layout/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI爆款 - 抖音热门话题AI内容生成",
  description: "追踪抖音热门话题，AI自动生成爆款图片和视频",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
