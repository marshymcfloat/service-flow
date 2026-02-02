import "./globals.css";
import { Toaster } from "sonner";
import { Space_Grotesk, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import TanstackProvider from "@/components/providers/TanstackProvider";
import { Metadata } from "next";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const getBaseUrl = () => {
  const url =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Service Flow | Manage Your Service Business",
    template: "%s | Service Flow",
  },
  description:
    "The all-in-one platform for salons, barbershops, and spas. Manage appointments, staff, and payments with ease.",
  keywords: [
    "service business",
    "salon management",
    "barbershop software",
    "appointment scheduling",
    "pos system",
    "philippines",
  ],
  authors: [{ name: "Service Flow Team" }],
  creator: "Service Flow",
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "/",
    title: "Service Flow | Manage Your Service Business",
    description:
      "Streamline appointments, manage staff attendance, and track payments all in one unified platform.",
    siteName: "Service Flow",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Service Flow Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Service Flow | Manage Your Service Business",
    description:
      "Streamline appointments, manage staff attendance, and track payments all in one unified platform.",
    creator: "@serviceflow",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <TanstackProvider>
          {children}
          <Toaster />
        </TanstackProvider>
      </body>
    </html>
  );
}
