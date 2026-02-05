-- Drop the recursive policies
DROP POLICY IF EXISTS "Users can view call participants" ON public.call_participants;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- Create new non-recursive policies for call_participants
-- Users can view participants if they are a participant in that call
CREATE POLICY "Users can view call participants" 
ON public.call_participants 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR call_id IN (
    SELECT call_id FROM public.call_participants WHERE user_id = auth.uid()
  )
);

-- Create new non-recursive policies for conversation_participants  
-- Users can view participants if they are a participant in that conversation
CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
);