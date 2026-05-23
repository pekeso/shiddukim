'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { formatDate, memberStatusLabels } from '@/lib/labels';
import type { Document, MemberDetail, PaginatedResponse } from '@/lib/types';

export default function MonProfilPage() {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await api.get<MemberDetail>('/members/me');
        setMember(profile);
        api
          .get<{ signedUrl: string }>(`/members/${profile.memberCode}/photo`)
          .then((res) => setPhotoUrl(res.signedUrl))
          .catch(() => setPhotoUrl(''));
        const docs = await api.get<PaginatedResponse<Document>>('/documents?limit=20');
        setDocuments(docs.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger le profil.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <>
        <Header title="Mon profil" />
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Mon profil" />
      <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
        {error && <Alert variant="destructive">{error}</Alert>}
        {member && (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <Card>
              <CardContent className="space-y-4 p-6 text-center">
                <div className="mx-auto size-32 overflow-hidden rounded-full border bg-muted">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Photo de profil" className="size-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{member.memberCode}</p>
                </div>
                <Badge variant={member.status === 'ACTIVATED' ? 'success' : 'muted'}>
                  {memberStatusLabels[member.status]}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Info label="E-mail" value={member.email ?? '-'} />
                <Info label="Téléphone" value={member.phone ?? '-'} />
                <Info label="Date de naissance" value={formatDate(member.dateOfBirth)} />
                <Info label="Lieu de naissance" value={member.placeOfBirth ?? '-'} />
                <Info label="Adresse" value={member.address ?? '-'} />
                <Info label="Date de baptême" value={formatDate(member.baptismDate)} />
                <Info label="Baptisé par" value={member.baptizedBy ?? '-'} />
              </CardContent>
            </Card>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Mes documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun document disponible.</p>
            ) : (
              documents.map((document) => (
                <div
                  key={document.documentCode}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{document.originalFileName}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {document.documentCode}
                    </p>
                  </div>
                  <a
                    className="text-[#0057B8] hover:underline"
                    href={`/documents?document=${document.documentCode}`}
                  >
                    Ouvrir
                  </a>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
