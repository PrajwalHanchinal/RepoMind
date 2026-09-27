import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RepoMind',
  description: 'Verification layer for your repository changes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
