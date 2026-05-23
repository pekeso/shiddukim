'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import type { LoginResponse } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Step = 'code' | 'otp' | 'password';

const STEPS: { key: Step; label: string }[] = [
  { key: 'code', label: 'Code membre' },
  { key: 'otp', label: 'Vérification' },
  { key: 'password', label: 'Mot de passe' },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEPS.map((step, idx) => (
        <div key={step.key} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                idx < currentIdx
                  ? 'border-[#003B8E] bg-[#003B8E] text-white'
                  : idx === currentIdx
                    ? 'border-[#003B8E] bg-white text-[#003B8E]'
                    : 'border-border bg-white text-muted-foreground',
              )}
            >
              {idx < currentIdx ? <CheckCircle className="size-4" /> : idx + 1}
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">{step.label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={cn(
                'mb-4 h-0.5 w-12 transition-colors',
                idx < currentIdx ? 'bg-[#003B8E]' : 'bg-border',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ActivationPage() {
  const [step, setStep] = useState<Step>('code');
  const [memberCode, setMemberCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login } = useAuth();
  const router = useRouter();

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) {
          clearInterval(interval);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

  // Step 1 — enter member code
  const handleStartActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post<{ maskedEmail: string }>('/auth/activate/start', { memberCode });
      setMaskedEmail(res.maskedEmail);
      setStep('otp');
      // Request OTP immediately after start
      await api.post('/auth/activate/request-otp', { memberCode });
      startCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      await api.post('/auth/activate/request-otp', { memberCode });
      startCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du renvoi.');
    }
  };

  // Step 2 — verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      // We don't fully verify OTP at this step — we'll pass it to the final verify call
      // Just validate it's 6 digits and move to password step
      if (!/^\d{6}$/.test(otp.trim())) {
        setError('Le code de vérification doit être composé de 6 chiffres.');
        return;
      }
      setStep('password');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code invalide.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3 — set password + final verify
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post<LoginResponse>('/auth/activate/verify', {
        memberCode,
        code: otp,
        password,
      });
      login(response);
      router.replace('/mon-profil');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'activation.");
      // Go back to OTP step if verification fails
      setStep('otp');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <span className="text-3xl font-bold" style={{ color: '#003B8E' }}>
          ✦ Shiddukim
        </span>
        <p className="mt-2 text-sm text-muted-foreground">Activation de compte</p>
      </div>

      <StepIndicator current={step} />

      <Card>
        <CardHeader>
          {step === 'code' && (
            <>
              <CardTitle>Entrez votre code membre</CardTitle>
              <CardDescription>
                Votre code membre vous a été remis par le secrétariat. Il est au format
                SHK-AAAA-NNNNN.
              </CardDescription>
            </>
          )}
          {step === 'otp' && (
            <>
              <CardTitle>Vérification par e-mail</CardTitle>
              <CardDescription>
                Un code a été envoyé à <strong>{maskedEmail}</strong>. Saisissez-le ci-dessous.
              </CardDescription>
            </>
          )}
          {step === 'password' && (
            <>
              <CardTitle>Créez votre mot de passe</CardTitle>
              <CardDescription>
                Choisissez un mot de passe sécurisé (minimum 8 caractères).
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Step 1 — Member Code */}
          {step === 'code' && (
            <form onSubmit={handleStartActivation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memberCode">Code membre</Label>
                <Input
                  id="memberCode"
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                  placeholder="SHK-2026-00001"
                  required
                  pattern="SHK-\d{4}-\d{5}"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#003B8E] text-white hover:bg-[#0057B8] h-10"
              >
                {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Continuer
              </Button>
            </form>
          )}

          {/* Step 2 — OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Code de vérification</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="w-full bg-[#003B8E] text-white hover:bg-[#0057B8] h-10"
              >
                {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Vérifier
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="text-sm text-[#0057B8] hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendCooldown > 0
                    ? `Renvoyer le code dans ${resendCooldown}s`
                    : 'Renvoyer le code'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — Password */}
          {step === 'password' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#003B8E] text-white hover:bg-[#0057B8] h-10"
              >
                {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Activer mon compte
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Déjà activé ?{' '}
            <a href="/connexion" className="font-medium text-[#0057B8] hover:underline">
              Se connecter
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
