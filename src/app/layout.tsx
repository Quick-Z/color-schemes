import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "渐变配色库",
  description: "180 CSS gradient color schemes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
