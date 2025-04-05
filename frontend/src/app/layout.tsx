import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import MetaMaskProviderWrapper from "@/components/providers/MetaMaskProviderWrapper";
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/components/app-sidebar"
import { TopBar } from "@/app/components/top-bar"
import { Toaster } from "@/components/ui/sonner"

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
        <MetaMaskProviderWrapper>
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
        </MetaMaskProviderWrapper>
      </body>
    </html>
  );
}
