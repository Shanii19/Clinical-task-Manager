
-- Fix tasks FKs: drop old ones pointing to auth.users, add new ones to profiles
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- task_comments
ALTER TABLE public.task_comments DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;
ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- user_roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_task_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

-- messages
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- leave_requests
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey;
ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Trigger: notify on task assignment
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, task_id)
    VALUES (NEW.assigned_to, 'Task Assigned', 'You have been assigned to: ' || NEW.title, 'task', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_assigned ON public.tasks;
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- Trigger: notify on task status change
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, task_id)
    VALUES (NEW.assigned_to, 'Task Updated', 'Task "' || NEW.title || '" status changed to ' || REPLACE(NEW.status::text, '_', ' '), 'task', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_status_change ON public.tasks;
CREATE TRIGGER on_task_status_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_status_change();

-- Trigger: notify on leave request status change
CREATE OR REPLACE FUNCTION public.notify_leave_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status != 'pending' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, 'Leave Request ' || INITCAP(NEW.status::text), 'Your leave request has been ' || NEW.status::text, 'leave');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_leave_status_change ON public.leave_requests;
CREATE TRIGGER on_leave_status_change
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_leave_status_change();

-- Trigger: notify on task comment
CREATE OR REPLACE FUNCTION public.notify_task_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
BEGIN
  SELECT id, title, assigned_to, created_by INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  
  IF v_task.assigned_to IS NOT NULL AND v_task.assigned_to != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, task_id)
    VALUES (v_task.assigned_to, 'New Comment', 'Someone commented on task: ' || v_task.title, 'chat', v_task.id);
  END IF;
  
  IF v_task.created_by IS NOT NULL AND v_task.created_by != NEW.user_id AND v_task.created_by IS DISTINCT FROM v_task.assigned_to THEN
    INSERT INTO public.notifications (user_id, title, message, type, task_id)
    VALUES (v_task.created_by, 'New Comment', 'Someone commented on task: ' || v_task.title, 'chat', v_task.id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_comment ON public.task_comments;
CREATE TRIGGER on_task_comment
  AFTER INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_comment();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
