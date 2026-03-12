import { describe, expect, test } from 'vitest';

import { parseCsvScores } from './csvScoreParser';

describe('csvScoreParser', () => {
  test('parses 2k result CSV as a single-piece import using the overall time column', () => {
    const csv = [
      'Name,2k time,2k split ,watts,weight,efficiency,Classification',
      'gabe,6:36.9,1:36.9,358.27,193.0,1.856,VA Champ',
      'lucas,6:46.8,1:41.7,332.74,171.1,1.945,VA Challenger',
    ].join('\n');

    const parsed = parseCsvScores(csv, { mode: 'single_piece' });

    expect(parsed.errors).toEqual([]);
    expect(parsed.repCount).toBe(1);
    expect(parsed.singleResultColumnIndex).toBe(1);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      name: 'gabe',
      total_seconds: 396.9,
      valid_rep_count: 1,
    });
    expect(parsed.rows[0].intervals).toEqual([
      {
        rep: 1,
        time_seconds: 396.9,
        dnf: null,
      },
    ]);
  });

  test('parses rep-labeled interval columns and ignores trailing metadata', () => {
    const csv = [
      'Athlete,1,2,3,Split,Watts',
      'Sam,1:40.0,1:41.0,1:42.0,1:41.0,320',
    ].join('\n');

    const parsed = parseCsvScores(csv, { mode: 'intervals' });

    expect(parsed.errors).toEqual([]);
    expect(parsed.repCount).toBe(3);
    expect(parsed.rows[0].intervals).toHaveLength(3);
    expect(parsed.rows[0].intervals.map((interval) => interval.time_seconds)).toEqual([
      100,
      101,
      102,
    ]);
  });
});
