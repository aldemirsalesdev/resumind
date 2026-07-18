-- Migration script for Supabase

-- 1. Criação da tabela de Feedbacks
CREATE TABLE feedbacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  rating integer CHECK (rating >= 0 AND rating <= 5),
  liked boolean,
  feedback text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Configurando Row Level Security (RLS) para proteger os dados
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (Policies)

-- Todos os usuários (autenticados ou anônimos) podem inserir feedbacks
CREATE POLICY "Todos podem inserir feedbacks" 
ON feedbacks FOR INSERT 
TO public
WITH CHECK (true);

-- Apenas o administrador (ou ninguém, dependendo da sua regra) pode visualizar todos os feedbacks públicos
CREATE POLICY "Admins podem visualizar feedbacks" 
ON feedbacks FOR SELECT 
TO authenticated
USING (true); -- Ajuste conforme os papéis de admin no seu app Supabase

-- 4. Criação de índices para performance
CREATE INDEX feedbacks_user_id_idx ON feedbacks (user_id);
CREATE INDEX feedbacks_created_at_idx ON feedbacks (created_at DESC);
