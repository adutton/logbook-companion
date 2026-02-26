export type BenchmarkTier = 'developmental' | 'competitor' | 'challenger' | 'champion' | 'nationals';

type SquadKey = 'novice' | 'freshman' | 'jv' | 'varsity';

type SquadThresholds = {
  developmentalAbove: number;
  competitorAbove: number;
  challengerAbove: number;
  championAbove: number;
};

function toSeconds(mmss: string): number {
  const [m, s] = mmss.split(':').map(Number);
  return m * 60 + s;
}

const RUBRIC_BY_SQUAD: Record<SquadKey, SquadThresholds> = {
  // slower than 7:40 developmental, 7:40-7:20 competitor, 7:20-7:10 challenger, 7:10-7:00 champion, <=7:00 nationals
  freshman: { developmentalAbove: toSeconds('7:40'), competitorAbove: toSeconds('7:20'), challengerAbove: toSeconds('7:10'), championAbove: toSeconds('7:00') },
  // defaulting novice to freshman bands
  novice: { developmentalAbove: toSeconds('7:40'), competitorAbove: toSeconds('7:20'), challengerAbove: toSeconds('7:10'), championAbove: toSeconds('7:00') },
  // developmental to 7:20, 7:20-7:10 competitor, 7:10-7:00 challenger, 7:00-6:50 champion, <=6:50 nationals
  jv: { developmentalAbove: toSeconds('7:20'), competitorAbove: toSeconds('7:10'), challengerAbove: toSeconds('7:00'), championAbove: toSeconds('6:50') },
  // 7:10, 7:00, 6:50, 6:40, 6:20 (nationals)
  varsity: { developmentalAbove: toSeconds('7:10'), competitorAbove: toSeconds('7:00'), challengerAbove: toSeconds('6:50'), championAbove: toSeconds('6:20') },
};

const TIER_LABELS: Record<BenchmarkTier, string> = {
  developmental: 'Developmental',
  competitor: 'Competitor',
  challenger: 'Challenger',
  champion: 'Champion',
  nationals: 'Nationals',
};

function normalizeSquad(rawSquad: string | null | undefined): SquadKey | null {
  if (!rawSquad) return null;
  const s = rawSquad.trim().toLowerCase();
  if (s.includes('varsity') || s === 'v' || s === '1v' || s === '2v') return 'varsity';
  if (s === 'jv' || s.includes('junior varsity')) return 'jv';
  if (s.includes('freshman') || s.includes('freshmen') || s.includes('frosh') || s === 'fr') return 'freshman';
  if (s.includes('novice')) return 'novice';
  return null;
}

export function deriveBenchmarkTier(squad: string | null | undefined, best2kSeconds: number | null | undefined): BenchmarkTier | null {
  if (best2kSeconds == null || best2kSeconds <= 0) return null;
  const squadKey = normalizeSquad(squad);
  if (!squadKey) return null;
  const rubric = RUBRIC_BY_SQUAD[squadKey];

  if (best2kSeconds > rubric.developmentalAbove) return 'developmental';
  if (best2kSeconds > rubric.competitorAbove) return 'competitor';
  if (best2kSeconds > rubric.challengerAbove) return 'challenger';
  if (best2kSeconds > rubric.championAbove) return 'champion';
  return 'nationals';
}

export function benchmarkTierLabel(tier: BenchmarkTier | null): string {
  return tier ? TIER_LABELS[tier] : '—';
}

export function benchmarkTierBadgeClass(tier: BenchmarkTier | null): string {
  if (!tier) return 'bg-neutral-800 text-neutral-300';
  const map: Record<BenchmarkTier, string> = {
    developmental: 'bg-red-900/30 text-red-300',
    competitor: 'bg-amber-900/30 text-amber-300',
    challenger: 'bg-blue-900/30 text-blue-300',
    champion: 'bg-emerald-900/30 text-emerald-300',
    nationals: 'bg-purple-900/30 text-purple-300',
  };
  return map[tier];
}

function nextTierCutoffSeconds(tier: BenchmarkTier, rubric: SquadThresholds): number | null {
  if (tier === 'developmental') return rubric.competitorAbove;
  if (tier === 'competitor') return rubric.challengerAbove;
  if (tier === 'challenger') return rubric.championAbove;
  if (tier === 'champion') return rubric.championAbove;
  return null;
}

export function benchmarkCriteriaIndicator(
  squad: string | null | undefined,
  best2kSeconds: number | null | undefined,
  tolerancePct = 0.02
): { text: string; className: string } | null {
  if (best2kSeconds == null || best2kSeconds <= 0) return null;
  const squadKey = normalizeSquad(squad);
  if (!squadKey) return null;
  const tier = deriveBenchmarkTier(squad, best2kSeconds);
  if (!tier) return null;
  const rubric = RUBRIC_BY_SQUAD[squadKey];
  const nextCutoff = nextTierCutoffSeconds(tier, rubric);
  if (nextCutoff != null && best2kSeconds > nextCutoff && best2kSeconds <= nextCutoff * (1 + tolerancePct)) {
    return { text: 'Within 2% of next tier', className: 'text-amber-400' };
  }
  return { text: 'Meets rubric criteria', className: 'text-emerald-400' };
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
