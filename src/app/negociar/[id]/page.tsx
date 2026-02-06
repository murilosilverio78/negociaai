"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { supabase, Divida, Mensagem } from "@/lib/supabase";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface OpcaoAcordo {
  id: string;
  titulo: string;
  descricao: string;
  parcelas: number;
  desconto: number;
  valorParcela: number;
  valorTotal: number;
}

export default function NegociarPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [divida, setDivida] = useState<Divida | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [inputMensagem, setInputMensagem] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [negociacaoId, setNegociacaoId] = useState<string | null>(null);
  const [opcaoEscolhida, setOpcaoEscolhida] = useState<OpcaoAcordo | null>(null);
  const [mostrarBotaoFechar, setMostrarBotaoFechar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const calcularOpcoes = (valorAtualizado: number): OpcaoAcordo[] => {
    return [
      {
        id: "avista",
        titulo: "A Vista",
        descricao: "Pagamento único com 40% de desconto",
        parcelas: 1,
        desconto: 40,
        valorParcela: valorAtualizado * 0.6,
        valorTotal: valorAtualizado * 0.6,
      },
      {
        id: "6x",
        titulo: "Em 6x",
        descricao: "6 parcelas com 20% de desconto",
        parcelas: 6,
        desconto: 20,
        valorParcela: (valorAtualizado * 0.8) / 6,
        valorTotal: valorAtualizado * 0.8,
      },
      {
        id: "12x",
        titulo: "Em 12x",
        descricao: "12 parcelas sem desconto",
        parcelas: 12,
        desconto: 0,
        valorParcela: valorAtualizado / 12,
        valorTotal: valorAtualizado,
      },
    ];
  };

  const adicionarMensagem = (remetente: "usuario" | "bot", conteudo: string) => {
    const novaMensagem: Mensagem = {
      id: Date.now().toString(),
      remetente,
      conteudo,
      timestamp: new Date(),
    };
    setMensagens((prev) => [...prev, novaMensagem]);
    return novaMensagem;
  };

  const atualizarNegociacao = async (negId: string, campos: Record<string, unknown>) => {
    try {
      const { error } = await supabase
        .from("negociacoes")
        .update(campos)
        .eq("id", negId);

      if (error) {
        console.warn("Aviso ao atualizar negociação:", error.message);
      }
    } catch (error) {
      console.warn("Aviso ao atualizar negociação:", error);
    }
  };

  const iniciarNegociacao = async (dividaData: Divida) => {
    // Criar registro de negociação no Supabase (apenas colunas essenciais)
    const { data: negociacao, error } = await supabase
      .from("negociacoes")
      .insert({
        divida_id: dividaData.id,
        status: "em_andamento",
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar negociação:", error);
      // Mesmo sem registro no banco, permitir o chat funcionar localmente
    }

    if (negociacao) {
      setNegociacaoId(negociacao.id);
    }

    // Mensagem de boas-vindas
    const bemVindo: Mensagem = {
      id: "1",
      remetente: "bot",
      conteudo: `Olá! Sou o assistente de negociação do Negocia Aí. Vi que você tem uma dívida de ${formatCurrency(dividaData.valor_atualizado)} com ${dividaData.credor?.nome || "o credor"}. Como posso ajudá-lo hoje?`,
      timestamp: new Date(),
    };

    const opcoesMensagem: Mensagem = {
      id: "2",
      remetente: "bot",
      conteudo: `Tenho ótimas opções de acordo para você:\n\n1️⃣ **À Vista** - ${formatCurrency(dividaData.valor_atualizado * 0.6)} (40% de desconto!)\n\n2️⃣ **6x de ${formatCurrency((dividaData.valor_atualizado * 0.8) / 6)}** - Total: ${formatCurrency(dividaData.valor_atualizado * 0.8)} (20% de desconto)\n\n3️⃣ **12x de ${formatCurrency(dividaData.valor_atualizado / 12)}** - Total: ${formatCurrency(dividaData.valor_atualizado)} (sem desconto)\n\nDigite o número da opção que deseja (1, 2 ou 3) ou me pergunte mais detalhes!`,
      timestamp: new Date(),
    };

    setMensagens([bemVindo, opcoesMensagem]);
  };

  useEffect(() => {
    if (!id) {
      router.push("/consulta");
      return;
    }

    async function fetchDivida() {
      try {
        const { data, error } = await supabase
          .from("dividas")
          .select(`
            *,
            credor:credores(id, nome, cnpj, email)
          `)
          .eq("id", id)
          .single();

        if (error || !data) {
          console.error("Dívida não encontrada:", error);
          router.push("/consulta");
          return;
        }

        setDivida(data);
        await iniciarNegociacao(data);
      } catch (err) {
        console.error("Erro ao buscar dívida:", err);
        router.push("/consulta");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDivida();
  }, [id, router]);

  const processarResposta = async (mensagemUsuario: string) => {
    if (!divida) return;

    const opcoes = calcularOpcoes(divida.valor_atualizado);
    const msgLower = mensagemUsuario.toLowerCase().trim();

    let respostaBot = "";
    let opcaoSelecionada: OpcaoAcordo | null = null;

    // Verificar se usuário escolheu uma opção
    if (msgLower === "1" || msgLower.includes("vista") || msgLower.includes("à vista")) {
      opcaoSelecionada = opcoes[0];
      respostaBot = `Excelente escolha! Você optou pelo pagamento **à vista** com 40% de desconto.\n\n💰 **Valor: ${formatCurrency(opcaoSelecionada.valorTotal)}**\n\nEssa é a melhor economia! Você está pronto para fechar o acordo?`;
    } else if (msgLower === "2" || msgLower.includes("6x") || msgLower.includes("6 x") || msgLower.includes("seis")) {
      opcaoSelecionada = opcoes[1];
      respostaBot = `Ótima escolha! Você optou por **6 parcelas** com 20% de desconto.\n\n💳 **6x de ${formatCurrency(opcaoSelecionada.valorParcela)}**\n💰 **Total: ${formatCurrency(opcaoSelecionada.valorTotal)}**\n\nVocê está pronto para fechar o acordo?`;
    } else if (msgLower === "3" || msgLower.includes("12x") || msgLower.includes("12 x") || msgLower.includes("doze")) {
      opcaoSelecionada = opcoes[2];
      respostaBot = `Entendido! Você optou por **12 parcelas**.\n\n💳 **12x de ${formatCurrency(opcaoSelecionada.valorParcela)}**\n💰 **Total: ${formatCurrency(opcaoSelecionada.valorTotal)}**\n\nVocê está pronto para fechar o acordo?`;
    } else if (msgLower.includes("desconto") || msgLower.includes("menor") || msgLower.includes("melhor")) {
      respostaBot = `A melhor opção em termos de economia é o **pagamento à vista** com 40% de desconto! Você pagaria apenas ${formatCurrency(opcoes[0].valorTotal)} em vez de ${formatCurrency(divida.valor_atualizado)}.\n\nDeseja escolher essa opção? Digite "1" para confirmar.`;
    } else if (msgLower.includes("parcela") || msgLower.includes("dividir")) {
      respostaBot = `Temos duas opções de parcelamento:\n\n📌 **6x de ${formatCurrency(opcoes[1].valorParcela)}** - com 20% de desconto (total: ${formatCurrency(opcoes[1].valorTotal)})\n\n📌 **12x de ${formatCurrency(opcoes[2].valorParcela)}** - sem desconto (total: ${formatCurrency(opcoes[2].valorTotal)})\n\nQual prefere? Digite "2" para 6x ou "3" para 12x.`;
    } else if (msgLower.includes("sim") || msgLower.includes("fechar") || msgLower.includes("confirmar") || msgLower.includes("aceito")) {
      if (opcaoEscolhida) {
        respostaBot = `Perfeito! Clique no botão abaixo para finalizar seu acordo.`;
        setMostrarBotaoFechar(true);
      } else {
        respostaBot = `Primeiro escolha uma das opções de pagamento:\n\n1️⃣ À Vista (40% desconto)\n2️⃣ 6x (20% desconto)\n3️⃣ 12x (sem desconto)\n\nDigite o número da opção desejada.`;
      }
    } else {
      respostaBot = `Desculpe, não entendi. Por favor, escolha uma das opções:\n\n1️⃣ À Vista - ${formatCurrency(opcoes[0].valorTotal)} (40% off)\n2️⃣ 6x de ${formatCurrency(opcoes[1].valorParcela)} (20% off)\n3️⃣ 12x de ${formatCurrency(opcoes[2].valorParcela)}\n\nDigite 1, 2 ou 3 para escolher.`;
    }

    if (opcaoSelecionada) {
      setOpcaoEscolhida(opcaoSelecionada);
      setMostrarBotaoFechar(true);
    }

    // Simular delay de resposta
    await new Promise((resolve) => setTimeout(resolve, 1000));

    adicionarMensagem("bot", respostaBot);
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

  const fecharAcordo = async () => {
    if (!opcaoEscolhida || !divida) return;

    try {
      // Se não temos negociacaoId (insert inicial falhou), criar agora
      let negId = negociacaoId;
      if (!negId) {
        const { data: negociacao, error: negError } = await supabase
          .from("negociacoes")
          .insert({
            divida_id: divida.id,
            status: "em_andamento",
          })
          .select()
          .single();

        if (negError || !negociacao) {
          console.error("Erro ao criar negociação:", negError);
          adicionarMensagem("bot", "Erro ao processar o acordo. Tente novamente.");
          return;
        }
        negId = negociacao.id;
        setNegociacaoId(negId);
      }

      // 1. Salvar acordo na tabela "acordos"
      const { data: acordo, error: acordoError } = await supabase
        .from("acordos")
        .insert({
          divida_id: divida.id,
          negociacao_id: negId,
          valor_original: divida.valor_atualizado,
          valor_acordo: opcaoEscolhida.valorTotal,
          desconto_percentual: opcaoEscolhida.desconto,
          numero_parcelas: opcaoEscolhida.parcelas,
          valor_parcela: opcaoEscolhida.valorParcela,
          opcao_escolhida: opcaoEscolhida.id,
          status: "ativo",
        })
        .select()
        .single();

      if (acordoError || !acordo) {
        console.error("Erro ao criar acordo:", acordoError);
        adicionarMensagem("bot", "Erro ao criar o acordo. Tente novamente.");
        return;
      }

      // 2. Gerar e salvar parcelas
      const parcelas = [];
      const hoje = new Date();
      for (let i = 0; i < opcaoEscolhida.parcelas; i++) {
        const dataVencimento = new Date(hoje);
        dataVencimento.setDate(dataVencimento.getDate() + 10 + i * 30);
        parcelas.push({
          acordo_id: acordo.id,
          numero: i + 1,
          valor: opcaoEscolhida.valorParcela,
          data_vencimento: dataVencimento.toISOString().split("T")[0],
          status: "pendente",
        });
      }

      const { error: parcelasError } = await supabase.from("parcelas").insert(parcelas);
      if (parcelasError) {
        console.error("Erro ao criar parcelas:", parcelasError);
      }

      // 3. Atualizar status da negociação
      await atualizarNegociacao(negId!, {
        status: "acordo_fechado",
        opcao_escolhida: opcaoEscolhida.id,
        valor_acordo: opcaoEscolhida.valorTotal,
      });

      // 4. Atualizar status da dívida para "acordo"
      await supabase
        .from("dividas")
        .update({ status: "acordo" })
        .eq("id", id);

      // 5. Mensagem final e redirecionar
      adicionarMensagem("bot", "Acordo fechado com sucesso! Redirecionando...");

      setTimeout(() => {
        router.push(`/acordo/${acordo.id}`);
      }, 1500);
    } catch (error) {
      console.error("Erro ao fechar acordo:", error);
      adicionarMensagem("bot", "Ocorreu um erro ao fechar o acordo. Tente novamente.");
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
        {/* Resumo da dívida */}
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
                  <p className="text-sm text-muted-foreground">Valor da dívida</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(divida.valor_atualizado)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Área do chat */}
        <div className="flex-1 container mx-auto px-4 py-4 flex flex-col max-w-2xl">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="bg-primary text-white py-3 px-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Assistente de Negociação
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
                      <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
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

              {/* Botão de fechar acordo */}
              {mostrarBotaoFechar && opcaoEscolhida && (
                <div className="p-4 bg-green-50 border-t border-green-200">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                    onClick={fecharAcordo}
                  >
                    Fechar Acordo - {formatCurrency(opcaoEscolhida.valorTotal)}
                    {opcaoEscolhida.parcelas > 1 && ` (${opcaoEscolhida.parcelas}x)`}
                  </Button>
                </div>
              )}

              {/* Input de mensagem */}
              <div className="p-4 bg-gray-100 border-t">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Digite sua mensagem..."
                    value={inputMensagem}
                    onChange={(e) => setInputMensagem(e.target.value)}
                    onKeyPress={handleKeyPress}
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
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
