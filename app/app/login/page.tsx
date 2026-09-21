import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/');
  return <AuthForm mode="login" />;
}
