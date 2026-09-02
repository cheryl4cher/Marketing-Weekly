import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { WeeklyCase } from '@/types/case';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/weekly
 *
 * Returns cases published in the last 7 days, newest first.
 * Optional query params:
 *   ?days=7     — override the window (1-30)
 *   ?limit=100  — cap the number of results (1-200)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(30, Math.max(1, Number(searchParams.get('days') ?? '7')));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? '100')));

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const cases = await prisma.case.findMany({
      where: { publish_date: { gte: since } },
      orderBy: { publish_date: 'desc' },
      take: limit,
    });

    const payload: WeeklyCase[] = cases.map((c) => ({
      id: c.id,
      title: c.title,
      cover_image_url: c.cover_image_url,
      brief: c.brief,
      full_content_html: c.full_content_html,
      brand: c.brand,
      publish_date: c.publish_date.toISOString(),
      source_url: c.source_url,
      ai_strategy_analysis: c.ai_strategy_analysis,
      ai_tags: c.ai_tags as WeeklyCase['ai_tags'],
      ai_scores: c.ai_scores as WeeklyCase['ai_scores'],
      ai_deep_insight: c.ai_deep_insight,
      collected: c.collected,
    }));

    return NextResponse.json({
      since: since.toISOString(),
      count: payload.length,
      cases: payload,
    });
  } catch (err) {
    console.error('[/api/weekly] error:', err);
    return NextResponse.json(
      { error: 'failed to fetch weekly cases' },
      { status: 500 },
    );
  }
}
