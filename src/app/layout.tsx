import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "银月 · 私人AI助手",
  description: "基于Next.js 14的本地Web应用，我的专属AI开发助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#030712" />
      </head>
      <body>{children}</body>
    </html>
  );
}