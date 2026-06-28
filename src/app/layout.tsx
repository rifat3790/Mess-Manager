import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ToastProvider from "@/providers/ToastProvider";
import AuthGuard from "@/components/auth/AuthGuard";
import { AppLayoutWrapper } from "@/components/layout/AppLayoutWrapper";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mohakhali Mess Manager",
  description: "Premium mess management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Prevent browser extensions (like FDM) from breaking Next.js hydration
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked') {
                  mutation.target.removeAttribute('bis_skin_checked');
                }
                if (mutation.type === 'childList') {
                  mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.hasAttribute('bis_skin_checked')) {
                      node.removeAttribute('bis_skin_checked');
                    }
                  });
                }
              });
            });
            observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
            if (typeof document !== 'undefined') {
              document.querySelectorAll('[bis_skin_checked]').forEach(el => el.removeAttribute('bis_skin_checked'));
            }
          `
        }} />
      </head>
      <body className={cn(inter.className, "bg-gray-50/50 text-gray-900")} suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider />
          <AuthGuard>
            <AppLayoutWrapper>
              {children}
            </AppLayoutWrapper>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
