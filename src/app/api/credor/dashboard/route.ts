import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: credor } = await supabase
    .from("credores")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!credor) return NextResponse.json({ error: "Credor not found" }, { status: 404 });

  // Fetch metrics
  const { count: totalDividas } = await supabase
    .from("dividas")
    .select("*", { count: "exact", head: true })
    .eq("credor_id", credor.id)
    .neq("status", "excluida");

  const { data: dividas } = await supabase
    .from("dividas")
    .select("valor_original, valor_atualizado")
    .eq("credor_id", credor.id)
    .neq("status", "excluida");

  const valorDividas = dividas?.reduce((sum, d) => sum + (d.valor_atualizado || d.valor_original), 0) ?? 0;

  const { data: acordos } = await supabase
    .from("acordos")
    .select("id, valor_original, valor_acordo, created_at")
    .in(
      "divida_id",
      (
        await supabase
          .from("dividas")
          .select("id")
          .eq("credor_id", credor.id)
      ).data?.map((d) => d.id) ?? []
    );

  const totalAcordos = acordos?.length ?? 0;
  const taxaConversao =
    totalDividas && totalDividas > 0
      ? ((totalAcordos / totalDividas) * 100).toFixed(1)
      : "0";
  const valorRecuperado = acordos?.reduce((sum, a) => sum + a.valor_acordo, 0) ?? 0;
  const valorARecuperar = valorDividas - valorRecuperado;

  // Chart data: acordos per day (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const chartData: { date: string; acordos: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count =
      acordos?.filter((a) => a.created_at?.startsWith(dateStr)).length ?? 0;
    chartData.push({ date: dateStr, acordos: count });
  }

  return NextResponse.json({
    totalDividas: totalDividas ?? 0,
    totalAcordos,
    taxaConversao,
    valorDividas,
    valorRecuperado,
    valorARecuperar: Math.max(0, valorARecuperar),
    chartData,
  });
}
