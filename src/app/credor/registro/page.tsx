"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus } from "lucide-react";

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function CredorRegistroPage() {
  const router = useRouter();
  const supabase = createClient();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cnpjDigits = cnpj.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      setError("CNPJ deve ter 14 dígitos.");
      setLoading(false);
      return;
    }

    // Register via server-side API route (bypasses RLS)
    const res = await fetch("/api/credor/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, cnpj: cnpjDigits, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erro ao registrar.");
      setLoading(false);
      return;
    }

    // Sign in after successful registration
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Account was created, but auto-login failed — redirect to login
      router.push("/credor/login");
      return;
    }

    router.push("/credor/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
          <CardDescription>
            Registre sua empresa no Portal do Credor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Empresa</Label>
              <Input
                id="nome"
                placeholder="Empresa LTDA"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contato@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              <UserPlus className="mr-2 h-4 w-4" />
              {loading ? "Registrando..." : "Criar Conta"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link
              href="/credor/login"
              className="text-primary hover:underline font-medium"
            >
              Fazer login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
