import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = request.nextUrl;

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

  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  // Get divida IDs for this credor
  const { data: dividas } = await supabase
    .from("dividas")
    .select("id")
    .eq("credor_id", credor.id);

  const dividaIds = dividas?.map((d) => d.id) ?? [];

  if (dividaIds.length === 0) {
    return NextResponse.json({
      totalAcordos: 0,
      valorTotal: 0,
      ticketMedio: 0,
      descontoMedio: 0,
      chartData: [],
    });
  }

  let query = supabase
    .from("acordos")
    .select("*")
    .in("divida_id", dividaIds);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to + "T23:59:59");

  const { data: acordos } = await query;

  const totalAcordos = acordos?.length ?? 0;
  const valorTotal = acordos?.reduce((s, a) => s + a.valor_acordo, 0) ?? 0;
  const ticketMedio = totalAcordos > 0 ? valorTotal / totalAcordos : 0;
  const descontoMedio =
    totalAcordos > 0
      ? (acordos?.reduce((s, a) => s + a.desconto_percentual, 0) ?? 0) / totalAcordos
      : 0;

  // Group by date for chart
  const byDate: Record<string, number> = {};
  acordos?.forEach((a) => {
    const date = a.created_at?.split("T")[0];
    if (date) byDate[date] = (byDate[date] || 0) + 1;
  });

  const chartData = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, acordos: count }));

  return NextResponse.json({
    totalAcordos,
    valorTotal,
    ticketMedio,
    descontoMedio,
    chartData,
  });
}
