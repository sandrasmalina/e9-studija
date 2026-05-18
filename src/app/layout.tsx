import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "E9 Studija — AI & Digital Studio",
  description: "Creative and AI consulting studio specializing in interactive digital products and custom learning systems.",
  icons: {
    icon: [
      { url: '/logo-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo-512.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/logo-512.png', sizes: '512x512', type: 'image/png' },
    shortcut: '/logo-512.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-bg text-neutral-400">
        <LanguageProvider>
          <Navigation />
          <main>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
