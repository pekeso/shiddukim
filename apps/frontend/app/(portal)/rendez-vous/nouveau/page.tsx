'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { appointmentTypeLabels } from '@/lib/labels';
import type { AppointmentType } from '@/lib/types';

const appointmentTypes: AppointmentType[] = ['PASTORAL_COUNSELING', 'MARRIAGE_REVIEW', 'GENERAL'];

export default function NouveauRendezVousPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    appointmentType: 'GENERAL' as AppointmentType,
    scheduledAt: '',
    marriageRequestCode: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
      await api.post('/appointments', payload);
      router.push('/rendez-vous');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le rendez-vous.');
    }
  };

  return (
    <>
      <Header title="Nouveau rendez-vous" />
      <div className="mx-auto w-full max-w-2xl p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Planification</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.appointmentType}
                  onChange={(event) =>
                    setForm((f) => ({
                      ...f,
                      appointmentType: event.target.value as AppointmentType,
                    }))
                  }
                >
                  {appointmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {appointmentTypeLabels[type]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date et heure</Label>
                <Input
                  type="datetime-local"
                  required
                  value={form.scheduledAt}
                  onChange={(event) => setForm((f) => ({ ...f, scheduledAt: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Dossier matrimonial lié</Label>
                <Input
                  placeholder="MAR-2026-00001"
                  value={form.marriageRequestCode}
                  onChange={(event) =>
                    setForm((f) => ({
                      ...f,
                      marriageRequestCode: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
                />
              </div>
              <Button className="bg-[#003B8E] text-white hover:bg-[#0057B8]">
                Créer le rendez-vous
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
