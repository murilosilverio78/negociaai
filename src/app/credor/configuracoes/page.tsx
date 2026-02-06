"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Send } from "lucide-react";

interface Config {
  desconto_max_avista: number;
  desconto_max_parcelado: number;
  faixa_0_30: number;
  faixa_31_90: number;
  faixa_91_180: number;
  faixa_180_plus: number;
  max_parcelas: number;
  valor_min_parcela: number;
  entrada_minima: number;
  parcelas_faixa_0_30: number;
  parcelas_faixa_31_90: number;
  parcelas_faixa_91_180: number;
  parcelas_faixa_180_plus: number;
  mensagem_boas_vindas: string;
  nome_assistente: string;
}

interface WebhookConfig {
  url: string;
  token: string;
  evento_acordo_criado: boolean;
  evento_pagamento: boolean;
  evento_cancelamento: boolean;
}

const defaultConfig: Config = {
  desconto_max_avista: 30,
  desconto_max_parcelado: 15,
  faixa_0_30: 5,
  faixa_31_90: 10,
  faixa_91_180: 20,
  faixa_180_plus: 30,
  max_parcelas: 12,
  valor_min_parcela: 50,
  entrada_minima: 10,
  parcelas_faixa_0_30: 3,
  parcelas_faixa_31_90: 6,
  parcelas_faixa_91_180: 9,
  parcelas_faixa_180_plus: 12,
  mensagem_boas_vindas: "Olá! Vamos negociar sua dívida?",
  nome_assistente: "Assistente Negocia Aí",
};

const defaultWebhook: WebhookConfig = {
  url: "",
  token: "",
  evento_acordo_criado: true,
  evento_pagamento: true,
  evento_cancelamento: false,
};

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [webhook, setWebhook] = useState<WebhookConfig>(defaultWebhook);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/credor/configuracoes")
      .then((r) => r.json())
      .then((data) => {
        if (data.config_negociacao && Object.keys(data.config_negociacao).length > 0) {
          setConfig({ ...defaultConfig, ...data.config_negociacao });
        }
        if (data.webhook_config && Object.keys(data.webhook_config).length > 0) {
          setWebhook({ ...defaultWebhook, ...data.webhook_config });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/credor/configuracoes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config_negociacao: config,
        webhook_config: webhook,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleTestWebhook() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/credor/webhook/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhook.url, token: webhook.token }),
    });
    const data = await res.json();
    setTestResult(
      data.success
        ? `Sucesso! Status: ${data.status}`
        : `Falha: ${data.error || data.statusText}`
    );
    setTesting(false);
  }

  function updateConfig<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
        </Button>
      </div>

      <Tabs defaultValue="descontos">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="descontos">Descontos</TabsTrigger>
          <TabsTrigger value="parcelamento">Parcelamento</TabsTrigger>
          <TabsTrigger value="personalizacao">Personalização</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="descontos">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Descontos</CardTitle>
              <CardDescription>
                Defina os descontos máximos e por faixa de atraso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Desconto Máximo À Vista (%)</Label>
                  <Input
                    type="number"
                    value={config.desconto_max_avista}
                    onChange={(e) =>
                      updateConfig("desconto_max_avista", Number(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto Máximo Parcelado (%)</Label>
                  <Input
                    type="number"
                    value={config.desconto_max_parcelado}
                    onChange={(e) =>
                      updateConfig("desconto_max_parcelado", Number(e.target.value))
                    }
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-3">Desconto por Faixa de Atraso (%)</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {([
                    ["faixa_0_30", "0-30 dias"],
                    ["faixa_31_90", "31-90 dias"],
                    ["faixa_91_180", "91-180 dias"],
                    ["faixa_180_plus", "180+ dias"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Input
                        type="number"
                        value={config[key]}
                        onChange={(e) =>
                          updateConfig(key, Number(e.target.value))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parcelamento">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Parcelamento</CardTitle>
              <CardDescription>
                Defina limites de parcelas e valores mínimos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Máximo de Parcelas</Label>
                  <Input
                    type="number"
                    value={config.max_parcelas}
                    onChange={(e) =>
                      updateConfig("max_parcelas", Number(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Mínimo Parcela (R$)</Label>
                  <Input
                    type="number"
                    value={config.valor_min_parcela}
                    onChange={(e) =>
                      updateConfig("valor_min_parcela", Number(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entrada Mínima (%)</Label>
                  <Input
                    type="number"
                    value={config.entrada_minima}
                    onChange={(e) =>
                      updateConfig("entrada_minima", Number(e.target.value))
                    }
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-3">Parcelas por Faixa de Atraso</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {([
                    ["parcelas_faixa_0_30", "0-30 dias"],
                    ["parcelas_faixa_31_90", "31-90 dias"],
                    ["parcelas_faixa_91_180", "91-180 dias"],
                    ["parcelas_faixa_180_plus", "180+ dias"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Input
                        type="number"
                        value={config[key]}
                        onChange={(e) =>
                          updateConfig(key, Number(e.target.value))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personalizacao">
          <Card>
            <CardHeader>
              <CardTitle>Personalização</CardTitle>
              <CardDescription>
                Customize a experiência do devedor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Assistente</Label>
                <Input
                  value={config.nome_assistente}
                  onChange={(e) =>
                    updateConfig("nome_assistente", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem de Boas-Vindas</Label>
                <Textarea
                  rows={4}
                  value={config.mensagem_boas_vindas}
                  onChange={(e) =>
                    updateConfig("mensagem_boas_vindas", e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Configure notificações em tempo real para eventos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <Input
                  placeholder="https://seu-servidor.com/webhook"
                  value={webhook.url}
                  onChange={(e) =>
                    setWebhook((p) => ({ ...p, url: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Token de Autenticação</Label>
                <Input
                  placeholder="Bearer token (opcional)"
                  value={webhook.token}
                  onChange={(e) =>
                    setWebhook((p) => ({ ...p, token: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Eventos</p>
                {([
                  ["evento_acordo_criado", "Acordo Criado"],
                  ["evento_pagamento", "Pagamento Recebido"],
                  ["evento_cancelamento", "Acordo Cancelado"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch
                      checked={webhook[key]}
                      onCheckedChange={(v) =>
                        setWebhook((p) => ({ ...p, [key]: v }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={!webhook.url || testing}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {testing ? "Testando..." : "Testar Webhook"}
                </Button>
                {testResult && (
                  <span className="text-sm text-muted-foreground">
                    {testResult}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
