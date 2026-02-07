-- Table pour la signalisation WebRTC
CREATE TABLE public.signaling_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES public.calls(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  type text NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'hangup'
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance des requêtes par destinataire
CREATE INDEX idx_signaling_recipient ON public.signaling_messages(recipient_id, created_at);
CREATE INDEX idx_signaling_call ON public.signaling_messages(call_id, created_at);

-- Activer RLS
ALTER TABLE public.signaling_messages ENABLE ROW LEVEL SECURITY;

-- Politique: les utilisateurs peuvent envoyer des messages de signalisation
CREATE POLICY "Users can insert signaling messages"
ON public.signaling_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Politique: les utilisateurs peuvent voir leurs messages de signalisation
CREATE POLICY "Users can view their signaling messages"
ON public.signaling_messages FOR SELECT
USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- Politique: les utilisateurs peuvent supprimer leurs propres messages envoyés
CREATE POLICY "Users can delete their sent signaling messages"
ON public.signaling_messages FOR DELETE
USING (auth.uid() = sender_id);

-- Activer Realtime pour cette table
ALTER PUBLICATION supabase_realtime ADD TABLE public.signaling_messages;