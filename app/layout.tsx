import type { Metadata } from 'next';
import './globals.css';
import '../lib/diagr/diagram-engine/styles.css';

export const metadata: Metadata = {
  title: 'diagr | sharp diagrams from code',
  description: 'diagr is a tool for creating diagrams from code',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  );
}
