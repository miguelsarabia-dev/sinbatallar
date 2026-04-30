
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import ProvidersWrapper from "../components/ProvidersWrapper";
import { NotificationProvider } from "../components/ui/NotificationToast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata = {
  title: "Sin Batallar - Servicios del hogar sin complicaciones",
  description: "Encuentra profesionales certificados para el mantenimiento y reparación de tu hogar",
  applicationName: "Sin Batallar",
  formatDetection: {
    telephone: true,
    date: true,
    address: true,
    email: true,
  },
  openGraph: {
    type: "website",
    siteName: "Sin Batallar",
    title: "Sin Batallar - Servicios del hogar sin complicaciones",
    description: "Encuentra profesionales certificados para el mantenimiento y reparación de tu hogar",
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecbe18" },
    { media: "(prefers-color-scheme: dark)", color: "#ecbe18" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}>
        <ProvidersWrapper>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ProvidersWrapper>
      </body>
    </html>
  );
}
