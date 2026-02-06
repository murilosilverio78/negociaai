-- Migration: Portal do Credor
-- Adds user_id and webhook_config to credores table
-- Adds RLS policies for credor data isolation

-- Add columns to credores
ALTER TABLE credores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE credores ADD COLUMN IF NOT EXISTS webhook_config JSONB DEFAULT '{}';
ALTER TABLE credores ADD COLUMN IF NOT EXISTS config_negociacao JSONB DEFAULT '{}';

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS credores_user_id_idx ON credores(user_id);

-- Enable RLS
ALTER TABLE credores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividas ENABLE ROW LEVEL SECURITY;
ALTER TABLE acordos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credores
CREATE POLICY "Credores can view own data" ON credores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Credores can insert own data" ON credores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Credores can update own data" ON credores
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for dividas
CREATE POLICY "Credores can view own dividas" ON dividas
  FOR SELECT USING (
    credor_id IN (SELECT id FROM credores WHERE user_id = auth.uid())
  );

CREATE POLICY "Credores can insert own dividas" ON dividas
  FOR INSERT WITH CHECK (
    credor_id IN (SELECT id FROM credores WHERE user_id = auth.uid())
  );

CREATE POLICY "Credores can update own dividas" ON dividas
  FOR UPDATE USING (
    credor_id IN (SELECT id FROM credores WHERE user_id = auth.uid())
  );

-- RLS Policies for acordos
CREATE POLICY "Credores can view own acordos" ON acordos
  FOR SELECT USING (
    divida_id IN (
      SELECT d.id FROM dividas d
      JOIN credores c ON d.credor_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Allow public access for debtor-facing pages (no auth required)
CREATE POLICY "Public can view dividas by devedor" ON dividas
  FOR SELECT USING (true);

CREATE POLICY "Public can view acordos" ON acordos
  FOR SELECT USING (true);

CREATE POLICY "Public can view credores" ON credores
  FOR SELECT USING (true);
