import { auth } from '@/auth';
import { OptimizerApp } from '@/components/optimizer/optimizer-app';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  const user = session?.user ? { name: session.user.name ?? null, email: session.user.email ?? null } : null;
  return <OptimizerApp user={user} />;
}
