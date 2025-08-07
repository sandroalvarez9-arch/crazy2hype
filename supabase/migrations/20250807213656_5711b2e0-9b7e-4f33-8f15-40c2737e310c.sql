-- Add payment information fields to tournaments table
ALTER TABLE public.tournaments ADD COLUMN payment_instructions TEXT;
ALTER TABLE public.tournaments ADD COLUMN venmo_username TEXT;
ALTER TABLE public.tournaments ADD COLUMN paypal_email TEXT;
ALTER TABLE public.tournaments ADD COLUMN bank_details TEXT;
ALTER TABLE public.tournaments ADD COLUMN check_address TEXT;
ALTER TABLE public.tournaments ADD COLUMN other_payment_methods TEXT;