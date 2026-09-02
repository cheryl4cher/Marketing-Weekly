import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/cases/[id]
 * Body: { collected: boolean }
 * Toggles the collected flag for a case.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const collected = Boolean(body?.collected);

    const updated = await prisma.case.update({
      where: { id },
      data: { collected },
      select: { id: true, collected: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[/api/cases/[id]] error:', err);
    return NextResponse.json({ error: 'failed to update case' }, { status: 500 });
  }
}
