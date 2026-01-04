import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Code Scanner AI - Intelligent Security Analysis",
  description: "AI-powered security analysis tool that scans codebases for vulnerabilities, missing controls, and best practice violations using multi-agent architecture.",
  keywords: ["security", "code analysis", "vulnerability scanner", "AI", "OWASP", "security audit"],
  authors: [{ name: "Kavienan J", url: "https://github.com/kavienanj" }],
  openGraph: {
    title: "Code Scanner AI",
    description: "AI-powered security analysis for your codebase",
    type: "website",
    url: "https://github.com/kavienanj/code-scanner-ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "Code Scanner AI",
    description: "AI-powered security analysis for your codebase",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
