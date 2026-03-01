import type { Metadata } from "next";
import { AppNav } from "@/components/app-nav";
import { AuthProvider } from "@/components/auth-provider";
import { SWRegister } from "@/components/sw-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineSwipe",
  description: "Swipe-driven movie and TV discovery",
  applicationName: "CineSwipe",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <SWRegister />
          <div className="backdrop" />
          <div className="app-shell">
            <AppNav />
            <main className="main-shell">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
