// src/checkers/registeredCheckers.ts
import type { TestCopilotChecker } from '../types/TestCopilotChecker';
import { raceConditionAnalysis } from './cypress/raceConditionAnalysis';
import { samplePlaywrightChecker } from './playwright/samplePlaywrightChecker';

export const registeredCheckers: Record<'cypress' | 'playwright', TestCopilotChecker[]> = {
    cypress: [raceConditionAnalysis],
    playwright: [samplePlaywrightChecker],
};