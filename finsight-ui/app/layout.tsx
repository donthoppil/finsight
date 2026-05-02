import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ModeProvider } from "@/components/toggle/ModeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Finsight — Your money, in plain English",
  description: "A friendly portfolio coach for everyday investors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body className="font-sans bg-cream text-ink-primary antialiased">
        <ModeProvider>{children}</ModeProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
