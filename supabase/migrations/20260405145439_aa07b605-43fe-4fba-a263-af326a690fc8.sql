
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
