import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcomOS",
  description: "Internal E-commerce Management Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-full flex flex-col bg-gray-50">
        {children}
      </body>
    </html>
  );
}