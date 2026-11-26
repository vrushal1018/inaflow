import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INA SpaceWorks — Client Proposal & Design Studio",
  description:
    "INA SpaceWorks client proposal portal: Designworks, Buildworks, Manageworks & Careworks — 2D/3D designs, quotations, invoices, and client communication.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F4F2EE] text-[#111111] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
