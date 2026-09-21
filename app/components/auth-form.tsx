'use client';
import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Shield, LogIn, UserPlus, Loader2, Sword } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';

  const submit = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    if (loading) return;
    setLoading(true);
    try {
      if (isSignup) {
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.error ?? 'Could not create account');
          setLoading(false);
          return;
        }
      }
      const r = await signIn('credentials', { email, password, redirect: false });
      if (r?.error) {
        toast.error('Invalid email or password');
        setLoading(false);
        return;
      }
      toast.success(isSignup ? 'Welcome, adventurer!' : 'Welcome back!');
      window.location.assign('/');
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-lg bg-card shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-md bg-primary/15 flex items-center justify-center">
            <Sword className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">Vana&apos;diel Gear Optimizer</h1>
            <p className="text-sm text-muted-foreground">{isSignup ? 'Create an account to save inventories and sets to the cloud.' : 'Sign in to access your saved inventories and gear sets.'}</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {isSignup && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Character / display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayame" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            <span className="ml-2">{isSignup ? 'Create account' : 'Sign in'}</span>
          </Button>
        </form>
        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Continue without account</Link>
          {isSignup ? (
            <Link href="/login" className="text-primary hover:underline">Have an account? Sign in</Link>
          ) : (
            <Link href="/signup" className="text-primary hover:underline">New here? Sign up</Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
