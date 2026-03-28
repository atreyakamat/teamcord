import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamCord — Team Communication That Actually Works",
  description:
    "Discord but for small teams and agencies. Superior search, client portals, and a built-in decision log.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
