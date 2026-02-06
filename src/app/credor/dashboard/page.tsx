"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/credor/metric-card";
import { ChartCard } from "@/components/credor/chart-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Handshake,
  TrendingUp,
  DollarSign,
  CircleDollarSign,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  totalDividas: number;
  totalAcordos: number;
  taxaConversao: string;
  valorDividas: number;
  valorRecuperado: number;
  valorARecuperar: number;
  chartData: { date: string; acordos: number }[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/credor/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Dívidas"
          value={String(data.totalDividas)}
          icon={FileText}
        />
        <MetricCard
          title="Acordos Fechados"
          value={String(data.totalAcordos)}
          icon={Handshake}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${data.taxaConversao}%`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Valor em Dívidas"
          value={formatCurrency(data.valorDividas)}
          icon={DollarSign}
        />
        <MetricCard
          title="Valor Recuperado"
          value={formatCurrency(data.valorRecuperado)}
          icon={CircleDollarSign}
        />
        <MetricCard
          title="Valor a Recuperar"
          value={formatCurrency(data.valorARecuperar)}
          icon={Wallet}
        />
      </div>

      <ChartCard title="Acordos por Dia (últimos 30 dias)">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) =>
                  new Date(v + "T12:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })
                }
                fontSize={12}
              />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip
                labelFormatter={(v) =>
                  new Date(v + "T12:00:00").toLocaleDateString("pt-BR")
                }
              />
              <Bar dataKey="acordos" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
