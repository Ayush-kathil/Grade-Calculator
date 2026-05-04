import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academic Analytics Platform",
  description: "Dynamic academic analytics, performance modeling and scenarios tracking.",
  verification: {
    google: "ZXGRCtJpGtAqvXp92Huc6pV5pN7veR5B9Ulxc6Wp_XY",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans selection:bg-black selection:text-white">
        {children}
      </body>
    </html>
  );
}
