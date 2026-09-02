'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WeeklyCase } from '@/types/case';
import CaseCard from '@/components/CaseCard';
import CaseModal from '@/components/CaseModal';

interface WeeklyResponse {
  since: string;
  count: number;
  cases: WeeklyCase[];
}

export default function HomePage() {
  const [cases, setCases] = useState<WeeklyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<WeeklyCase | null>(null);
  const [filter, setFilter] = useState<'all' | 'collected'>('all');
  const [bannerIndex, setBannerIndex] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/weekly', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: WeeklyResponse = await res.json();
      setCases(data.cases);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (cases.length === 0) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % Math.min(cases.length, 6));
    }, 1000);
    return () => clearInterval(timer);
  }, [cases]);

  const toggleFavorite = useCallback(async (id: number) => {
    setCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, collected: !c.collected } : c)),
    );
    setActive((prev) => (prev && prev.id === id ? { ...prev, collected: !prev.collected } : prev));

    const current = cases.find((c) => c.id === id);
    try {
      await fetch(`/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collected: !current?.collected }),
      });
    } catch (err) {
      console.error('toggle favorite failed:', err);
      setCases((prev) =>
        prev.map((c) => (c.id === id ? { ...c, collected: !!current?.collected } : c)),
      );
      setActive((prev) => (prev && prev.id === id ? { ...prev, collected: !!current?.collected } : prev));
    }
  }, [cases]);

  const visibleCases = useMemo(() => {
    if (filter === 'collected') return cases.filter((c) => c.collected);
    return cases;
  }, [cases, filter]);

  const collectedCount = cases.filter((c) => c.collected).length;

  const { startDate, endDate } = useMemo(() => {
    if (cases.length === 0) return { startDate: '', endDate: '' };
    const dates = cases.map((c) => new Date(c.publish_date).getTime());
    const start = new Date(Math.min(...dates));
    const end = new Date(Math.max(...dates));
    const fmt = (d: Date) => {
      const y = String(d.getFullYear()).slice(2);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}.${m}.${day}`;
    };
    return { startDate: fmt(start), endDate: fmt(end) };
  }, [cases]);

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: '#ede8dd',
        backgroundImage: `
          radial-gradient(ellipse at 10% 20%, rgba(200, 180, 160, 0.15) 0%, transparent 60%),
          radial-gradient(ellipse at 90% 80%, rgba(180, 160, 140, 0.1) 0%, transparent 50%),
          repeating-linear-gradient(0deg, rgba(160, 140, 120, 0.05) 0px, rgba(160, 140, 120, 0.05) 1px, transparent 1px, transparent 3px),
          repeating-linear-gradient(90deg, rgba(160, 140, 120, 0.03) 0px, rgba(160, 140, 120, 0.03) 1px, transparent 1px, transparent 5px)
        `
      }}
    >
      <header className="border-b-2 border-ink" style={{ backgroundColor: 'rgba(237, 232, 221, 0.85)' }}>
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="w-full">
            <div className="flex items-center justify-between text-black text-base font-bold leading-none">
              <span className="shrink-0">{startDate || '——'}</span>
              <div className="flex-1 mx-3 border-b border-black" style={{ height: '1px' }} />
              <span className="shrink-0">{endDate || '——'}</span>
            </div>
          </div>

          <div className="mt-1 w-full text-center">
            <h1
              className="w-full text-[clamp(2.5rem,12vw,7rem)] font-black uppercase leading-[1.05] text-ink"
              style={{
                fontFamily: "'Franklin Gothic Heavy', 'Arial Black', 'Helvetica Neue', sans-serif",
                textAlign: 'justify',
                textJustify: 'distribute',
                textAlignLast: 'justify',
                letterSpacing: '0.05em',
                transform: 'scaleY(1.5)',
                transformOrigin: 'center',
              }}
            >
              MARKETING WEEKLY
            </h1>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 border-t border-ink/10 pt-4">
            <button
              onClick={() => setFilter('all')}
              className={`text-xs font-semibold uppercase tracking-wider transition ${
                filter === 'all' ? 'text-accent' : 'text-ink/40 hover:text-ink'
              }`}
            >
              全部
            </button>
            <span className="text-ink/20">|</span>
            <button
              onClick={() => setFilter('collected')}
              className={`text-xs font-semibold uppercase tracking-wider transition ${
                filter === 'collected' ? 'text-accent' : 'text-ink/40 hover:text-ink'
              }`}
            >
              我的收藏 ({collectedCount})
            </button>
            <button
              onClick={fetchData}
              className="ml-auto text-xs text-ink/40 underline-offset-2 hover:text-accent hover:underline"
            >
              刷新
            </button>
          </div>
        </div>
      </header>

      {/* Banner 轮播 */}
      {!loading && cases.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-3">
          <div className="relative overflow-hidden bg-ink/5">
            <div className="aspect-[21/9] w-full overflow-hidden">
              {cases.slice(0, 6).map((c, i) => (
                <div
                  key={c.id}
                  className={`absolute inset-0 ${i === bannerIndex ? 'block' : 'hidden'}`}
                >
                  <img
                    src={c.cover_image_url || '/placeholder.svg'}
                    alt={c.title}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-none border border-ink/10 bg-white">
                <div className="aspect-[4/3] bg-ink/5" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-20 bg-ink/10" />
                  <div className="h-5 w-3/4 bg-ink/10" />
                  <div className="h-3 w-full bg-ink/5" />
                  <div className="h-3 w-2/3 bg-ink/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-md border border-accent/30 bg-accent/5 p-6 text-center text-accent">
            加载失败：{error}
            <button onClick={fetchData} className="ml-3 underline">重试</button>
          </div>
        ) : visibleCases.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/20 p-12 text-center text-ink/50">
            {filter === 'collected' ? '还没有收藏任何案例' : '本周暂无案例，请先运行 pnpm cron 抓取数据'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCases.map((c, i) => (
              <CaseCard
                key={c.id}
                caseItem={c}
                index={i}
                onOpen={setActive}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="mx-auto max-w-7xl px-6 pt-8 pb-12">
        <div className="text-right">
          <p
            className="font-serif leading-[1.2] text-black"
            style={{ fontSize: 'clamp(0.9375rem, 4.5vw, 2.625rem)' }}
          >
            本周营销案例分享就到这了
            <br />
            我们下周见！
          </p>
        </div>
        <div className="mt-4 border-t-2 border-ink/60" />
        <div className="mt-2 border-t-8 border-ink/80" />
        <div className="mt-6 text-right text-xs text-ink/30">
          数据来源：广告门 https://www.adquan.com/ · AI 分析仅供学习参考
        </div>
      </footer>

      <CaseModal
        caseItem={active}
        onClose={() => setActive(null)}
        onToggleFavorite={toggleFavorite}
      />
    </main>
  );
}