-- Tacoma Nights playlist queue ordering
-- Run this once in the Supabase SQL Editor before using playlist reorder controls.
ALTER TABLE public.live_network_playout_queue
  ADD COLUMN IF NOT EXISTS queue_position bigint;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY owner_id
           ORDER BY scheduled_at ASC NULLS FIRST, created_at ASC, id ASC
         ) AS position
  FROM public.live_network_playout_queue
  WHERE queue_position IS NULL
)
UPDATE public.live_network_playout_queue AS q
SET queue_position = ranked.position
FROM ranked
WHERE q.id = ranked.id;

ALTER TABLE public.live_network_playout_queue
  ALTER COLUMN queue_position SET DEFAULT 0;

UPDATE public.live_network_playout_queue
SET queue_position = 0
WHERE queue_position IS NULL;

CREATE INDEX IF NOT EXISTS live_network_playout_queue_owner_position_idx
  ON public.live_network_playout_queue (owner_id, queue_position);
