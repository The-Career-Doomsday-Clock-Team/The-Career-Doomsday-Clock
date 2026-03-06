import { Orbitron, Share_Tech_Mono, IBM_Plex_Sans_KR } from "next/font/google";

export const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

export const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech-mono",
  display: "swap",
});

export const ibmPlexSansKR = IBM_Plex_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-kr",
  display: "swap",
});
