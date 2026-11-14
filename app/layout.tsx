import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Chakra_Petch, Space_Mono } from "next/font/google";
import "./globals.css";
import { SW } from "./sw";

const sans = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

const head = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const mono = Space_Mono({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Second Opinion",
  description: "A five-minute peer health exam for astronaut crews. Works offline.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b09",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${head.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SW />
        {children}
      </body>
    </html>
  );
}
