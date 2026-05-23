import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shiddukim — Plateforme de Gestion des Fidèles',
  description: 'Plateforme de gestion des fidèles et dossiers matrimoniaux pour les églises.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
