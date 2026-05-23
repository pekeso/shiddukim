'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { appointmentStatusLabels, appointmentTypeLabels, formatDateTime } from '@/lib/labels';
import type { Appointment, AppointmentStatus, PaginatedResponse } from '@/lib/types';

const statuses: AppointmentStatus[] = ['SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'];

export default function RendezVousPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    const params = new URLSearchParams({ limit: '100' });
    if (status) params.set('status', status);
    api
      .get<PaginatedResponse<Appointment>>(`/appointments?${params}`)
      .then((res) => setAppointments(res.data))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [status]);

  const cancel = async () => {
    if (!cancelTarget) return;
    await api.post(`/appointments/${cancelTarget.appointmentCode}/cancel`, {
      reason: cancelReason,
    });
    setCancelTarget(null);
    setCancelReason('');
    load();
  };

  const reschedule = async () => {
    if (!rescheduleTarget) return;
    await api.patch(`/appointments/${rescheduleTarget.appointmentCode}`, { scheduledAt });
    setRescheduleTarget(null);
    setScheduledAt('');
    load();
  };

  return (
    <>
      <Header title="Rendez-vous" />
      <div className="space-y-4 p-6">
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="max-w-xs"
          >
            <option value="">Tous les statuts</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {appointmentStatusLabels[item]}
              </option>
            ))}
          </Select>
          <Link href="/rendez-vous/nouveau">
            <Button className="bg-[#003B8E] text-white hover:bg-[#0057B8]">
              <Plus className="mr-2 size-4" /> Nouveau rendez-vous
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Liste des rendez-vous</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.appointmentCode}>
                    <TableCell className="font-mono text-xs">
                      {appointment.appointmentCode}
                    </TableCell>
                    <TableCell>{appointmentTypeLabels[appointment.appointmentType]}</TableCell>
                    <TableCell>{formatDateTime(appointment.scheduledAt)}</TableCell>
                    <TableCell>{appointment.marriageRequestCode ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={appointment.status === 'CANCELLED' ? 'destructive' : 'blue'}>
                        {appointmentStatusLabels[appointment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRescheduleTarget(appointment);
                          setScheduledAt(appointment.scheduledAt.slice(0, 16));
                        }}
                      >
                        Replanifier
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCancelTarget(appointment)}
                      >
                        Annuler
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        <DialogContent onClose={() => setCancelTarget(null)}>
          <DialogHeader>
            <DialogTitle>Annuler le rendez-vous</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motif</Label>
            <Textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Fermer
            </Button>
            <Button variant="destructive" onClick={cancel}>
              Annuler le rendez-vous
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rescheduleTarget} onClose={() => setRescheduleTarget(null)}>
        <DialogContent onClose={() => setRescheduleTarget(null)}>
          <DialogHeader>
            <DialogTitle>Replanifier le rendez-vous</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nouvelle date</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
              Fermer
            </Button>
            <Button onClick={reschedule} className="bg-[#003B8E] text-white hover:bg-[#0057B8]">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
