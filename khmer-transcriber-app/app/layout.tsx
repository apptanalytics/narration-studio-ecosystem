import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KHMER.STUDIO | Transcription & Translation',
  description: 'AI-Powered Khmer Transcription and Translation Studio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
