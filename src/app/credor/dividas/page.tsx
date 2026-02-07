"use client";

import { useEffect, useState, useCallback } from "react";
import { DataTable, type Column } from "@/components/credor/data-table";
import { DataTablePagination } from "@/components/credor/data-table-pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface DividaRow {
  id: string;
  valor_original: number;
  valor_atualizado: number;
  produto: string;
  data_vencimento: string;
  status: string;
  devedor?: { cpf: string; nome: string };
  [key: string]: unknown;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatCPF(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  em_negociacao: "bg-blue-100 text-blue-800",
  acordo_fechado: "bg-green-100 text-green-800",
};

export default function DividasPage() {
  const [data, setData] = useState<DividaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      status,
      sort: sortKey,
      dir: sortDir,
    });
    const res = await fetch(`/api/credor/dividas?${params}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [page, pageSize, search, status, sortKey, sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear selection when page, filters, or sort change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, search, status, sortKey, sortDir]);

  async function handleDelete(id: string) {
    await fetch(`/api/credor/dividas/${id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/credor/dividas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`${json.count} dívida(s) excluída(s) com sucesso.`);
        setSelectedIds(new Set());
        fetchData();
      } else {
        toast.error(json.error || "Erro ao excluir dívidas.");
      }
    } catch {
      toast.error("Erro ao excluir dívidas.");
    } finally {
      setBulkDeleting(false);
      setBulkDialogOpen(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (data.length > 0 && data.every((d) => selectedIds.has(d.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((d) => d.id)));
    }
  }

  const allSelected = data.length > 0 && data.every((d) => selectedIds.has(d.id));
  const someSelected = data.some((d) => selectedIds.has(d.id)) && !allSelected;

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const columns: Column<DividaRow>[] = [
    {
      key: "select",
      label: "",
      render: (item) => (
        <Checkbox
          checked={selectedIds.has(item.id)}
          onCheckedChange={() => toggleSelect(item.id)}
          aria-label={`Selecionar dívida ${item.id}`}
        />
      ),
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={toggleSelectAll}
          aria-label="Selecionar todas"
        />
      ),
    },
    {
      key: "cpf",
      label: "CPF",
      render: (item) => formatCPF(item.devedor?.cpf ?? ""),
    },
    {
      key: "nome",
      label: "Nome",
      render: (item) => item.devedor?.nome ?? "-",
    },
    {
      key: "valor_original",
      label: "Valor Original",
      sortable: true,
      render: (item) => formatCurrency(item.valor_original),
    },
    {
      key: "valor_atualizado",
      label: "Valor Atualizado",
      sortable: true,
      render: (item) => formatCurrency(item.valor_atualizado),
    },
    { key: "produto", label: "Produto" },
    {
      key: "data_vencimento",
      label: "Vencimento",
      sortable: true,
      render: (item) =>
        new Date(item.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR"),
    },
    {
      key: "status",
      label: "Status",
      render: (item) => (
        <Badge variant="secondary" className={statusColors[item.status] ?? ""}>
          {item.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Ações",
      render: (item) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir dívida?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação irá remover a dívida da listagem. Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(item.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dívidas</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
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
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_negociacao">Em Negociação</SelectItem>
            <SelectItem value="acordo_fechado">Acordo Fechado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedIds.size} dívida(s) selecionada(s)
          </span>
          <AlertDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir ({selectedIds.size})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {selectedIds.size} dívida(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação irá remover {selectedIds.size} dívida(s) da listagem. Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Limpar seleção
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onSort={handleSort}
      />

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
