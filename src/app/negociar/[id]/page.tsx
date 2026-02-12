"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Divida, Mensagem } from "@/lib/supabase";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

interface ConfigNegociacao {
  nome_assistente: string;
}

const defaultConfig: ConfigNegociacao = {
  nome_assistente: "Assistente Negocia Aí",
};

interface ChatResponse {
  resposta: string;
  acao: string | null;
  acordo: {
    valor_original: number;
    valor_acordo: number;
    desconto_percentual: number;
    numero_parcelas: number;
    valor_entrada: number;
    valor_parcela: number;
    opcao_escolhida: string;
  } | null;
}

export default function NegociarPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [divida, setDivida] = useState<Divida | null>(null);
  const [configCredor, setConfigCredor] = useState<ConfigNegociacao>(defaultConfig);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [inputMensagem, setInputMensagem] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [negociacaoId, setNegociacaoId] = useState<string | null>(null);
  const [acordoFechado, setAcordoFechado] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const adicionarMensagem = useCallback((remetente: "usuario" | "bot", conteudo: string) => {
    const novaMensagem: Mensagem = {
      id: Date.now().toString(),
      remetente,
      conteudo,
      timestamp: new Date(),
    };
    setMensagens((prev) => [...prev, novaMensagem]);
    return novaMensagem;
  }, []);

  const enviarParaChat = useCallback(async (mensagem: string, negId: string): Promise<ChatResponse> => {
    const fallback: ChatResponse = {
      resposta: "Desculpe, estou com dificuldades técnicas. Tente novamente em instantes.",
      acao: null,
      acordo: null,
    };
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem, negociacao_id: negId }),
      });
      const data = await res.json();
      console.log("[negociar] resposta da API /api/chat:", JSON.stringify(data));
      if (data.resposta) {
        return { resposta: data.resposta, acao: data.acao || null, acordo: data.acordo || null };
      }
      if (data.error) {
        console.error("[negociar] API retornou erro:", data.error);
      }
      return fallback;
    } catch (err) {
      console.error("[negociar] Erro ao chamar /api/chat:", err);
      return fallback;
    }
  }, []);

  const fecharAcordo = useCallback(async (
    dividaData: Divida,
    negId: string,
    acordoData: ChatResponse["acordo"]
  ) => {
    if (!acordoData) return;
    try {
      const res = await fetch("/api/public/acordo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          divida_id: dividaData.id,
          negociacao_id: negId,
          valor_original: acordoData.valor_original,
          valor_acordo: acordoData.valor_acordo,
          desconto_percentual: acordoData.desconto_percentual,
          numero_parcelas: acordoData.numero_parcelas,
          valor_entrada: acordoData.valor_entrada,
          valor_parcela: acordoData.valor_parcela,
          opcao_escolhida: acordoData.opcao_escolhida,
        }),
      });
      const data = await res.json();
      if (data.acordo) {
        setAcordoFechado(true);
        setTimeout(() => {
          router.push(`/acordo/${data.acordo.id}`);
        }, 3000);
      } else {
        console.error("[negociar] Erro ao fechar acordo:", data.error);
      }
    } catch (err) {
      console.error("[negociar] Erro ao fechar acordo:", err);
    }
  }, [router]);

  useEffect(() => {
    if (!id) {
      router.push("/consulta");
      return;
    }

    let cancelled = false;

    async function iniciar() {
      try {
        // Criar negociacao — retorna dados da divida junto
        const negRes = await fetch("/api/public/negociacao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ divida_id: id }),
        });
        const negData = await negRes.json();

        if (cancelled) return;

        if (!negRes.ok || !negData.negociacao_id || !negData.divida) {
          router.push("/consulta");
          return;
        }

        const dividaData = negData.divida as Divida;
        setDivida(dividaData);
        setNegociacaoId(negData.negociacao_id);

        // Extrair config do credor
        const credorConfig = dividaData.credor?.config_negociacao as Partial<ConfigNegociacao> | undefined;
        setConfigCredor({ ...defaultConfig, ...(credorConfig || {}) });

        // Enviar "oi" para iniciar conversa
        setIsSending(true);
        const chatRes = await enviarParaChat("oi", negData.negociacao_id);

        if (cancelled) return;

        const botMsg: Mensagem = {
          id: "1",
          remetente: "bot",
          conteudo: chatRes.resposta,
          timestamp: new Date(),
        };
        setMensagens([botMsg]);
        setIsSending(false);
      } catch {
        if (!cancelled) router.push("/consulta");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    iniciar();

    return () => { cancelled = true; };
  }, [id, router, enviarParaChat]);

  const processarResposta = async (mensagemUsuario: string) => {
    if (!divida || !negociacaoId) return;

    const chatRes = await enviarParaChat(mensagemUsuario, negociacaoId);
    adicionarMensagem("bot", chatRes.resposta);

    if (chatRes.acao === "confirmar_acordo" && chatRes.acordo) {
      await fecharAcordo(divida, negociacaoId, chatRes.acordo);
    }
  };

  const enviarMensagem = async () => {
    if (!inputMensagem.trim() || isSending) return;

    setIsSending(true);
    adicionarMensagem("usuario", inputMensagem);
    const msgTexto = inputMensagem;
    setInputMensagem("");

    await processarResposta(msgTexto);
    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
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

  if (!divida) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-100 flex flex-col">
        {/* Resumo da divida */}
        <div className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {divida.credor?.nome || "Credor"}
                  </h1>
                  <p className="text-sm text-muted-foreground">{divida.produto}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor da divida</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(divida.valor_atualizado)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Area do chat */}
        <div className="flex-1 container mx-auto px-4 py-4 flex flex-col max-w-2xl">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="bg-primary text-white py-3 px-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                {configCredor.nome_assistente || "Assistente de Negociacao"}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]">
                {mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.remetente === "usuario" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm ${
                        msg.remetente === "usuario"
                          ? "bg-[#dcf8c6] text-gray-900"
                          : "bg-white text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{renderMarkdown(msg.conteudo)}</p>
                      <p className="text-[10px] text-gray-500 text-right mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input de mensagem */}
              <div className="p-4 bg-gray-100 border-t">
                {acordoFechado ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-green-700 font-medium">
                      Acordo fechado com sucesso! Redirecionando...
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Digite sua mensagem..."
                      value={inputMensagem}
                      onChange={(e) => setInputMensagem(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button
                      onClick={enviarMensagem}
                      disabled={!inputMensagem.trim() || isSending}
                    >
                      Enviar
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
