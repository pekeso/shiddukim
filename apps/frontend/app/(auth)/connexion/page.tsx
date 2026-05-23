'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import type { LoginResponse } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConnexionPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });
      login(response);

      // Redirect based on role
      const [, payload] = response.accessToken.split('.');
      const tokenPayload = payload
        ? JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
        : { role: 'MEMBER' };
      const role = tokenPayload.role;
      if (role === 'MEMBER') {
        router.replace('/mon-profil');
      } else {
        router.replace('/tableau-de-bord');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <Image
          src="/brand/logo.jpeg"
          alt="Shiddukim"
          width={128}
          height={128}
          priority
          className="mx-auto h-24 w-auto object-contain"
        />
        <h1 className="mt-4 text-2xl font-bold text-[#003B8E]">Shiddukim</h1>
        <p className="mt-2 text-sm text-muted-foreground">Plateforme de gestion des fidèles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>Entrez vos identifiants pour accéder à votre espace.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-2 p-0.5 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#003B8E] text-white hover:bg-[#0057B8] h-10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Première connexion ?{' '}
            <a href="/activation" className="font-medium text-[#0057B8] hover:underline">
              Activer mon compte
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
