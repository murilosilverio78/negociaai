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

interface ConfigNegociacao {
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

const defaultConfig: ConfigNegociacao = {
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

interface OpcaoAcordo {
  id: string;
  titulo: string;
  descricao: string;
  parcelas: number;
  desconto: number;
  valorParcela: number;
  valorTotal: number;
  entrada?: number;
}

function calcularDiasAtraso(dataVencimento: string): number {
  const vencimento = new Date(dataVencimento);
  const hoje = new Date();
  const diffMs = hoje.getTime() - vencimento.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getDescontoPorFaixa(diasAtraso: number, config: ConfigNegociacao): number {
  if (diasAtraso <= 30) return config.faixa_0_30;
  if (diasAtraso <= 90) return config.faixa_31_90;
  if (diasAtraso <= 180) return config.faixa_91_180;
  return config.faixa_180_plus;
}

function getMaxParcelasPorFaixa(diasAtraso: number, config: ConfigNegociacao): number {
  if (diasAtraso <= 30) return config.parcelas_faixa_0_30;
  if (diasAtraso <= 90) return config.parcelas_faixa_31_90;
  if (diasAtraso <= 180) return config.parcelas_faixa_91_180;
  return config.parcelas_faixa_180_plus;
}

function calcularOpcoesDinamicas(
  valorAtualizado: number,
  dataVencimento: string,
  config: ConfigNegociacao
): OpcaoAcordo[] {
  const diasAtraso = calcularDiasAtraso(dataVencimento);
  const descontoFaixa = getDescontoPorFaixa(diasAtraso, config);

  // Desconto à vista: o menor entre desconto_max_avista e o desconto da faixa
  const descontoAvista = Math.min(config.desconto_max_avista, descontoFaixa);
  const valorAvista = valorAtualizado * (1 - descontoAvista / 100);

  const opcoes: OpcaoAcordo[] = [
    {
      id: "avista",
      titulo: "À Vista",
      descricao: `Pagamento único com ${descontoAvista}% de desconto`,
      parcelas: 1,
      desconto: descontoAvista,
      valorParcela: valorAvista,
      valorTotal: valorAvista,
    },
  ];

  // Calcular opções de parcelamento
  const descontoParcelado = Math.min(config.desconto_max_parcelado, descontoFaixa);
  const maxParcelas = getMaxParcelasPorFaixa(diasAtraso, config);
  const entradaMinima = config.entrada_minima;
  const valorMinParcela = config.valor_min_parcela;

  // Gerar opção de parcelamento intermediário (metade das parcelas max)
  const parcelasMetade = Math.max(2, Math.floor(maxParcelas / 2));
  // Gerar opção de parcelamento máximo
  const parcelasMax = Math.max(2, maxParcelas);

  const opcoesParcelamento = [parcelasMetade, parcelasMax].filter(
    (p, i, arr) => arr.indexOf(p) === i && p > 1
  );

  for (const numParcelas of opcoesParcelamento) {
    const valorComDesconto = valorAtualizado * (1 - descontoParcelado / 100);
    const entrada = valorComDesconto * (entradaMinima / 100);
    const restante = valorComDesconto - entrada;
    const parcelasRestantes = numParcelas - (entradaMinima > 0 ? 1 : 0);
    const valorParcela = parcelasRestantes > 0 ? restante / parcelasRestantes : restante;

    // Verificar se a parcela atende ao mínimo
    if (valorParcela < valorMinParcela && numParcelas > 2) continue;

    opcoes.push({
      id: `${numParcelas}x`,
      titulo: `Em ${numParcelas}x`,
      descricao: entradaMinima > 0
        ? `${numParcelas} parcelas com ${descontoParcelado}% de desconto (entrada de ${entradaMinima}%)`
        : `${numParcelas} parcelas com ${descontoParcelado}% de desconto`,
      parcelas: numParcelas,
      desconto: descontoParcelado,
      valorParcela,
      valorTotal: valorComDesconto,
      entrada: entradaMinima > 0 ? entrada : undefined,
    });
  }

  return opcoes;
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
  const [opcaoEscolhida, setOpcaoEscolhida] = useState<OpcaoAcordo | null>(null);
  const [opcoes, setOpcoes] = useState<OpcaoAcordo[]>([]);
  const [mostrarBotaoFechar, setMostrarBotaoFechar] = useState(false);
  const [isClosingDeal, setIsClosingDeal] = useState(false);
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

  const formatarOpcaoTexto = (opcao: OpcaoAcordo, indice: number): string => {
    const emoji = indice === 0 ? "1\uFE0F\u20E3" : indice === 1 ? "2\uFE0F\u20E3" : "3\uFE0F\u20E3";
    if (opcao.parcelas === 1) {
      return `${emoji} **${opcao.titulo}** - ${formatCurrency(opcao.valorTotal)} (${opcao.desconto}% de desconto!)`;
    }
    const entradaTexto = opcao.entrada
      ? `\n   Entrada: ${formatCurrency(opcao.entrada)} + ${opcao.parcelas - 1}x de ${formatCurrency(opcao.valorParcela)}`
      : `\n   ${opcao.parcelas}x de ${formatCurrency(opcao.valorParcela)}`;
    return `${emoji} **${opcao.titulo}** - Total: ${formatCurrency(opcao.valorTotal)} (${opcao.desconto}% de desconto)${entradaTexto}`;
  };

  const iniciarNegociacao = useCallback(async (dividaData: Divida, config: ConfigNegociacao) => {
    // Criar registro de negociacao via API server-side
    try {
      const res = await fetch("/api/public/negociacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ divida_id: dividaData.id }),
      });
      const data = await res.json();
      if (res.ok && data.negociacao) {
        setNegociacaoId(data.negociacao.id);
      }
    } catch {
      console.warn("Aviso: nao foi possivel criar negociacao no servidor");
    }

    // Calcular opcoes baseadas nas configuracoes do credor
    const opcoesCalculadas = calcularOpcoesDinamicas(
      dividaData.valor_atualizado,
      dividaData.data_vencimento,
      config
    );
    setOpcoes(opcoesCalculadas);

    const nomeAssistente = config.nome_assistente || "Assistente Negocia Ai";

    // Mensagem de boas-vindas
    const bemVindo: Mensagem = {
      id: "1",
      remetente: "bot",
      conteudo: config.mensagem_boas_vindas
        ? `${config.mensagem_boas_vindas}\n\nVi que voce tem uma divida de ${formatCurrency(dividaData.valor_atualizado)} com ${dividaData.credor?.nome || "o credor"}.`
        : `Ola! Sou o ${nomeAssistente}. Vi que voce tem uma divida de ${formatCurrency(dividaData.valor_atualizado)} com ${dividaData.credor?.nome || "o credor"}. Como posso ajuda-lo hoje?`,
      timestamp: new Date(),
    };

    const diasAtraso = calcularDiasAtraso(dividaData.data_vencimento);
    const listaOpcoes = opcoesCalculadas.map((op, i) => formatarOpcaoTexto(op, i)).join("\n\n");

    const opcoesMensagem: Mensagem = {
      id: "2",
      remetente: "bot",
      conteudo: `Tenho otimas opcoes de acordo para voce (divida com ${diasAtraso} dias de atraso):\n\n${listaOpcoes}\n\nDigite o numero da opcao que deseja (${opcoesCalculadas.map((_, i) => i + 1).join(", ")}) ou me pergunte mais detalhes!`,
      timestamp: new Date(),
    };

    setMensagens([bemVindo, opcoesMensagem]);
  }, []);

  useEffect(() => {
    if (!id) {
      router.push("/consulta");
      return;
    }

    async function fetchDivida() {
      try {
        const res = await fetch(`/api/public/divida/${id}`);
        const json = await res.json();

        if (!res.ok || !json.divida) {
          router.push("/consulta");
          return;
        }

        const dividaData = json.divida as Divida;
        setDivida(dividaData);

        // Extrair config_negociacao do credor (vem junto com a divida)
        const credorConfig = dividaData.credor?.config_negociacao as Partial<ConfigNegociacao> | undefined;
        const config: ConfigNegociacao = { ...defaultConfig, ...(credorConfig || {}) };
        setConfigCredor(config);

        await iniciarNegociacao(dividaData, config);
      } catch {
        router.push("/consulta");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDivida();
  }, [id, router, iniciarNegociacao]);

  const processarResposta = async (mensagemUsuario: string) => {
    if (!divida || opcoes.length === 0) return;

    const msgLower = mensagemUsuario.toLowerCase().trim();

    let respostaBot = "";
    let opcaoSelecionada: OpcaoAcordo | null = null;

    // Verificar selecao por numero
    const numEscolhido = parseInt(msgLower);
    if (!isNaN(numEscolhido) && numEscolhido >= 1 && numEscolhido <= opcoes.length) {
      opcaoSelecionada = opcoes[numEscolhido - 1];
    }

    // Verificar selecao por texto
    if (!opcaoSelecionada) {
      if (msgLower.includes("vista") || msgLower.includes("a vista")) {
        opcaoSelecionada = opcoes[0]; // A vista e sempre a primeira
      } else {
        // Verificar se menciona numero de parcelas
        for (const op of opcoes) {
          if (op.parcelas > 1) {
            const parcelasStr = `${op.parcelas}x`;
            const parcelasStr2 = `${op.parcelas} x`;
            if (msgLower.includes(parcelasStr) || msgLower.includes(parcelasStr2)) {
              opcaoSelecionada = op;
              break;
            }
          }
        }
      }
    }

    if (opcaoSelecionada) {
      if (opcaoSelecionada.parcelas === 1) {
        respostaBot = `Excelente escolha! Voce optou pelo pagamento **a vista** com ${opcaoSelecionada.desconto}% de desconto.\n\n\uD83D\uDCB0 **Valor: ${formatCurrency(opcaoSelecionada.valorTotal)}**\n\nEssa e a melhor economia! Voce esta pronto para fechar o acordo?`;
      } else {
        const entradaInfo = opcaoSelecionada.entrada
          ? `\n\uD83D\uDCB3 **Entrada: ${formatCurrency(opcaoSelecionada.entrada)}**\n\uD83D\uDCB3 **${opcaoSelecionada.parcelas - 1}x de ${formatCurrency(opcaoSelecionada.valorParcela)}**`
          : `\n\uD83D\uDCB3 **${opcaoSelecionada.parcelas}x de ${formatCurrency(opcaoSelecionada.valorParcela)}**`;
        respostaBot = `Otima escolha! Voce optou por **${opcaoSelecionada.parcelas} parcelas** com ${opcaoSelecionada.desconto}% de desconto.${entradaInfo}\n\uD83D\uDCB0 **Total: ${formatCurrency(opcaoSelecionada.valorTotal)}**\n\nVoce esta pronto para fechar o acordo?`;
      }
    } else if (msgLower.includes("desconto") || msgLower.includes("menor") || msgLower.includes("melhor")) {
      respostaBot = `A melhor opcao em termos de economia e o **pagamento a vista** com ${opcoes[0].desconto}% de desconto! Voce pagaria apenas ${formatCurrency(opcoes[0].valorTotal)} em vez de ${formatCurrency(divida.valor_atualizado)}.\n\nDeseja escolher essa opcao? Digite "1" para confirmar.`;
    } else if (msgLower.includes("parcela") || msgLower.includes("dividir")) {
      const opParceladas = opcoes.filter((o) => o.parcelas > 1);
      if (opParceladas.length > 0) {
        const lista = opParceladas.map((op) => {
          const entradaInfo = op.entrada ? ` (entrada ${formatCurrency(op.entrada)})` : "";
          return `\uD83D\uDCCC **${op.parcelas}x de ${formatCurrency(op.valorParcela)}** - ${op.desconto}% de desconto (total: ${formatCurrency(op.valorTotal)})${entradaInfo}`;
        }).join("\n\n");
        respostaBot = `Temos opcoes de parcelamento:\n\n${lista}\n\nQual prefere? Digite o numero da opcao.`;
      } else {
        respostaBot = `No momento so temos a opcao de pagamento a vista com ${opcoes[0].desconto}% de desconto: ${formatCurrency(opcoes[0].valorTotal)}.`;
      }
    } else if (msgLower.includes("sim") || msgLower.includes("fechar") || msgLower.includes("confirmar") || msgLower.includes("aceito")) {
      if (opcaoEscolhida) {
        respostaBot = `Perfeito! Clique no botao abaixo para finalizar seu acordo.`;
        setMostrarBotaoFechar(true);
      } else {
        const listaOpcoes = opcoes.map((op, i) => formatarOpcaoTexto(op, i)).join("\n");
        respostaBot = `Primeiro escolha uma das opcoes de pagamento:\n\n${listaOpcoes}\n\nDigite o numero da opcao desejada.`;
      }
    } else {
      const listaOpcoes = opcoes.map((op, i) => formatarOpcaoTexto(op, i)).join("\n");
      respostaBot = `Desculpe, nao entendi. Por favor, escolha uma das opcoes:\n\n${listaOpcoes}\n\nDigite ${opcoes.map((_, i) => i + 1).join(", ")} para escolher.`;
    }

    if (opcaoSelecionada) {
      setOpcaoEscolhida(opcaoSelecionada);
      setMostrarBotaoFechar(true);
    }

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
    if (!opcaoEscolhida || !divida || isClosingDeal) return;

    setIsClosingDeal(true);

    try {
      // Se nao temos negociacaoId, criar agora
      let negId = negociacaoId;
      if (!negId) {
        const negRes = await fetch("/api/public/negociacao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ divida_id: divida.id }),
        });
        const negData = await negRes.json();
        if (!negRes.ok || !negData.negociacao) {
          adicionarMensagem("bot", "Erro ao processar o acordo. Tente novamente.");
          setIsClosingDeal(false);
          return;
        }
        negId = negData.negociacao.id;
        setNegociacaoId(negId);
      }

      // Criar acordo via API server-side
      const res = await fetch("/api/public/acordo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          divida_id: divida.id,
          negociacao_id: negId,
          valor_original: divida.valor_atualizado,
          valor_acordo: opcaoEscolhida.valorTotal,
          desconto_percentual: opcaoEscolhida.desconto,
          numero_parcelas: opcaoEscolhida.parcelas,
          valor_parcela: opcaoEscolhida.valorParcela,
          opcao_escolhida: opcaoEscolhida.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.acordo) {
        console.error("Erro ao fechar acordo:", data.error);
        adicionarMensagem("bot", "Erro ao criar o acordo. Tente novamente.");
        setIsClosingDeal(false);
        return;
      }

      adicionarMensagem("bot", "Acordo fechado com sucesso! Redirecionando...");

      setTimeout(() => {
        router.push(`/acordo/${data.acordo.id}`);
      }, 1500);
    } catch (error) {
      console.error("Erro ao fechar acordo:", error);
      adicionarMensagem("bot", "Ocorreu um erro ao fechar o acordo. Tente novamente.");
      setIsClosingDeal(false);
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

              {/* Botao de fechar acordo */}
              {mostrarBotaoFechar && opcaoEscolhida && (
                <div className="p-4 bg-green-50 border-t border-green-200">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                    onClick={fecharAcordo}
                    disabled={isClosingDeal}
                  >
                    {isClosingDeal
                      ? "Processando..."
                      : `Fechar Acordo - ${formatCurrency(opcaoEscolhida.valorTotal)}${opcaoEscolhida.parcelas > 1 ? ` (${opcaoEscolhida.parcelas}x)` : ""}`}
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
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
