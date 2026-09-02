'use client';

import type { WeeklyCase } from '@/types/case';

interface CaseCardProps {
  caseItem: WeeklyCase;
  index: number;
  onOpen: (item: WeeklyCase) => void;
  onToggleFavorite: (id: number) => void;
}

export default function CaseCard({ caseItem, index, onOpen, onToggleFavorite }: CaseCardProps) {
  const { id, title, cover_image_url, brief, brand, publish_date, collected } = caseItem;

  const date = new Date(publish_date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleClick = () => {
    onOpen(caseItem);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(id);
  };

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-none border border-ink/10 bg-white transition-shadow hover:shadow-md"
      onClick={handleClick}
    >
      {/* 封面图 */}
      <div className="aspect-[4/3] overflow-hidden bg-ink/5">
        <img
          src={cover_image_url || '/placeholder.svg'}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {/* 品牌 + 日期（同一行） */}
        <div className="mb-1 flex items-center justify-between text-xs text-ink/50">
          <span className="font-medium text-accent">{brand || '未知'}</span>
          <span>{date}</span>
        </div>

        <h3 className="mb-2 font-serif text-base font-bold leading-snug line-clamp-2">
          {title}
        </h3>

        <p className="mb-3 text-sm text-ink/60 line-clamp-3">
          {brief}
        </p>

        {/* 底部收藏按钮 */}
        <div className="flex items-center justify-end border-t border-ink/5 pt-2">
          <button
            onClick={handleFavorite}
            className={`flex items-center gap-1 text-xs font-medium transition ${
              collected ? 'text-accent' : 'text-ink/40 hover:text-accent'
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={collected ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {collected ? '已收藏' : '收藏'}
          </button>
        </div>
      </div>
    </div>
  );
}