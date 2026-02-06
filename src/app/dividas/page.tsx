"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Divida } from "@/lib/supabase";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function calcularDiasAtraso(dataVencimento: string): number {
  const vencimento = new Date(dataVencimento);
  const hoje = new Date();
  const diffTime = hoje.getTime() - vencimento.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function DividasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cpf = searchParams.get("cpf");

  const [dividas, setDividas] = useState<Divida[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!cpf) {
      router.push("/consulta");
      return;
    }

    async function fetchDividas() {
      try {
        const cpfDigits = cpf!.replace(/\D/g, "");
        const res = await fetch(`/api/public/dividas?cpf=${cpfDigits}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Erro ao buscar dívidas");
        }

        setDividas(data.dividas || []);
      } catch {
        setError("Erro ao carregar as dívidas. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDividas();
  }, [cpf, router]);

  const handleNegociar = (dividaId: string) => {
    router.push(`/negociar/${dividaId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 text-center">
        <p className="text-lg text-muted-foreground">Carregando dívidas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 text-center">
        <p className="text-lg text-red-500">{error}</p>
        <Button className="mt-4" onClick={() => router.push("/consulta")}>
          Voltar para consulta
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Suas Dívidas</h1>
          <p className="text-muted-foreground mt-2">
            CPF: {cpf || ""}
          </p>
        </div>

        {dividas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma dívida encontrada para este CPF.
              </p>
              <Button className="mt-4" onClick={() => router.push("/consulta")}>
                Nova consulta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {dividas.map((divida) => {
              const diasAtraso = calcularDiasAtraso(divida.data_vencimento);
              return (
                <Card key={divida.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 border-b py-4">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {divida.credor?.nome || "Credor"}
                    </CardTitle>
                    {divida.produto && (
                      <p className="text-sm text-muted-foreground">{divida.produto}</p>
                    )}
                  </CardHeader>
                  <CardContent className="py-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Original</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(divida.valor_original)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Atualizado</p>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(divida.valor_atualizado)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Dias em Atraso</p>
                        <p className="font-medium text-orange-600">
                          {diasAtraso} dias
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full md:w-auto"
                      onClick={() => handleNegociar(divida.id)}
                    >
                      Negociar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Total de {dividas.length} dívida{dividas.length > 1 ? "s" : ""} encontrada{dividas.length > 1 ? "s" : ""}
              </p>
              <Button variant="outline" onClick={() => router.push("/consulta")}>
                Nova consulta
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="container mx-auto px-4 text-center">
      <p className="text-lg text-muted-foreground">Carregando...</p>
    </div>
  );
}

export default function DividasPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-12">
        <Suspense fallback={<LoadingFallback />}>
          <DividasContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
