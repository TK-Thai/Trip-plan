import type { Metadata } from "next";
import { Inter, Prompt } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Thai Trip Planner - วางแผนทริปท่องเที่ยว",
  description:
    "วางแผนทริปท่องเที่ยวไทย จัดการกิจกรรม แผนที่ และค่าใช้จ่ายร่วมกัน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${inter.variable} ${prompt.variable}`}>
      <body
        style={{
          fontFamily: "var(--font-prompt), var(--font-inter), sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
