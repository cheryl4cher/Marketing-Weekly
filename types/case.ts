// Shared types for the marketing weekly app.
// Keep this in sync with prisma/schema.prisma and the analyzer output shape.

export interface CaseScores {
  /** 0-100 integer scores per dimension. */
  creativity?: number;
  strategy?: number;
  execution?: number;
  influence?: number;
  relevance?: number;
}

export interface CaseTags {
  industry?: string[];
  format?: string[];
  emotion?: string[];
  technique?: string[];
}

export interface AnalyzerResult {
  strategy_analysis: string;
  tags: CaseTags;
  scores: CaseScores;
  deep_insight: string;
}

export interface WeeklyCase {
  id: number;
  title: string;
  cover_image_url: string;
  brief: string;
  full_content_html: string;
  brand: string;
  publish_date: string; // ISO string for JSON transport
  source_url: string;
  ai_strategy_analysis: string | null;
  ai_tags: CaseTags | null;
  ai_scores: CaseScores | null;
  ai_deep_insight: string | null;
  collected: boolean;
}

/** Compute a 0-5 star rating (one decimal) from CaseScores for display. */
export function averageScore(scores: CaseScores | null | undefined): number | null {
  if (!scores) return null;
  const values = Object.values(scores).filter(
    (v): v is number => typeof v === 'number' && !Number.isNaN(v),
  );
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round((avg / 20) * 10) / 10; // 0-100 -> 0-5
}
