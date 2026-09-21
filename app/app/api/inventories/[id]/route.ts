import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { deleteFile, getFileUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const row = await prisma.inventorySnapshot.findFirst({ where: { id, userId: session.user.id } });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    let downloadUrl: string | null = null;
    if (row.cloud_storage_path) {
      try {
        downloadUrl = await getFileUrl(row.cloud_storage_path, 'application/json', row.isPublic);
      } catch (err) {
        console.error(err);
      }
    }
    return NextResponse.json({ inventory: { ...row, downloadUrl } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const row = await prisma.inventorySnapshot.findFirst({ where: { id, userId: session.user.id } });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (row.cloud_storage_path) {
      try {
        await deleteFile(row.cloud_storage_path);
      } catch (err) {
        console.error(err);
      }
    }
    await prisma.inventorySnapshot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete inventory' }, { status: 500 });
  }
}
