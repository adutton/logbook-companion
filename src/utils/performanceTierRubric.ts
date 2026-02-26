export type BenchmarkTier = 'developmental' | 'competitive' | 'challenger' | 'national-team';

type SquadKey = 'novice' | 'freshman' | 'jv' | 'varsity';

type SquadThresholds = {
  developmentalAbove: number;
  competitiveAbove: number;
  challengerAbove: number;
};

const RUBRIC_BY_SQUAD: Record<SquadKey, SquadThresholds> = {
  // Coach-provided freshman example:
  // >7:40 developmental, 7:40-7:20 competitive, 7:20-7:10 challenger, <=7:10 national team.
  freshman: { developmentalAbove: 460, competitiveAbove: 440, challengerAbove: 430 },
  // Defaults for other squads; tune once full rubric is provided.
  novice: { developmentalAbove: 460, competitiveAbove: 440, challengerAbove: 430 },
  jv: { developmentalAbove: 450, competitiveAbove: 430, challengerAbove: 420 },
  varsity: { developmentalAbove: 430, competitiveAbove: 420, challengerAbove: 410 },
};

const TIER_LABELS: Record<BenchmarkTier, string> = {
  developmental: 'Developmental',
  competitive: 'Competitive',
  challenger: 'Challenger',
  'national-team': 'National Team',
};

function normalizeSquad(rawSquad: string | null | undefined): SquadKey | null {
  if (!rawSquad) return null;
  const s = rawSquad.trim().toLowerCase();
  if (s.includes('varsity')) return 'varsity';
  if (s === 'jv' || s.includes('junior varsity')) return 'jv';
  if (s.includes('freshman') || s.includes('frosh')) return 'freshman';
  if (s.includes('novice')) return 'novice';
  return null;
}

export function deriveBenchmarkTier(squad: string | null | undefined, best2kSeconds: number | null | undefined): BenchmarkTier | null {
  if (best2kSeconds == null || best2kSeconds <= 0) return null;
  const squadKey = normalizeSquad(squad);
  if (!squadKey) return null;
  const rubric = RUBRIC_BY_SQUAD[squadKey];

  if (best2kSeconds > rubric.developmentalAbove) return 'developmental';
  if (best2kSeconds > rubric.competitiveAbove) return 'competitive';
  if (best2kSeconds > rubric.challengerAbove) return 'challenger';
  return 'national-team';
}

export function benchmarkTierLabel(tier: BenchmarkTier | null): string {
  return tier ? TIER_LABELS[tier] : '—';
}

export function formatErgTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export type ErgScoreLike = { athlete_id: string; distance: number; time_seconds: number };

export function buildBest2kByAthlete(scores: ErgScoreLike[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const score of scores) {
    if (score.distance !== 2000 || !Number.isFinite(score.time_seconds) || score.time_seconds <= 0) continue;
    const existing = map[score.athlete_id];
    if (existing == null || score.time_seconds < existing) map[score.athlete_id] = score.time_seconds;
  }
  return map;
}
