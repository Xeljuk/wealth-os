import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import { WealthProvider } from "@/lib/wealth-context";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Wealth OS",
  description: "Personal Wealth Operating System — The Curated Sanctuary",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full`}>
      <body className="flex h-full">
        <WealthProvider>
          <ToastProvider>
            <Sidebar />
            <div className="ml-64 flex-1">{children}</div>
          </ToastProvider>
        </WealthProvider>
      </body>
    </html>
  );
}
