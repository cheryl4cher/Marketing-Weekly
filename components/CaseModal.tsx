'use client';

import { useEffect } from 'react';
import type { WeeklyCase } from '@/types/case';

function fixImages(html: string) {
  if (!html) return html;

  // 第一步：处理图片 data-original（数英网）
  let fixed = html.replace(/<img([^>]*?)data-original="([^"]*)"([^>]*)>/g, (match, before, url, after) => {
    if (before.includes('src="') && !before.includes('loadimg')) {
      return match;
    }
    return `<img${before}src="${url}"${after} data-original="${url}" referrerpolicy="no-referrer">`;
  });

  // 第二步：给所有没有 referrerpolicy 的 img 加上
  fixed = fixed.replace(/<img([^>]*?)>/g, (match, attrs) => {
    if (attrs.includes('referrerpolicy')) return match;
    return `<img${attrs} referrerpolicy="no-referrer">`;
  });

  // ★ 第三步：给所有 video 标签加上 referrerpolicy
  fixed = fixed.replace(/<video([^>]*?)>/g, (match, attrs) => {
    if (attrs.includes('referrerpolicy')) return match;
    return `<video${attrs} referrerpolicy="no-referrer">`;
  });

  // ★ 第四步：给所有 source 标签加上 referrerpolicy
  fixed = fixed.replace(/<source([^>]*?)>/g, (match, attrs) => {
    if (attrs.includes('referrerpolicy')) return match;
    return `<source${attrs} referrerpolicy="no-referrer">`;
  });

  return fixed;
}

interface CaseModalProps {
  caseItem: WeeklyCase | null;
  onClose: () => void;
  onToggleFavorite: (id: number) => void;
}

function allTags(c: WeeklyCase): string[] {
  if (!c.ai_tags) return [];
  let tags: unknown;
  try {
    tags = typeof c.ai_tags === 'string' ? JSON.parse(c.ai_tags) : c.ai_tags;
  } catch {
    return [];
  }
  if (Array.isArray(tags)) {
    return tags as string[];
  } else if (typeof tags === 'object' && tags !== null) {
    const t = tags as Record<string, string[]>;
    return [
      ...(t.industry ?? []),
      ...(t.format ?? []),
      ...(t.emotion ?? []),
      ...(t.technique ?? []),
    ];
  }
  return [];
}

function extractBrandIntro(text: string): string | null {
  const match = text.match(/【品牌介绍】([^\n]*)/);
  return match ? match[1].trim() : null;
}

function removeBrandIntro(text: string): string {
  return text.replace(/【品牌介绍】[^\n]*\n?/, '');
}

export default function CaseModal({ caseItem, onClose, onToggleFavorite }: CaseModalProps) {
  useEffect(() => {
    if (!caseItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [caseItem, onClose]);

  if (!caseItem) return null;

  const date = new Date(caseItem.publish_date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const tags = allTags(caseItem);
  const brandIntro = caseItem.ai_strategy_analysis ? extractBrandIntro(caseItem.ai_strategy_analysis) : null;
  const analysisWithoutBrand = caseItem.ai_strategy_analysis ? removeBrandIntro(caseItem.ai_strategy_analysis) : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-none bg-white shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / cover */}
        <div className="relative h-56 shrink-0 overflow-hidden md:h-64">
          <img
            src={caseItem.cover_image_url || '/placeholder.svg'}
            alt={caseItem.title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/70"
            aria-label="关闭"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onToggleFavorite(caseItem.id)}
            className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold backdrop-blur transition ${
              caseItem.collected
                ? 'bg-accent text-white'
                : 'bg-white/80 text-ink hover:bg-white'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={caseItem.collected ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {caseItem.collected ? '已收藏' : '收藏'}
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <div className="mb-1 flex items-center gap-3 text-xs uppercase tracking-widest">
              <span className="font-bold text-amber-300">{caseItem.brand}</span>
              <span className="text-white/70">{date}</span>
            </div>
            <h2 className="font-serif text-2xl font-bold leading-tight md:text-3xl">
              {caseItem.title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="modal-scroll overflow-y-auto px-6 py-5 md:px-8">
          <p className="mb-5 border-l-2 border-accent pl-3 font-serif text-base italic leading-relaxed text-ink/80">
            {caseItem.brief}
          </p>

          {/* AI Analysis */}
          {caseItem.ai_strategy_analysis ? (
            <section className="mb-6 rounded-md border border-ink/10 bg-paper p-5">
              <h3 className="mb-3 font-serif text-lg font-bold">AI 策略分析</h3>

              {brandIntro && (
                <div className="mb-3 rounded border-l-2 border-blue-400 bg-blue-50/60 p-3">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    品牌介绍
                  </div>
                  <p className="text-sm leading-relaxed text-ink/80">{brandIntro}</p>
                </div>
              )}

              <p className="mb-4 text-sm leading-relaxed text-ink/80 whitespace-pre-wrap">
                {analysisWithoutBrand}
              </p>

              {tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-accent/30 bg-white px-2 py-0.5 text-[11px] text-accent"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {caseItem.ai_deep_insight && (
                <div className="rounded border-l-2 border-ink/40 bg-white/60 p-3">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink/50">
                    深度洞察
                  </div>
                  <p className="text-sm leading-relaxed text-ink/80">{caseItem.ai_deep_insight}</p>
                </div>
              )}
            </section>
          ) : (
            <section className="mb-6 rounded-md border border-dashed border-ink/20 bg-paper/50 p-4 text-center text-sm text-ink/50">
              AI 分析生成中…
            </section>
          )}

          {/* Full content */}
          <section>
            <h3 className="mb-3 font-serif text-lg font-bold">完整内容</h3>
            <div
              className="prose-case max-w-none"
              dangerouslySetInnerHTML={{ __html: fixImages(caseItem.full_content_html) }}
            />
          </section>

          <div className="mt-6 border-t border-ink/10 pt-3 text-xs text-ink/40">
            原文来源：
            <a
              href={caseItem.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              {caseItem.source_url}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}