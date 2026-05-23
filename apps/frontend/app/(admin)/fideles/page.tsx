'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { memberStatusLabels } from '@/lib/labels';
import type { Community, MemberSummary, PaginatedResponse } from '@/lib/types';

const statusVariants: Record<string, 'success' | 'muted' | 'warning' | 'destructive'> = {
  ACTIVATED: 'success',
  CREATED: 'muted',
  SUSPENDED: 'warning',
  DECEASED: 'destructive',
};

export default function FidelesPage() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [communities, setCommunities] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const limit = 20;

  const fetchMembers = useCallback(async (query: string, nextPage: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: String(limit) });
      const normalized = query.trim();
      if (normalized.startsWith('SHK-')) {
        params.set('memberCode', normalized);
      } else if (normalized) {
        const [firstName, ...rest] = normalized.split(/\s+/);
        params.set('firstName', firstName);
        if (rest.length > 0) params.set('lastName', rest.join(' '));
      }

      const data = await api.get<PaginatedResponse<MemberSummary>>(`/members?${params}`);
      setMembers(data.data);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Erreur chargement fideles:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    api
      .get<Community[]>('/communities')
      .then((items) => {
        setCommunities(Object.fromEntries(items.map((item) => [item.id, item.name])));
      })
      .catch(() => setCommunities({}));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchMembers(search, 1);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, fetchMembers]);

  useEffect(() => {
    if (page > 1) fetchMembers(search, page);
  }, [page, search, fetchMembers]);

  return (
    <>
      <Header title="Fidèles" />
      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou code..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Link href="/fideles/nouveau">
            <Button className="bg-[#003B8E] text-white hover:bg-[#0057B8]">
              <Plus className="mr-2 size-4" />
              Nouveau fidèle
            </Button>
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-white shadow-sm">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" className="text-[#003B8E]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Communauté</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Téléphone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      Aucun fidèle trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.memberCode}>
                      <TableCell>
                        <Link
                          href={`/fideles/${member.memberCode}`}
                          className="font-mono text-xs font-medium text-[#0057B8] hover:underline"
                        >
                          {member.memberCode}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">
                        {member.firstName} {member.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.communityId ? (communities[member.communityId] ?? '-') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[member.status] ?? 'muted'}>
                          {memberStatusLabels[member.status] ?? member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.email ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{member.phone ?? '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total} fidèle{total > 1 ? 's' : ''} au total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <span>
                Page {page} / {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(pages, current + 1))}
                disabled={page === pages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
