import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "移住・関係人口 政策支援（共同サービス検討用デモ）",
    template: "%s｜移住・関係人口 政策支援デモ",
  },
  description:
    "SMOUTデータ活用構想にもとづく、自治体の移住・関係人口施策の評価・計画・文書作成を支援する共同サービス検討用デモ（架空データ）。",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
