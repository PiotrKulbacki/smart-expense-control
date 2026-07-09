import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@web/features/auth/components/ToastProvider';

export const metadata: Metadata = {
  title: 'Smart Expense Control',
  description: 'Financial management with AI-powered insights',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
