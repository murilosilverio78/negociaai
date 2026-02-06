"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

function validateCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, "");
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== parseInt(numbers[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== parseInt(numbers[10])) return false;

  return true;
}

export default function ConsultaPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<null | { found: boolean; message: string; count?: number }>(null);

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    if (formatted.length <= 14) {
      setCpf(formatted);
      setError("");
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!validateCPF(cpf)) {
      setError("CPF inválido. Verifique o número informado.");
      return;
    }

    setIsLoading(true);

    try {
      const cpfDigits = cpf.replace(/\D/g, "");
      const res = await fetch(`/api/public/dividas?cpf=${cpfDigits}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao consultar");
      }

      if (data.count > 0) {
        setResult({
          found: true,
          message: `Encontramos ${data.count} dívida${data.count > 1 ? "s" : ""} disponíve${data.count > 1 ? "is" : "l"} para negociação!`,
          count: data.count,
        });
      } else {
        setResult({
          found: false,
          message: "Nenhuma dívida encontrada para este CPF.",
        });
      }
    } catch {
      setError("Erro ao consultar. Tente novamente mais tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerOfertas = () => {
    const cpfDigits = cpf.replace(/\D/g, "");
    router.push(`/dividas?cpf=${cpfDigits}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Consultar CPF</CardTitle>
                <CardDescription>
                  Digite seu CPF para verificar se há dívidas disponíveis para negociação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={handleCPFChange}
                      className={error ? "border-red-500" : ""}
                    />
                    {error && (
                      <p className="text-sm text-red-500">{error}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Consultando..." : "Consultar"}
                  </Button>
                </form>

                {result && result.found && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">{result.message}</p>
                    <Button className="w-full mt-4" variant="default" onClick={handleVerOfertas}>
                      Ver ofertas disponíveis
                    </Button>
                  </div>
                )}

                {result && !result.found && (
                  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-700">{result.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Seus dados estão protegidos e não serão compartilhados.</p>
              <p className="mt-2">
                Ao consultar, você concorda com nossos{" "}
                <a href="#" className="text-primary hover:underline">
                  Termos de Uso
                </a>{" "}
                e{" "}
                <a href="#" className="text-primary hover:underline">
                  Política de Privacidade
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
