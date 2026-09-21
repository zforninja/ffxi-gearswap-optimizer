import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').toLowerCase().trim();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;
        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.password) return null;
          const ok = await bcrypt.compare(password, user.password);
          if (!ok) return null;
          return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role ?? 'user' };
        } catch (err) {
          console.error('authorize error', err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string })?.id ?? token.sub ?? '';
        token.role = (user as { role?: string })?.role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = (token?.id as string) ?? token?.sub ?? '';
        session.user.role = (token?.role as string) ?? 'user';
      }
      return session;
    },
  },
});
