import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { uploadBuffer } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = await prisma.inventorySnapshot.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, characterName: true, mainJob: true, subJob: true, itemCount: true, createdAt: true },
    });
    return NextResponse.json({ inventories: rows ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load inventories' }, { status: 500 });
  }
}

// Saves an inventory snapshot: raw export JSON goes to cloud storage, item ids to the database.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const characterName = String(body?.characterName ?? 'Character').slice(0, 40);
    const itemIds = body?.itemIds;
    if (!itemIds || typeof itemIds !== 'object') return NextResponse.json({ error: 'itemIds required' }, { status: 400 });
    const itemCount = Object.keys(itemIds ?? {}).length;
    let cloud_storage_path: string | null = null;
    if (body?.rawJson) {
      try {
        const raw = typeof body.rawJson === 'string' ? body.rawJson : JSON.stringify(body.rawJson);
        if (raw.length < 10 * 1024 * 1024) {
          const up = await uploadBuffer(`${characterName}-inventory.json`, 'application/json', raw, false);
          cloud_storage_path = up?.cloud_storage_path ?? null;
        }
      } catch (err) {
        console.error('cloud upload failed', err);
      }
    }
    const row = await prisma.inventorySnapshot.create({
      data: {
        userId: session.user.id,
        characterName,
        mainJob: body?.mainJob ? String(body.mainJob) : null,
        subJob: body?.subJob ? String(body.subJob) : null,
        itemCount,
        itemIds,
        cloud_storage_path,
        isPublic: false,
      },
    });
    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save inventory' }, { status: 500 });
  }
}
