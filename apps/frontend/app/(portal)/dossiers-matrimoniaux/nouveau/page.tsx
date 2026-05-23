'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import type { MarriageRequest } from '@/lib/types';

export default function NouveauDossierPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    spouseFullName: '',
    spousePhone: '',
    spouseEmail: '',
    intendedMarriageDate: '',
  });
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
      const request = await api.post<MarriageRequest>('/marriage-requests', payload);
      await api.post(`/marriage-requests/${request.requestCode}/submit`);
      router.push(`/dossiers-matrimoniaux/${request.requestCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de soumettre le dossier.');
    }
  };

  return (
    <>
      <Header title="Nouveau dossier matrimonial" />
      <div className="mx-auto w-full max-w-2xl p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Projet matrimonial</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <Field
                label="Nom complet du/de la conjoint(e)"
                value={form.spouseFullName}
                onChange={(value) => setForm((f) => ({ ...f, spouseFullName: value }))}
                required
              />
              <Field
                label="Téléphone du/de la conjoint(e)"
                value={form.spousePhone}
                onChange={(value) => setForm((f) => ({ ...f, spousePhone: value }))}
              />
              <Field
                label="E-mail du/de la conjoint(e)"
                type="email"
                value={form.spouseEmail}
                onChange={(value) => setForm((f) => ({ ...f, spouseEmail: value }))}
              />
              <Field
                label="Date prévue du mariage"
                type="date"
                value={form.intendedMarriageDate}
                onChange={(value) => setForm((f) => ({ ...f, intendedMarriageDate: value }))}
              />
              <Button className="bg-[#003B8E] text-white hover:bg-[#0057B8]">
                Soumettre le dossier
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
