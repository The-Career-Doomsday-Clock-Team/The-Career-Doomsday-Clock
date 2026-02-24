import type { Metadata } from "next";
import { orbitron, jetbrainsMono } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Doomsday Clock",
  description:
    "AI 디스토피아 세계관 기반 커리어 분석 — 당신의 직업 수명을 선고합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${orbitron.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
