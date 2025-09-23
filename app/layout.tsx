import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope", // This CSS variable will be used by Tailwind
});

export const metadata: Metadata = {
  title: "PIC-AI-SSO",
  description: "Single Sign-On Authentication for PIC-AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased font-montserrat`}>
        {children}
      </body>
    </html>
  );
}
