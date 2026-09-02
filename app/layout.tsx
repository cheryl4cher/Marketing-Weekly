import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '营销案例周刊 | Marketing Weekly',
  description: '每周精选数字营销案例，附 AI 策略分析与评分。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-paper text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
