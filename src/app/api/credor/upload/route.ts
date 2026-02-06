import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(digits[10]) === check;
}

interface UploadRow {
  cpf: string;
  nome: string;
  telefone?: string;
  email?: string;
  valor_original: string;
  valor_atualizado?: string;
  data_vencimento: string;
  produto?: string;
  contrato?: string;
}

export async function POST(request: NextRequest) {
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

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  let rows: UploadRow[] = [];

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".csv")) {
    const text = await file.text();
    const result = Papa.parse<UploadRow>(text, { header: true, skipEmptyLines: true });
    rows = result.data;
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<UploadRow>(ws);
  } else {
    return NextResponse.json({ error: "Formato não suportado. Use CSV ou Excel." }, { status: 400 });
  }

  let inserted = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const cpfDigits = (row.cpf || "").replace(/\D/g, "");

    if (!validateCPF(cpfDigits)) {
      errors.push(`CPF inválido: ${row.cpf}`);
      continue;
    }

    // Upsert devedor
    const { data: devedor, error: devError } = await supabase
      .from("devedores")
      .upsert(
        {
          cpf: cpfDigits,
          nome: row.nome || "Não informado",
          telefone: row.telefone || null,
          email: row.email || null,
        },
        { onConflict: "cpf" }
      )
      .select("id")
      .single();

    if (devError || !devedor) {
      errors.push(`Erro ao criar devedor CPF ${cpfDigits}: ${devError?.message}`);
      continue;
    }

    // Insert divida
    const valorOriginal = parseFloat(String(row.valor_original).replace(",", ".")) || 0;
    const valorAtualizado = row.valor_atualizado
      ? parseFloat(String(row.valor_atualizado).replace(",", "."))
      : valorOriginal;

    const { error: divError } = await supabase.from("dividas").insert({
      credor_id: credor.id,
      devedor_id: devedor.id,
      valor_original: valorOriginal,
      valor_atualizado: valorAtualizado,
      data_vencimento: row.data_vencimento || new Date().toISOString().split("T")[0],
      produto: row.produto || "Não especificado",
      contrato: row.contrato || null,
      status: "pendente",
    });

    if (divError) {
      errors.push(`Erro ao inserir dívida CPF ${cpfDigits}: ${divError.message}`);
    } else {
      inserted++;
    }
  }

  return NextResponse.json({
    total: rows.length,
    inserted,
    errors: errors.slice(0, 20),
  });
}
