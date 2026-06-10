import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-thai",
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
    <html lang="th" className={`${notoSansThai.variable}`}>
      <body
        style={{
          fontFamily: "var(--font-noto-sans-thai), sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <AntdRegistry>
          <ConfigProvider
            locale={thTH}
            theme={{
              token: {
                fontFamily: "var(--font-noto-sans-thai), sans-serif",
                colorPrimary: "#22c55e", // Bright solid green
                colorInfo: "#06b6d4",
                colorSuccess: "#22c55e",
                colorWarning: "#eab308",
                colorError: "#f43f5e",
                borderRadius: 8,
              },
              components: {
                Layout: {
                  bodyBg: "#f0fdf4", // Light green background
                  headerBg: "#166534", // Dark green header
                },
              },
            }}
          >
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
