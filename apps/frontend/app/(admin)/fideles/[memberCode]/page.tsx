'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, QrCode, Save } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { formatDate, memberStatusLabels } from '@/lib/labels';
import type { Community, MemberDetail } from '@/lib/types';

const statusVariants: Record<string, 'success' | 'muted' | 'warning' | 'destructive'> = {
  ACTIVATED: 'success',
  CREATED: 'muted',
  SUSPENDED: 'warning',
  DECEASED: 'destructive',
};

export default function FideleDetailPage({ params }: { params: Promise<{ memberCode: string }> }) {
  const [memberCode, setMemberCode] = useState('');
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    params.then(({ memberCode: code }) => setMemberCode(code));
  }, [params]);

  const load = async (code: string) => {
    setIsLoading(true);
    setError('');
    try {
      const [memberData, communityData] = await Promise.all([
        api.get<MemberDetail>(`/members/${code}`),
        api.get<Community[]>('/communities'),
      ]);
      setMember(memberData);
      setCommunities(communityData);
      setEditForm({
        firstName: memberData.firstName ?? '',
        middleName: memberData.middleName ?? '',
        lastName: memberData.lastName ?? '',
        gender: memberData.gender ?? '',
        dateOfBirth: memberData.dateOfBirth?.slice(0, 10) ?? '',
        placeOfBirth: memberData.placeOfBirth ?? '',
        address: memberData.address ?? '',
        phone: memberData.phone ?? '',
        email: memberData.email ?? '',
      });
      api
        .get<{ signedUrl: string }>(`/members/${code}/photo`)
        .then((res) => setPhotoUrl(res.signedUrl))
        .catch(() => setPhotoUrl(''));
      api
        .get<{ qrCode: string }>(`/members/${code}/qr-code`)
        .then((res) => setQrCode(res.qrCode))
        .catch(() => setQrCode(''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le fidèle.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (memberCode) load(memberCode);
  }, [memberCode]);

  const updateMember = async () => {
    if (!member) return;
    const payload = Object.fromEntries(
      Object.entries(editForm).filter(([, value]) => value !== ''),
    );
    const updated = await api.patch<MemberDetail>(`/members/${member.memberCode}`, payload);
    setMember(updated);
    setEditOpen(false);
  };

  const assignCommunity = async (communityId: string) => {
    if (!member || !communityId) return;
    await api.post(`/communities/${communityId}/members`, { memberCode: member.memberCode });
    await load(member.memberCode);
  };

  const uploadPhoto = async (file?: File) => {
    if (!member || !file) return;
    const formData = new FormData();
    formData.append('photo', file);
    await api.post(`/members/${member.memberCode}/photo`, formData);
    await load(member.memberCode);
  };

  if (isLoading) {
    return (
      <>
        <Header title="Fidèle" />
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Détail du fidèle" />
      <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
        <Link
          href="/fideles"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Retour à la liste
        </Link>
        {error && <Alert variant="destructive">{error}</Alert>}
        {member && (
          <>
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <Card>
                <CardContent className="space-y-4 p-6 text-center">
                  <div className="mx-auto flex size-32 items-center justify-center overflow-hidden rounded-full border bg-muted">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt="Photo du fidèle"
                        className="size-full object-cover"
                      />
                    ) : (
                      <Camera className="size-10 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{member.memberCode}</p>
                  </div>
                  <Badge variant={statusVariants[member.status] ?? 'muted'}>
                    {memberStatusLabels[member.status]}
                  </Badge>
                  <Label className="block cursor-pointer">
                    <span className="inline-flex h-9 items-center rounded-lg border px-3 text-sm hover:bg-muted">
                      Changer la photo
                    </span>
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(event) => uploadPhoto(event.target.files?.[0])}
                    />
                  </Label>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Informations officielles</CardTitle>
                  <Button
                    onClick={() => setEditOpen(true)}
                    className="bg-[#003B8E] text-white hover:bg-[#0057B8]"
                  >
                    Modifier
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Info
                    label="Nom complet"
                    value={`${member.firstName} ${member.middleName ?? ''} ${member.lastName}`}
                  />
                  <Info
                    label="Genre"
                    value={
                      member.gender === 'MALE'
                        ? 'Masculin'
                        : member.gender === 'FEMALE'
                          ? 'Féminin'
                          : '-'
                    }
                  />
                  <Info label="Date de naissance" value={formatDate(member.dateOfBirth)} />
                  <Info label="Lieu de naissance" value={member.placeOfBirth ?? '-'} />
                  <Info label="E-mail" value={member.email ?? '-'} />
                  <Info label="Téléphone" value={member.phone ?? '-'} />
                  <Info label="Adresse" value={member.address ?? '-'} />
                  <Info
                    label="Communauté"
                    value={communities.find((c) => c.id === member.communityId)?.name ?? '-'}
                  />
                  <Info label="Date de baptême" value={formatDate(member.baptismDate)} />
                  <Info label="Baptisé par" value={member.baptizedBy ?? '-'} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Assignation communautaire</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Select
                    defaultValue={member.communityId ?? ''}
                    onChange={(event) => assignCommunity(event.target.value)}
                  >
                    <option value="">Sélectionner une communauté</option>
                    {communities.map((community) => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="size-5" /> Code QR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qrCode ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrCode} alt="Code QR du fidèle" className="size-36" />
                  ) : (
                    <p className="text-sm text-muted-foreground">Code QR indisponible.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
              <DialogContent onClose={() => setEditOpen(false)} className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Modifier le fidèle</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Prénom"
                    value={editForm.firstName}
                    onChange={(value) => setEditForm((f) => ({ ...f, firstName: value }))}
                  />
                  <Field
                    label="Deuxième prénom"
                    value={editForm.middleName}
                    onChange={(value) => setEditForm((f) => ({ ...f, middleName: value }))}
                  />
                  <Field
                    label="Nom"
                    value={editForm.lastName}
                    onChange={(value) => setEditForm((f) => ({ ...f, lastName: value }))}
                  />
                  <div className="space-y-2">
                    <Label>Genre</Label>
                    <Select
                      value={editForm.gender}
                      onChange={(event) =>
                        setEditForm((f) => ({ ...f, gender: event.target.value }))
                      }
                    >
                      <option value="">Non renseigné</option>
                      <option value="MALE">Masculin</option>
                      <option value="FEMALE">Féminin</option>
                    </Select>
                  </div>
                  <Field
                    label="Date de naissance"
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(value) => setEditForm((f) => ({ ...f, dateOfBirth: value }))}
                  />
                  <Field
                    label="Lieu de naissance"
                    value={editForm.placeOfBirth}
                    onChange={(value) => setEditForm((f) => ({ ...f, placeOfBirth: value }))}
                  />
                  <Field
                    label="E-mail"
                    type="email"
                    value={editForm.email}
                    onChange={(value) => setEditForm((f) => ({ ...f, email: value }))}
                  />
                  <Field
                    label="Téléphone"
                    value={editForm.phone}
                    onChange={(value) => setEditForm((f) => ({ ...f, phone: value }))}
                  />
                  <Field
                    label="Adresse"
                    value={editForm.address}
                    onChange={(value) => setEditForm((f) => ({ ...f, address: value }))}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={updateMember}
                    className="bg-[#003B8E] text-white hover:bg-[#0057B8]"
                  >
                    <Save className="mr-2 size-4" /> Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
