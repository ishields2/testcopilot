// src/checkers/registeredCheckers.ts
import type { TestCopilotChecker } from '../types/TestCopilotChecker';
import { raceConditionAnalysis } from './raceConditionAnalysis';

export const registeredCheckers: Record<string, TestCopilotChecker> = {
    raceConditionAnalysis,
    // other checkers...
};