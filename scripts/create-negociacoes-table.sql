-- Tabela para armazenar as negociações de dívidas
CREATE TABLE IF NOT EXISTS negociacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  divida_id UUID REFERENCES dividas(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'acordo_fechado', 'cancelada')),
  mensagens JSONB DEFAULT '[]'::jsonb,
  opcao_escolhida TEXT,
  valor_acordo NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar negociações por dívida
CREATE INDEX IF NOT EXISTS idx_negociacoes_divida_id ON negociacoes(divida_id);

-- Índice para buscar negociações por status
CREATE INDEX IF NOT EXISTS idx_negociacoes_status ON negociacoes(status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE negociacoes ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção anônima (para o portal público)
CREATE POLICY "Permitir inserção anônima" ON negociacoes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política para permitir leitura anônima
CREATE POLICY "Permitir leitura anônima" ON negociacoes
  FOR SELECT
  TO anon
  USING (true);

-- Política para permitir atualização anônima
CREATE POLICY "Permitir atualização anônima" ON negociacoes
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
