
-- Trigger: notify on new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
BEGIN
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  INSERT INTO public.notifications (user_id, title, message, type, task_id)
  VALUES (
    NEW.receiver_id,
    'New Message',
    COALESCE(v_sender_name, 'Someone') || ' sent you a message',
    'chat',
    NEW.task_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
