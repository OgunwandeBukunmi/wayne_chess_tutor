import type { Metadata } from "next";
import { geistSans, geistMono, basic } from "./fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "Wayne's chess tutor",
  description: "Learn chess with Wayne",
  icons: "/chessavatar.png",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${basic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
