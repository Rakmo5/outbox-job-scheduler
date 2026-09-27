import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ReachInbox - Full-stack Email Job Scheduler',
  description: 'Production-grade email scheduler dashboard powered by BullMQ & Redis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
