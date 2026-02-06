-- Migração: Criar tabelas acordos e parcelas
-- Execute este SQL no Supabase SQL Editor

-- Tabela de acordos
CREATE TABLE IF NOT EXISTS acordos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  divida_id UUID NOT NULL REFERENCES dividas(id),
  negociacao_id UUID NOT NULL REFERENCES negociacoes(id),
  valor_original NUMERIC(12,2) NOT NULL,
  valor_acordo NUMERIC(12,2) NOT NULL,
  desconto_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  numero_parcelas INTEGER NOT NULL DEFAULT 1,
  valor_parcela NUMERIC(12,2) NOT NULL,
  opcao_escolhida TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de parcelas
CREATE TABLE IF NOT EXISTS parcelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  acordo_id UUID NOT NULL REFERENCES acordos(id),
  numero INTEGER NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE acordos ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (para uso com anon key, como o restante do projeto)
CREATE POLICY "Permitir leitura de acordos" ON acordos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de acordos" ON acordos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de acordos" ON acordos FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura de parcelas" ON parcelas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de parcelas" ON parcelas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de parcelas" ON parcelas FOR UPDATE USING (true);
