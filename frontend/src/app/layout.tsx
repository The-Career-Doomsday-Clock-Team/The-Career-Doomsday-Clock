import type { Metadata } from "next";
import { orbitron, shareTechMono, ibmPlexSansKR } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Doomsday Clock",
  description:
    "AI dystopia-themed career analysis — Your career's remaining lifespan will be sentenced.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${orbitron.variable} ${shareTechMono.variable} ${ibmPlexSansKR.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
