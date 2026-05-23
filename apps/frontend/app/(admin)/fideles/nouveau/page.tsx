'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { CreateMemberResponse } from '@/lib/types';

export default function NouveauFidelePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    placeOfBirth: '',
    address: '',
    baptismDate: '',
    baptizedBy: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      const result = await api.post<CreateMemberResponse>('/members', payload);
      const member = result.member;

      // Upload photo if provided
      if (photoFile && member.memberCode) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        await api.post(`/members/${member.memberCode}/photo`, fd);
      }

      router.push(`/fideles/${member.memberCode}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du fidèle.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header title="Nouveau fidèle" />
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Link
          href="/fideles"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Retour à la liste
        </Link>

        {error && <Alert variant="destructive">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo */}
          <Card>
            <CardHeader>
              <CardTitle>Photo de profil</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="flex size-24 items-center justify-center rounded-full bg-muted overflow-hidden border-2 border-border">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Aperçu" className="size-full object-cover" />
                ) : (
                  <span className="text-3xl text-muted-foreground">👤</span>
                )}
              </div>
              <div>
                <Label htmlFor="photo" className="cursor-pointer">
                  <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
                    <Upload className="size-4" />
                    Choisir une photo
                  </div>
                  <input
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">JPEG ou PNG, max 5 Mo</p>
              </div>
            </CardContent>
          </Card>

          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle>Identité</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input id="firstName" value={form.firstName} onChange={set('firstName')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input id="lastName" value={form.lastName} onChange={set('lastName')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Genre</Label>
                <Select id="gender" value={form.gender} onChange={set('gender')}>
                  <option value="">— Sélectionner —</option>
                  <option value="MALE">Masculin</option>
                  <option value="FEMALE">Féminin</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date de naissance</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={set('dateOfBirth')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placeOfBirth">Lieu de naissance</Label>
                <Input id="placeOfBirth" value={form.placeOfBirth} onChange={set('placeOfBirth')} />
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input id="email" type="email" value={form.email} onChange={set('email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" value={form.address} onChange={set('address')} />
              </div>
            </CardContent>
          </Card>

          {/* Baptism */}
          <Card>
            <CardHeader>
              <CardTitle>Données de baptême</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="baptismDate">Date de baptême</Label>
                <Input
                  id="baptismDate"
                  type="date"
                  value={form.baptismDate}
                  onChange={set('baptismDate')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baptizedBy">Baptisé par</Label>
                <Input id="baptizedBy" value={form.baptizedBy} onChange={set('baptizedBy')} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/fideles">
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#003B8E] text-white hover:bg-[#0057B8]"
            >
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Enregistrer le fidèle
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
