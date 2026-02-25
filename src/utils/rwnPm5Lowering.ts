import type { ActiveWorkoutInterval, ActiveWorkoutSpec } from '../types/ergSession.types';
import type { WorkoutStep, WorkoutStructure } from '../types/workoutStructure.types';

export type Pm5LoweringMode = 'exact' | 'prompt_only' | 'unsupported';

export interface Pm5LoweringResult {
  mode: Pm5LoweringMode;
  activeWorkoutSpec: ActiveWorkoutSpec | null;
  notes: string[];
}

const unsupported = (...notes: string[]): Pm5LoweringResult => ({
  mode: 'unsupported',
  activeWorkoutSpec: null,
  notes,
});

const toVariableIntervalStep = (step: WorkoutStep): ActiveWorkoutInterval | null => {
  if (step.type === 'rest') {
    if (step.duration_type !== 'time') return null;
    return { type: 'rest', value: step.value };
  }

  if (step.duration_type === 'distance') {
    return { type: 'distance', value: step.value };
  }

  if (step.duration_type === 'time') {
    return { type: 'time', value: step.value };
  }

  return null;
};

const buildBaseSpec = (structure: WorkoutStructure): Pm5LoweringResult => {
  if (structure.type === 'steady_state') {
    if (structure.unit === 'meters') {
      return {
        mode: 'exact',
        activeWorkoutSpec: { _v: 1, type: 'fixed_distance', value: structure.value },
        notes: [],
      };
    }

    if (structure.unit === 'seconds') {
      return {
        mode: 'exact',
        activeWorkoutSpec: { _v: 1, type: 'fixed_time', value: structure.value },
        notes: [],
      };
    }

    return unsupported('PM5 lowering does not currently support calorie-based steady-state workouts.');
  }

  if (structure.type === 'interval') {
    if (structure.work.type === 'distance') {
      return {
        mode: 'exact',
        activeWorkoutSpec: {
          _v: 1,
          type: 'interval_distance',
          split_value: structure.work.value,
          rest: structure.rest.value,
          repeats: structure.repeats,
        },
        notes: [],
      };
    }

    if (structure.work.type === 'time') {
      return {
        mode: 'exact',
        activeWorkoutSpec: {
          _v: 1,
          type: 'interval_time',
          split_value: structure.work.value,
          rest: structure.rest.value,
          repeats: structure.repeats,
        },
        notes: [],
      };
    }

    return unsupported('PM5 lowering does not currently support calorie-based interval work steps.');
  }

  const intervals = structure.steps.map(toVariableIntervalStep);
  if (intervals.some((step) => step === null)) {
    return unsupported('PM5 lowering does not currently support calorie-based steps in variable workouts.');
  }

  return {
    mode: 'exact',
    activeWorkoutSpec: {
      _v: 1,
      type: 'variable_interval',
      intervals: intervals as ActiveWorkoutInterval[],
    },
    notes: [],
  };
};

export const lowerWorkoutStructureToPm5 = (structure: WorkoutStructure): Pm5LoweringResult => {
  const base = buildBaseSpec(structure);
  if (base.mode === 'unsupported') {
    return base;
  }

  const extension = structure.sessionExtension;
  if (!extension) {
    return base;
  }

  return {
    mode: 'prompt_only',
    activeWorkoutSpec: base.activeWorkoutSpec,
    notes: [
      `Session extension '${extension.kind}' requires coach/athlete prompts and is not PM5-native.`,
      ...base.notes,
    ],
  };
};
