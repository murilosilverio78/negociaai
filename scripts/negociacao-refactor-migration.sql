-- Migration: Refatorar tabela negociacoes com campos calculados e tabela de mensagens
-- Executar no Supabase SQL Editor

-- Novas colunas na tabela negociacoes
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS valor_original NUMERIC(12,2);
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS valor_atualizado NUMERIC(12,2);
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS dias_atraso INTEGER;
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS faixa_atraso VARCHAR(10);
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS opcoes_acordo JSONB;
ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS acordo_id UUID REFERENCES acordos(id);

-- Atualizar constraint de status para incluir novos valores
ALTER TABLE negociacoes DROP CONSTRAINT IF EXISTS negociacoes_status_check;
ALTER TABLE negociacoes ADD CONSTRAINT negociacoes_status_check
  CHECK (status IN ('ativa', 'em_andamento', 'acordo_fechado', 'cancelada', 'abandonada'));

-- Tabela de mensagens da negociacao
CREATE TABLE IF NOT EXISTS negociacoes_mensagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negociacao_id UUID NOT NULL REFERENCES negociacoes(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_neg_msgs_negociacao ON negociacoes_mensagens(negociacao_id);

-- Adicionar campo valor_entrada na tabela acordos
ALTER TABLE acordos ADD COLUMN IF NOT EXISTS valor_entrada NUMERIC(12,2) DEFAULT 0;
