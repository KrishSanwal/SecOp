import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";
import { SW } from "./sw";
import { Translator } from "@/components/lang";

const sans = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  title: "SecOp",
  description: "A five-minute peer health exam for astronaut crews. Works offline.",
};

export const viewport: Viewport = {
  themeColor: "#1c1a17",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SW />
        <Translator />
        {children}
      </body>
    </html>
  );
}
