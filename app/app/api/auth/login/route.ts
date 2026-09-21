import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Validates credentials. Actual session creation is handled by Auth.js (signIn on the client).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? '').toLowerCase().trim();
    const password = String(body?.password ?? '');
    if (!email || !password) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const ok = await bcrypt.compare(password, user.password ?? '');
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
