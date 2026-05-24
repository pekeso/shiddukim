'use client';

import { useEffect, useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  classificationLabels,
  formatDate,
  formatDateTime,
  marriageStatusLabels,
  nextMarriageStatuses,
} from '@/lib/labels';
import type {
  GeneratedDocumentResponse,
  MarriageClassification,
  MarriageRequest,
  MarriageRequestStatus,
} from '@/lib/types';

const classifications: MarriageClassification[] = ['GREEN', 'ORANGE', 'RED'];

export default function DossierDetailPage({
  params,
}: {
  params: Promise<{ requestCode: string }>;
}) {
  const { user } = useAuth();
  const [requestCode, setRequestCode] = useState('');
  const [request, setRequest] = useState<MarriageRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const isPastor =
    user?.role === 'PASTOR' || user?.role === 'SUPER_ADMIN' || user?.role === 'CHURCH_ADMIN';

  useEffect(() => {
    params.then(({ requestCode: code }) => setRequestCode(code));
  }, [params]);

  const load = async (code: string) => {
    const data = await api.get<MarriageRequest>(`/marriage-requests/${code}`);
    setRequest(data);
    setNotes(data.pastorNotes ?? '');
  };

  useEffect(() => {
    if (requestCode) load(requestCode).catch((err) => setError(err.message));
  }, [requestCode]);

  const updateNotes = async () => {
    if (!request) return;
    const updated = await api.patch<MarriageRequest>(`/marriage-requests/${request.requestCode}`, {
      pastorNotes: notes,
    });
    setRequest(updated);
  };

  const updateStatus = async (status: MarriageRequestStatus) => {
    if (!request) return;
    const updated = await api.patch<MarriageRequest>(
      `/marriage-requests/${request.requestCode}/status`,
      { status },
    );
    setRequest(updated);
  };

  const updateClassification = async (classification: MarriageClassification) => {
    if (!request) return;
    const updated = await api.patch<MarriageRequest>(
      `/marriage-requests/${request.requestCode}/classification`,
      { classification },
    );
    setRequest(updated);
  };

  const generate = async (kind: 'pdf' | 'referral') => {
    if (!request) return;
    const path = kind === 'pdf' ? 'generate-pdf' : 'generate-medical-referral';
    const doc = await api.post<GeneratedDocumentResponse>(
      `/marriage-requests/${request.requestCode}/${path}`,
    );
    window.open(doc.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Header title="Dossier matrimonial" />
      <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
        {error && <Alert variant="destructive">{error}</Alert>}
        {request && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{request.requestCode}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="Fidèle" value={request.memberCode} />
                <Info label="Conjoint(e)" value={request.spouseFullName ?? '-'} />
                <Info label="Téléphone" value={request.spousePhone ?? '-'} />
                <Info label="E-mail" value={request.spouseEmail ?? '-'} />
                <Info label="Date prévue" value={formatDate(request.intendedMarriageDate)} />
                <Info label="Créé le" value={formatDateTime(request.createdAt)} />
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Statut</p>
                  <Badge variant="blue" className="mt-1">
                    {marriageStatusLabels[request.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Classification
                  </p>
                  {request.classification ? (
                    <Badge
                      className="mt-1"
                      variant={
                        request.classification === 'GREEN'
                          ? 'green'
                          : request.classification === 'ORANGE'
                            ? 'orange'
                            : 'red'
                      }
                    >
                      {classificationLabels[request.classification]}
                    </Badge>
                  ) : (
                    <p className="mt-1 text-sm">-</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {isPastor && (
              <Card>
                <CardHeader>
                  <CardTitle>Action pastorale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Notes pastorales"
                    />
                    <Button onClick={updateNotes} variant="outline">
                      <Save className="mr-2 size-4" /> Enregistrer les notes
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Classification</p>
                    <div className="flex flex-wrap gap-2">
                      {classifications.map((classification) => (
                        <Button
                          key={classification}
                          variant="outline"
                          onClick={() => updateClassification(classification)}
                        >
                          {classificationLabels[classification]}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Prochain statut</p>
                    <div className="flex flex-wrap gap-2">
                      {nextMarriageStatuses[request.status].map((status) => (
                        <Button key={status} variant="outline" onClick={() => updateStatus(status)}>
                          {marriageStatusLabels[status]}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => generate('pdf')}
                      className="bg-[#003B8E] text-white hover:bg-[#0057B8]"
                    >
                      <FileText className="mr-2 size-4" /> Générer le PDF
                    </Button>
                    {request.classification === 'GREEN' && (
                      <Button
                        onClick={() => generate('referral')}
                        className="bg-[#15803D] text-white hover:bg-[#166534]"
                      >
                        Générer la référence médicale
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Questionnaire pastoral — visible to pastoral staff and the member themselves */}
            <Card>
              <CardHeader>
                <CardTitle>Questionnaire pastoral</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <QRow
                  number="3"
                  label="A-t-il déjà parlé de son intention à la fiancée ?"
                  value={request.hasSpokenToSpouse}
                />
                {request.hasSpokenToSpouse === true && (
                  <QRow label="Depuis quand ?" text={request.hasSpokenToSpouseSince} indent />
                )}
                <QRow
                  number="5"
                  label="En contact téléphonique ou autres contacts avec elle ?"
                  value={request.hasContactWithSpouse}
                />
                <QRow
                  number="6"
                  label="Ses parents sont-ils au courant ?"
                  value={request.parentsAware}
                />
                <QRow
                  number="7"
                  label="Les parents de la fille sont-ils au courant ?"
                  value={request.spouseParentsAware}
                />
                <QRow
                  number="8"
                  label="Ses parents connaissent-ils la fille et sa famille ?"
                  value={request.parentsKnowSpouse}
                />
                {request.parentsKnowSpouse === true && (
                  <QRow
                    number="9"
                    label="Sont-ils d'accord ?"
                    value={request.parentsApprove}
                    indent
                  />
                )}
                <QRow
                  number="10"
                  label="Les deux familles se sont-elles déjà rencontrées ?"
                  value={request.familiesMet}
                />
                {request.familiesMet === true && (
                  <QRow label="Depuis quand ?" text={request.familiesMetSince} indent />
                )}
                <div className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  11. Vous vous êtes déjà :
                </div>
                <QRow label="Embrassés ?" value={request.hasKissed} indent />
                <QRow label="Touchés dans le corps ?" value={request.hasPhysicalContact} indent />
                <QRow label="Connus ?" value={request.hasBeenIntimate} indent />
                {request.hasBeenIntimate === true && (
                  <QRow label="Combien de fois ?" text={request.intimacyCount} indent />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Timeline label="Création" value={formatDateTime(request.createdAt)} />
                <Timeline label="Soumission" value={formatDateTime(request.submittedAt)} />
                <Timeline label="Dernière revue" value={formatDateTime(request.reviewedAt)} />
                <Timeline label="Dernière modification" value={formatDateTime(request.updatedAt)} />
              </CardContent>
            </Card>
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
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function Timeline({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span>{label}</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

function QRow({
  number,
  label,
  value,
  text,
  indent = false,
}: {
  number?: string;
  label: string;
  value?: boolean | null;
  text?: string | null;
  indent?: boolean;
}) {
  const display =
    text !== undefined
      ? (text ?? '—')
      : value === null || value === undefined
        ? '—'
        : value
          ? 'Oui'
          : 'Non';

  const isYes = value === true;
  const isNo = value === false;

  return (
    <div className={`flex items-start justify-between gap-4 ${indent ? 'pl-5' : ''}`}>
      <span className="text-foreground">
        {number && <span className="mr-1 text-muted-foreground">{number}.</span>}
        {label}
      </span>
      <span
        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
          isYes
            ? 'bg-green-100 text-green-800'
            : isNo
              ? 'bg-red-100 text-red-700'
              : 'text-muted-foreground'
        }`}
      >
        {display}
      </span>
    </div>
  );
}
