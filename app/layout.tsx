import type { Metadata } from "next";
import "./globals.css";
import { PWARegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "KANAKO AI — Virtual Company",
  description: "Your intelligent virtual company workspace.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/kanako-icon.svg", apple: "/kanako-icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PWARegister />{children}</body></html>;
}
