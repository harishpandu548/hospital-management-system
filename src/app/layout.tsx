import type { Metadata } from "next";
import "./globals.css";
import "@/styles/global-animations.css";

export const metadata: Metadata = {
  title: "HMS — Hospital Management System",
  description: "Production-grade Hospital Management System",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
