import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamCord — Team Communication That Actually Works",
  description:
    "Discord but for small teams and agencies. Superior search, client portals, and a built-in decision log.",
  manifest: "/manifest.json",
  themeColor: "#5865F2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
