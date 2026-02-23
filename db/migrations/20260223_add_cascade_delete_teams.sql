-- Migration: Add ON DELETE CASCADE to all FK constraints referencing teams(id)
-- Purpose: Allow team deletion to cascade-delete all team-scoped coaching data
-- Date: 2026-02-23

-- coaching_athlete_notes.team_id
ALTER TABLE public.coaching_athlete_notes
  DROP CONSTRAINT coaching_athlete_notes_team_id_fkey,
  ADD CONSTRAINT coaching_athlete_notes_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- coaching_boatings.team_id
ALTER TABLE public.coaching_boatings
  DROP CONSTRAINT coaching_boatings_team_id_fkey,
  ADD CONSTRAINT coaching_boatings_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- coaching_erg_scores.team_id
ALTER TABLE public.coaching_erg_scores
  DROP CONSTRAINT coaching_erg_scores_team_id_fkey,
  ADD CONSTRAINT coaching_erg_scores_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- coaching_sessions.team_id
ALTER TABLE public.coaching_sessions
  DROP CONSTRAINT coaching_sessions_team_id_fkey,
  ADD CONSTRAINT coaching_sessions_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- group_assignments.team_id
ALTER TABLE public.group_assignments
  DROP CONSTRAINT group_assignments_team_id_fkey,
  ADD CONSTRAINT group_assignments_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- team_athletes.team_id
ALTER TABLE public.team_athletes
  DROP CONSTRAINT team_athletes_team_id_fkey,
  ADD CONSTRAINT team_athletes_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- team_members.team_id
ALTER TABLE public.team_members
  DROP CONSTRAINT team_members_team_id_fkey,
  ADD CONSTRAINT team_members_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
