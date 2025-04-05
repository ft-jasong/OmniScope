import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/components/app-sidebar"
import { TopBar } from "@/app/components/top-bar"
import { Toaster } from "@/components/ui/sonner"
import { WalletProvider } from "@/contexts/WalletContext";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OmniScope",
  description: "OmniScope",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} antialiased bg-white`}>
          <WalletProvider>
            <SidebarProvider>
              <AppSidebar />
              <main className="flex-1">
                <TopBar />
                <div className="min-h-[calc(100vh-4rem)] bg-white/80">
                  {children}
                </div>
              </main>
              <Toaster />
            </SidebarProvider>
          </WalletProvider>
      </body>
    </html>
  );
}
