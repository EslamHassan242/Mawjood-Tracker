import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Mawjood Tracker",
    template: "%s | Mawjood Tracker",
  },
  description: "Internal operations tracking system for Mawjood delivery captains.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mawjood Tracker",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#154734",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cairo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  var activeTheme = theme || systemTheme;
                  if (activeTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-light-bg text-light-text-main dark:bg-dark-bg dark:text-dark-text-main">
        <SessionProvider>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              className: "dark:bg-dark-card dark:text-dark-text-main dark:border-dark-border border-light-border bg-white text-light-text-main font-sans rounded-xl shadow-lg",
              duration: 10000, // Show for 10s to give ample time to Undo!
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
