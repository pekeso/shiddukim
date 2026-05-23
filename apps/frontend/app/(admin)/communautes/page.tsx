'use client';

import { useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Alert } from '@/components/ui/alert';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import type { Community, MemberSummary, PaginatedResponse } from '@/lib/types';

export default function CommunautesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selected, setSelected] = useState<Community | null>(null);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Community | null>(null);
  const [form, setForm] = useState({ name: '', description: '', presidentMemberCode: '' });
  const [error, setError] = useState('');

  const load = () => {
    api
      .get<Community[]>('/communities')
      .then(setCommunities)
      .catch((err) => setError(err.message));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', presidentMemberCode: '' });
    setDialogOpen(true);
  };

  const openEdit = (community: Community) => {
    setEditing(community);
    setForm({
      name: community.name,
      description: community.description ?? '',
      presidentMemberCode: community.presidentMemberCode ?? '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
    if (editing) {
      await api.patch(`/communities/${editing.id}`, payload);
    } else {
      await api.post('/communities', payload);
    }
    setDialogOpen(false);
    load();
  };

  const showMembers = async (community: Community) => {
    setSelected(community);
    const data = await api.get<PaginatedResponse<MemberSummary>>(
      `/members?communityId=${community.id}&limit=100`,
    );
    setMembers(data.data);
  };

  return (
    <>
      <Header title="Communautés" />
      <div className="space-y-4 p-6">
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="flex justify-end">
          <Button onClick={openCreate} className="bg-[#003B8E] text-white hover:bg-[#0057B8]">
            <Plus className="mr-2 size-4" /> Nouvelle communauté
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Liste des communautés</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Président</TableHead>
                    <TableHead>Membres</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communities.map((community) => (
                    <TableRow key={community.id}>
                      <TableCell className="font-medium">{community.name}</TableCell>
                      <TableCell>{community.presidentMemberCode ?? '-'}</TableCell>
                      <TableCell>{community.memberCount ?? 0}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button variant="outline" size="sm" onClick={() => showMembers(community)}>
                          Membres
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(community)}>
                          Modifier
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" /> {selected?.name ?? 'Membres'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sélectionnez une communauté.</p>
              ) : (
                members.map((member) => (
                  <div key={member.memberCode} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{member.memberCode}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la communauté' : 'Nouvelle communauté'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Code du président</Label>
              <Input
                value={form.presidentMemberCode}
                onChange={(event) =>
                  setForm((f) => ({ ...f, presidentMemberCode: event.target.value.toUpperCase() }))
                }
                placeholder="SHK-2026-00001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={save} className="bg-[#003B8E] text-white hover:bg-[#0057B8]">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
