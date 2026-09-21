import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const url = new URL(req.url);
    const job = url.searchParams.get('job');
    const rows = await prisma.savedGearSet.findMany({
      where: { userId: session.user.id, ...(job ? { job } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ gearSets: rows ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load gear sets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? '').trim().slice(0, 80);
    const job = String(body?.job ?? '').trim().slice(0, 3);
    const context = String(body?.context ?? '').trim().slice(0, 80);
    if (!name || !job || !context || !body?.gear) return NextResponse.json({ error: 'name, job, context and gear are required' }, { status: 400 });
    const row = await prisma.savedGearSet.create({
      data: {
        userId: session.user.id,
        name,
        job,
        subJob: body?.subJob ? String(body.subJob).slice(0, 3) : null,
        context,
        gear: body.gear,
        stats: body?.stats ?? null,
      },
    });
    return NextResponse.json({ ok: true, gearSet: row }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save gear set' }, { status: 500 });
  }
}
