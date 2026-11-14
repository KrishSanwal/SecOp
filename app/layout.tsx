import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";
import { SW } from "./sw";

const sans = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

const mono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Second Opinion",
  description: "A five-minute peer health exam for astronaut crews. Works offline.",
};

export const viewport: Viewport = {
  themeColor: "#121b24",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SW />
        {children}
      </body>
    </html>
  );
}
