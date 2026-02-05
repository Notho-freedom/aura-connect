-- Create security definer functions to check participation without recursion

-- Function to check if user is a participant of a call
CREATE OR REPLACE FUNCTION public.is_call_participant(_user_id uuid, _call_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.call_participants
    WHERE user_id = _user_id
      AND call_id = _call_id
  )
$$;

-- Function to check if user is a participant of a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE user_id = _user_id
      AND conversation_id = _conversation_id
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view call participants" ON public.call_participants;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view calls they participate in" ON public.calls;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

-- Recreate call_participants SELECT policy using security definer function
CREATE POLICY "Users can view call participants" 
ON public.call_participants 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR public.is_call_participant(auth.uid(), call_id)
);

-- Recreate conversation_participants SELECT policy using security definer function
CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR public.is_conversation_participant(auth.uid(), conversation_id)
);

-- Recreate calls SELECT policy
CREATE POLICY "Users can view calls they participate in" 
ON public.calls 
FOR SELECT 
USING (
  initiated_by = auth.uid()
  OR public.is_call_participant(auth.uid(), id)
);

-- Recreate conversations SELECT policy
CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations 
FOR SELECT 
USING (public.is_conversation_participant(auth.uid(), id));

-- Recreate messages SELECT policy
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (public.is_conversation_participant(auth.uid(), conversation_id));

-- Recreate messages INSERT policy
CREATE POLICY "Users can send messages to their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND public.is_conversation_participant(auth.uid(), conversation_id)
);