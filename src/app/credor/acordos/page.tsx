"use client";

import { useEffect, useState, useCallback } from "react";
import { DataTable, type Column } from "@/components/credor/data-table";
import { DataTablePagination } from "@/components/credor/data-table-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { exportToExcel } from "@/lib/export-utils";

interface AcordoRow {
  id: string;
  valor_original: number;
  valor_acordo: number;
  desconto_percentual: number;
  numero_parcelas: number;
  status: string;
  created_at: string;
  divida?: {
    devedor?: { cpf: string; nome: string };
  };
  [key: string]: unknown;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatCPF(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

const statusColors: Record<string, string> = {
  ativo: "bg-green-100 text-green-800",
  pago: "bg-blue-100 text-blue-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function AcordosPage() {
  const [data, setData] = useState<AcordoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      status,
      from,
      to,
    });
    const res = await fetch(`/api/credor/acordos?${params}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [page, pageSize, status, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleExport() {
    const exportData = data.map((a) => ({
      CPF: a.divida?.devedor?.cpf ?? "",
      Nome: a.divida?.devedor?.nome ?? "",
      "Valor Original": a.valor_original,
      "Valor Acordo": a.valor_acordo,
      "Desconto (%)": a.desconto_percentual,
      Parcelas: a.numero_parcelas,
      Status: a.status,
      Data: new Date(a.created_at).toLocaleDateString("pt-BR"),
    }));
    exportToExcel(exportData, "acordos");
  }

  const columns: Column<AcordoRow>[] = [
    {
      key: "cpf",
      label: "CPF",
      render: (item) => formatCPF(item.divida?.devedor?.cpf ?? ""),
    },
    {
      key: "nome",
      label: "Nome",
      render: (item) => item.divida?.devedor?.nome ?? "-",
    },
    {
      key: "valor_original",
      label: "Valor Original",
      render: (item) => formatCurrency(item.valor_original),
    },
    {
      key: "valor_acordo",
      label: "Valor Acordo",
      render: (item) => formatCurrency(item.valor_acordo),
    },
    {
      key: "desconto_percentual",
      label: "Desconto %",
      render: (item) => `${item.desconto_percentual.toFixed(1)}%`,
    },
    {
      key: "numero_parcelas",
      label: "Parcelas",
      render: (item) => String(item.numero_parcelas),
    },
    {
      key: "status",
      label: "Status",
      render: (item) => (
        <Badge variant="secondary" className={statusColors[item.status] ?? ""}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "created_at",
      label: "Data",
      render: (item) => new Date(item.created_at).toLocaleDateString("pt-BR"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Acordos</h1>
        <Button variant="outline" onClick={handleExport} disabled={data.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-[160px]"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          className="w-[160px]"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable columns={columns} data={data} loading={loading} />

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />
    </div>
  );
}
