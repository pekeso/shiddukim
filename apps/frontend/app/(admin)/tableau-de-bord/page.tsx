'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BookOpen, CalendarDays, TrendingUp, Users } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import type { AppointmentStat, DashboardSummary, MarriageStat } from '@/lib/types';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div
            className="flex size-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="size-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClassificationBadges({ summary }: { summary: DashboardSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Classifications matrimoniales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <Badge variant="green" className="px-4 py-1 text-sm">
              {summary.greenCount}
            </Badge>
            <span className="text-xs text-muted-foreground">Vert</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Badge variant="orange" className="px-4 py-1 text-sm">
              {summary.orangeCount}
            </Badge>
            <span className="text-xs text-muted-foreground">Orange</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Badge variant="red" className="px-4 py-1 text-sm">
              {summary.redCount}
            </Badge>
            <span className="text-xs text-muted-foreground">Rouge</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TableauDeBordPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [marriageStats, setMarriageStats] = useState<MarriageStat[]>([]);
  const [appointmentStats, setAppointmentStats] = useState<AppointmentStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [summaryData, marriageData, appointmentData] = await Promise.all([
          api.get<DashboardSummary>('/dashboard/summary'),
          api.get<MarriageStat[]>('/dashboard/marriage-stats'),
          api.get<AppointmentStat[]>('/dashboard/appointment-stats'),
        ]);
        setSummary(summaryData);
        setMarriageStats(marriageData);
        setAppointmentStats(appointmentData);
      } catch (err) {
        console.error('Erreur tableau de bord:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (isLoading) {
    return (
      <>
        <Header title="Tableau de bord" />
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" className="text-[#003B8E]" />
        </div>
      </>
    );
  }

  const isPastor = user?.role === 'PASTOR';

  return (
    <>
      <Header title="Tableau de bord" />
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-semibold text-[#1F2937]">
            Bonjour, <span className="text-[#003B8E]">{user?.email}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Voici un aperçu de l&apos;activité de l&apos;église.
          </p>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {!isPastor && (
              <StatCard
                title="Total fidèles"
                value={summary.totalMembers}
                icon={Users}
                color="#003B8E"
                subtitle={`${summary.activeMembers} actifs`}
              />
            )}
            <StatCard
              title="Dossiers en attente"
              value={summary.pendingRequests}
              icon={BookOpen}
              color="#F2B705"
              subtitle="À traiter"
            />
            <StatCard
              title="Rendez-vous à venir"
              value={summary.upcomingAppointments}
              icon={CalendarDays}
              color="#0057B8"
            />
            <StatCard
              title="Dossiers traités"
              value={summary.greenCount + summary.orangeCount + summary.redCount}
              icon={TrendingUp}
              color="#15803D"
              subtitle="Total classifiés"
            />
          </div>
        )}

        {/* Classification + Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {summary && <ClassificationBadges summary={summary} />}

          {/* Marriage chart */}
          {marriageStats.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Évolution des dossiers matrimoniaux</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={marriageStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F7FA" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="submitted" name="Soumis" fill="#003B8E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" name="Approuvés" fill="#15803D" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected" name="Rejetés" fill="#B91C1C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Appointments chart */}
        {!isPastor && appointmentStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Rendez-vous par mois</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={appointmentStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F7FA" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="scheduled"
                    name="Planifiés"
                    stroke="#0057B8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Terminés"
                    stroke="#15803D"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cancelled"
                    name="Annulés"
                    stroke="#B91C1C"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
