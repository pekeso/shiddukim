'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { classificationLabels, formatDate, marriageStatusLabels } from '@/lib/labels';
import type {
  MarriageClassification,
  MarriageRequest,
  MarriageRequestStatus,
  PaginatedResponse,
} from '@/lib/types';

const statuses: MarriageRequestStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'WAITING_APPOINTMENT',
  'COUNSELING',
  'MEDICAL_REFERRAL',
  'WAITING_RESULTS',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
];
const classifications: MarriageClassification[] = ['GREEN', 'ORANGE', 'RED'];

export default function DossiersPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MarriageRequest[]>([]);
  const [status, setStatus] = useState('');
  const [classification, setClassification] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (status) params.set('status', status);
    api
      .get<PaginatedResponse<MarriageRequest>>(`/marriage-requests?${params}`)
      .then((res) => setRequests(res.data));
  }, [status]);

  const filtered = useMemo(() => {
    if (!classification) return requests;
    return requests.filter((request) => request.classification === classification);
  }, [requests, classification]);

  return (
    <>
      <Header title="Dossiers matrimoniaux" />
      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Tous les statuts</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {marriageStatusLabels[item]}
                </option>
              ))}
            </Select>
            <Select
              value={classification}
              onChange={(event) => setClassification(event.target.value)}
            >
              <option value="">Toutes les classifications</option>
              {classifications.map((item) => (
                <option key={item} value={item}>
                  {classificationLabels[item]}
                </option>
              ))}
            </Select>
          </div>
          {user?.role === 'MEMBER' && (
            <Link href="/dossiers-matrimoniaux/nouveau">
              <Button className="bg-[#003B8E] text-white hover:bg-[#0057B8]">
                <Plus className="mr-2 size-4" /> Nouveau dossier
              </Button>
            </Link>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Liste des dossiers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Fidèle</TableHead>
                  <TableHead>Conjoint(e)</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((request) => (
                  <TableRow key={request.requestCode}>
                    <TableCell>
                      <Link
                        className="font-mono text-xs text-[#0057B8] hover:underline"
                        href={`/dossiers-matrimoniaux/${request.requestCode}`}
                      >
                        {request.requestCode}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{request.memberCode}</TableCell>
                    <TableCell>{request.spouseFullName ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant="blue">{marriageStatusLabels[request.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {request.classification ? (
                        <Badge
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
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
