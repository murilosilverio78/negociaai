"use client";

import { useEffect, useState, useCallback } from "react";
import { MetricCard } from "@/components/credor/metric-card";
import { ChartCard } from "@/components/credor/chart-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Handshake, DollarSign, Receipt, Percent } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { exportToExcel } from "@/lib/export-utils";

interface ReportData {
  totalAcordos: number;
  valorTotal: number;
  ticketMedio: number;
  descontoMedio: number;
  chartData: { date: string; acordos: number }[];
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function RelatoriosPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/credor/relatorios?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleExport() {
    if (!data) return;
    exportToExcel(
      data.chartData.map((d) => ({
        Data: d.date,
        Acordos: d.acordos,
      })),
      "relatorio-acordos"
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <Button variant="outline" onClick={handleExport} disabled={!data}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      <div className="flex gap-3">
        <Input
          type="date"
          className="w-[160px]"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          type="date"
          className="w-[160px]"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Quantidade de Acordos"
              value={String(data.totalAcordos)}
              icon={Handshake}
            />
            <MetricCard
              title="Valor Total"
              value={formatCurrency(data.valorTotal)}
              icon={DollarSign}
            />
            <MetricCard
              title="Ticket Médio"
              value={formatCurrency(data.ticketMedio)}
              icon={Receipt}
            />
            <MetricCard
              title="Desconto Médio"
              value={`${data.descontoMedio.toFixed(1)}%`}
              icon={Percent}
            />
          </div>

          <ChartCard title="Evolução de Acordos">
            <div className="h-[300px]">
              {data.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chartData}>
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
                    <Line
                      type="monotone"
                      dataKey="acordos"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Nenhum dado para o período selecionado.
                </div>
              )}
            </div>
          </ChartCard>
        </>
      ) : null}
    </div>
  );
}
