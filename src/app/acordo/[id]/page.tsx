"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Acordo, Parcela } from "@/lib/supabase";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR");
}

export default function AcordoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [acordo, setAcordo] = useState<Acordo | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mostrarBoleto, setMostrarBoleto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const codigoBarras =
    "23793.38128 60000.000003 00000.000402 1 84340000012345";

  useEffect(() => {
    if (!id) {
      router.push("/");
      return;
    }

    async function fetchAcordo() {
      try {
        const res = await fetch(`/api/public/acordo?id=${id}`);
        const data = await res.json();

        if (!res.ok || !data.acordo) {
          console.error("Acordo não encontrado");
          router.push("/");
          return;
        }

        setAcordo(data.acordo);
        setParcelas(data.parcelas || []);
      } catch (err) {
        console.error("Erro ao buscar acordo:", err);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAcordo();
  }, [id, router]);

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(codigoBarras);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = codigoBarras;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Carregando...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!acordo) {
    return null;
  }

  const primeiraParcela = parcelas[0];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Mensagem de Sucesso */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-green-700 mb-2">
              Acordo fechado!
            </h1>
            <p className="text-muted-foreground">
              Seu acordo foi registrado com sucesso. Confira os detalhes abaixo.
            </p>
          </div>

          {/* Resumo do Acordo */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Resumo do Acordo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Valor total</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(acordo.valor_acordo)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Valor original
                  </p>
                  <p className="text-lg text-muted-foreground line-through">
                    {formatCurrency(acordo.valor_original)}
                  </p>
                </div>
              </div>

              {acordo.desconto_percentual > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">
                    Desconto de {acordo.desconto_percentual}% aplicado — Economia
                    de{" "}
                    {formatCurrency(
                      acordo.valor_original - acordo.valor_acordo
                    )}
                  </p>
                </div>
              )}

              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Parcelas</p>
                  <p className="text-lg font-semibold">
                    {acordo.numero_parcelas}x de{" "}
                    {formatCurrency(acordo.valor_parcela)}
                  </p>
                </div>
                {primeiraParcela && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      1o vencimento
                    </p>
                    <p className="text-lg font-semibold">
                      {formatDate(primeiraParcela.data_vencimento)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Parcelas */}
          {parcelas.length > 1 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Parcelas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {parcelas.map((parcela) => (
                    <div
                      key={parcela.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                          {parcela.numero}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Vencimento: {formatDate(parcela.data_vencimento)}
                        </span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(parcela.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão Gerar Boleto */}
          {!mostrarBoleto && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                  onClick={() => setMostrarBoleto(true)}
                >
                  Gerar Boleto
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Boleto Fake */}
          {mostrarBoleto && primeiraParcela && (
            <Card className="mb-6 border-2 border-gray-300">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Boleto Bancario
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Valor
                    </p>
                    <p className="text-xl font-bold">
                      {formatCurrency(primeiraParcela.valor)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Vencimento
                    </p>
                    <p className="text-xl font-bold">
                      {formatDate(primeiraParcela.data_vencimento)}
                    </p>
                  </div>
                </div>

                {acordo.numero_parcelas > 1 && (
                  <p className="text-sm text-muted-foreground">
                    Parcela 1 de {acordo.numero_parcelas}
                  </p>
                )}

                {/* Codigo de barras visual */}
                <div className="border rounded-lg p-4 bg-white">
                  <div className="flex justify-center mb-3">
                    <div className="flex gap-[1px] h-12">
                      {Array.from({ length: 50 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-black"
                          style={{
                            width: [0, 3, 7, 12, 15, 20, 25, 30, 35, 40, 45].includes(i)
                              ? "3px"
                              : "1px",
                            opacity: i % 4 === 0 ? 0.3 : 1,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-center font-mono text-sm tracking-wider text-gray-700 break-all">
                    {codigoBarras}
                  </p>
                </div>

                <Button
                  className="w-full"
                  variant={copiado ? "outline" : "default"}
                  onClick={copiarCodigo}
                >
                  {copiado ? "Codigo copiado!" : "Copiar codigo"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Botão Voltar */}
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/")}
            >
              Voltar ao inicio
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
