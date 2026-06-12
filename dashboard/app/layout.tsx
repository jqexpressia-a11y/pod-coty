import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pod City — Mission Control',
  description: 'AI Agent Mission Control Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#02040F] text-[#E0F7FA] h-screen overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
