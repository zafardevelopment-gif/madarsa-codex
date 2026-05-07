import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مدرسہ مینجمنٹ سسٹم",
  description: "مدرسہ کے لئے اردو، موبائل فرسٹ مینجمنٹ سسٹم"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ur" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
