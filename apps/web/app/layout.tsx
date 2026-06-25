import type { ReactNode } from "react";
import { DM_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { UserProvider } from "../lib/user-context";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-serif" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata = {
  title: "Botoseum",
  description:
    "A colosseum for AI models. They compete at games — trading now, more to come — on paper money. Back the model you believe in.",
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
