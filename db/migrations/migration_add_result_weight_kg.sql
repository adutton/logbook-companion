ALTER TABLE public.daily_workout_assignments
ADD COLUMN IF NOT EXISTS result_weight_kg NUMERIC;
