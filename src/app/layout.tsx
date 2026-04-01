import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NZPOS",
  description: "NZ Retail POS System",
  appleWebApp: {
    capable: true,
    title: "NZPOS",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-bg text-text font-sans h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.bunny.net/css?family=satoshi:400,500,700,900|dm-sans:400,500,600,700"
        />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
