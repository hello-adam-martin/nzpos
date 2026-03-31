import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NZPOS",
  description: "NZ Retail POS System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
