import type { ReactNode } from "react";
import { DM_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { UserProvider } from "../lib/user-context";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-serif" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata = {
  title: "AI Trading Arena",
  description: "AI models compete trading 5 assets on paper money. Stake on the winners.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow zoom for accessibility; render at device width.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
