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

// ── Types ─────────────────────────────────────────────────────────────────────

type BooleanField =
  | 'hasSpokenToSpouse'
  | 'hasContactWithSpouse'
  | 'parentsAware'
  | 'spouseParentsAware'
  | 'parentsKnowSpouse'
  | 'parentsApprove'
  | 'familiesMet'
  | 'hasKissed'
  | 'hasPhysicalContact'
  | 'hasBeenIntimate';

interface FormState {
  // Spouse info
  spouseFullName: string;
  spousePhone: string;
  spouseEmail: string;
  intendedMarriageDate: string;
  // Questionnaire — booleans (null = not yet answered)
  hasSpokenToSpouse: boolean | null;
  hasSpokenToSpouseSince: string;
  hasContactWithSpouse: boolean | null;
  parentsAware: boolean | null;
  spouseParentsAware: boolean | null;
  parentsKnowSpouse: boolean | null;
  parentsApprove: boolean | null;
  familiesMet: boolean | null;
  familiesMetSince: string;
  hasKissed: boolean | null;
  hasPhysicalContact: boolean | null;
  hasBeenIntimate: boolean | null;
  intimacyCount: string;
}

const initialForm: FormState = {
  spouseFullName: '',
  spousePhone: '',
  spouseEmail: '',
  intendedMarriageDate: '',
  hasSpokenToSpouse: null,
  hasSpokenToSpouseSince: '',
  hasContactWithSpouse: null,
  parentsAware: null,
  spouseParentsAware: null,
  parentsKnowSpouse: null,
  parentsApprove: null,
  familiesMet: null,
  familiesMetSince: '',
  hasKissed: null,
  hasPhysicalContact: null,
  hasBeenIntimate: null,
  intimacyCount: '',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NouveauDossierPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setBool = (field: BooleanField, value: boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setText = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Build payload — omit blank strings and include booleans as-is
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {};
      if (form.spouseFullName) payload.spouseFullName = form.spouseFullName;
      if (form.spousePhone) payload.spousePhone = form.spousePhone;
      if (form.spouseEmail) payload.spouseEmail = form.spouseEmail;
      if (form.intendedMarriageDate) payload.intendedMarriageDate = form.intendedMarriageDate;
      // Boolean questionnaire fields
      for (const key of [
        'hasSpokenToSpouse',
        'hasContactWithSpouse',
        'parentsAware',
        'spouseParentsAware',
        'parentsKnowSpouse',
        'parentsApprove',
        'familiesMet',
        'hasKissed',
        'hasPhysicalContact',
        'hasBeenIntimate',
      ] as BooleanField[]) {
        if (form[key] !== null) payload[key] = form[key];
      }
      // Conditional text fields
      if (form.hasSpokenToSpouse && form.hasSpokenToSpouseSince)
        payload.hasSpokenToSpouseSince = form.hasSpokenToSpouseSince;
      if (form.familiesMet && form.familiesMetSince)
        payload.familiesMetSince = form.familiesMetSince;
      if (form.hasBeenIntimate && form.intimacyCount) payload.intimacyCount = form.intimacyCount;

      const request = await api.post<MarriageRequest>('/marriage-requests', payload);
      await api.post(`/marriage-requests/${request.requestCode}/submit`);
      router.push(`/dossiers-matrimoniaux/${request.requestCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de soumettre le dossier.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Nouveau dossier matrimonial" />
      <div className="mx-auto w-full max-w-2xl p-6 pb-12">
        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={submit} className="space-y-6">
          {/* ── Section 1: Informations sur la fiancée ── */}
          <Card>
            <CardHeader>
              <CardTitle>Informations sur la fiancée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TextField
                label="Nom complet de la fiancée"
                value={form.spouseFullName}
                onChange={(v) => setText('spouseFullName', v)}
                required
              />
              <TextField
                label="Téléphone de la fiancée"
                value={form.spousePhone}
                onChange={(v) => setText('spousePhone', v)}
              />
              <TextField
                label="E-mail de la fiancée"
                type="email"
                value={form.spouseEmail}
                onChange={(v) => setText('spouseEmail', v)}
              />
              <TextField
                label="Date prévue du mariage"
                type="date"
                value={form.intendedMarriageDate}
                onChange={(v) => setText('intendedMarriageDate', v)}
              />
            </CardContent>
          </Card>

          {/* ── Section 2: Questionnaire pastoral ── */}
          <Card>
            <CardHeader>
              <CardTitle>Questionnaire pastoral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Q3 */}
              <YesNoField
                number="3"
                label="Lui as-tu déjà parlé de ton intention ?"
                value={form.hasSpokenToSpouse}
                onChange={(v) => setBool('hasSpokenToSpouse', v)}
              />
              {form.hasSpokenToSpouse === true && (
                <TextField
                  label="Si oui, depuis quand ?"
                  value={form.hasSpokenToSpouseSince}
                  onChange={(v) => setText('hasSpokenToSpouseSince', v)}
                  required
                  indent
                />
              )}

              {/* Q5 */}
              <YesNoField
                number="5"
                label="Es-tu en contact téléphonique ou autres contacts avec elle ?"
                value={form.hasContactWithSpouse}
                onChange={(v) => setBool('hasContactWithSpouse', v)}
              />

              {/* Q6 */}
              <YesNoField
                number="6"
                label="Tes parents sont-ils au courant ?"
                value={form.parentsAware}
                onChange={(v) => setBool('parentsAware', v)}
              />

              {/* Q7 */}
              <YesNoField
                number="7"
                label="Les parents de la fille sont-ils aussi au courant ?"
                value={form.spouseParentsAware}
                onChange={(v) => setBool('spouseParentsAware', v)}
              />

              {/* Q8 */}
              <YesNoField
                number="8"
                label="Tes parents connaissent-ils la fille et sa famille ?"
                value={form.parentsKnowSpouse}
                onChange={(v) => setBool('parentsKnowSpouse', v)}
              />
              {form.parentsKnowSpouse === true && (
                <YesNoField
                  number="9"
                  label="Si oui, sont-ils d'accord ?"
                  value={form.parentsApprove}
                  onChange={(v) => setBool('parentsApprove', v)}
                  indent
                />
              )}

              {/* Q10 */}
              <YesNoField
                number="10"
                label="Les deux familles sont-elles au courant et se sont-elles déjà rencontrées ?"
                value={form.familiesMet}
                onChange={(v) => setBool('familiesMet', v)}
              />
              {form.familiesMet === true && (
                <TextField
                  label="Si oui, depuis quand ?"
                  value={form.familiesMetSince}
                  onChange={(v) => setText('familiesMetSince', v)}
                  required
                  indent
                />
              )}

              {/* Q11 */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">11. Vous vous êtes déjà :</p>
                <div className="space-y-3 pl-4">
                  <YesNoField
                    label="Embrassés ?"
                    value={form.hasKissed}
                    onChange={(v) => setBool('hasKissed', v)}
                  />
                  <YesNoField
                    label="Touchés dans le corps ?"
                    value={form.hasPhysicalContact}
                    onChange={(v) => setBool('hasPhysicalContact', v)}
                  />
                  <YesNoField
                    label="Connus ?"
                    value={form.hasBeenIntimate}
                    onChange={(v) => setBool('hasBeenIntimate', v)}
                  />
                  {form.hasBeenIntimate === true && (
                    <TextField
                      label="Combien de fois ?"
                      value={form.intimacyCount}
                      onChange={(v) => setText('intimacyCount', v)}
                      indent
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#003B8E] text-white hover:bg-[#0057B8]"
          >
            {loading ? 'Soumission en cours…' : 'Soumettre le dossier'}
          </Button>
        </form>
      </div>
    </>
  );
}

// ── Shared field components ───────────────────────────────────────────────────

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  indent = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  indent?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${indent ? 'pl-4' : ''}`}>
      <Label className="text-sm">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </div>
  );
}

function YesNoField({
  number,
  label,
  value,
  onChange,
  indent = false,
}: {
  number?: string;
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  indent?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${indent ? 'pl-4' : ''}`}>
      <p className="text-sm font-medium text-foreground">
        {number && <span className="mr-1 text-muted-foreground">{number}.</span>}
        {label}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex h-9 w-20 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
            value === true
              ? 'border-[#003B8E] bg-[#003B8E] text-white'
              : 'border-border bg-white text-foreground hover:border-[#003B8E] hover:text-[#003B8E]'
          }`}
        >
          Oui
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex h-9 w-20 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
            value === false
              ? 'border-[#B91C1C] bg-[#B91C1C] text-white'
              : 'border-border bg-white text-foreground hover:border-[#B91C1C] hover:text-[#B91C1C]'
          }`}
        >
          Non
        </button>
      </div>
    </div>
  );
}
