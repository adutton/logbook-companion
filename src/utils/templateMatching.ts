/**
 * Find the best matching template for a workout by canonical name
 * Priority: User's own templates first, then most popular community templates
 */

import { supabase } from '../services/supabase';
import { canonicalSignatureFromCanonicalName } from './workoutCanonical';

export type MatchReason =
  | 'exact_user_template'
  | 'exact_community_template'
  | 'no_match';

export interface MatchedTemplate {
  id: string;
  name: string;
  canonical_name: string;
  usage_count: number;
  created_by: string | null;
  match_confidence: number;
  match_reason: MatchReason;
  canonical_signature: string;
}

function computeExactMatchConfidence(
  isUserTemplate: boolean,
  usageCount: number
): { confidence: number; reason: MatchReason } {
  const usageBonus = Math.min(Math.log10(Math.max(usageCount, 0) + 1) * 0.04, 0.08);
  if (isUserTemplate) {
    return {
      confidence: Math.min(0.92 + usageBonus, 0.99),
      reason: 'exact_user_template',
    };
  }
  return {
    confidence: Math.min(0.84 + usageBonus, 0.94),
    reason: 'exact_community_template',
  };
}

export async function findTemplateMatchesWithConfidence(
  userId: string,
  canonicalName: string | null,
  limit = 3
): Promise<MatchedTemplate[]> {
  const canonicalSignature = canonicalSignatureFromCanonicalName(canonicalName);
  if (!canonicalSignature) {
    return [];
  }

  const { data: templates, error } = await supabase
    .from('workout_templates')
    .select('id, name, canonical_name, usage_count, created_by')
    .eq('canonical_name', canonicalSignature)
    .order('usage_count', { ascending: false })
    .limit(Math.max(limit, 1));

  if (error || !templates || templates.length === 0) {
    return [];
  }

  const scored = templates.map((template) => {
    const isUserTemplate = template.created_by === userId;
    const { confidence, reason } = computeExactMatchConfidence(isUserTemplate, template.usage_count ?? 0);
    return {
      ...template,
      canonical_signature: canonicalSignature,
      match_confidence: confidence,
      match_reason: reason,
    };
  });

  scored.sort((a, b) => {
    if (b.match_confidence !== a.match_confidence) {
      return b.match_confidence - a.match_confidence;
    }
    return (b.usage_count ?? 0) - (a.usage_count ?? 0);
  });

  return scored.slice(0, limit);
}

/**
 * Find best matching template by canonical name
 * @param userId - Current user's ID (for priority matching)
 * @param canonicalName - The canonical RWN representation to match
 * @returns The best matching template, or null if none found
 */
export async function findBestMatchingTemplate(
  userId: string,
  canonicalName: string | null
): Promise<MatchedTemplate | null> {
  const matches = await findTemplateMatchesWithConfidence(userId, canonicalName, 1);
  return matches[0] ?? null;
}

/**
 * Match and update workout with template_id
 * @param workoutId - ID of the workout_log to update
 * @param userId - Current user's ID
 * @param canonicalName - Canonical RWN to match against templates
 * @returns true if matched and updated, false otherwise
 */
export async function matchWorkoutToTemplate(
  workoutId: string,
  userId: string,
  canonicalName: string | null
): Promise<boolean> {
  const template = await findBestMatchingTemplate(userId, canonicalName);

  if (!template) {
    return false;
  }

  // Update workout_log with matched template_id
  const { error } = await supabase
    .from('workout_logs')
    .update({ template_id: template.id })
    .eq('id', workoutId);

  if (error) {
    console.error('Error updating workout with template_id:', error);
    return false;
  }

  return true;
}
