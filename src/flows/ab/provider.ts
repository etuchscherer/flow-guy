import { defaultMockABAdapter, type MockABAdapter } from './mock-adapter';
import type { ABAdapter } from './types';

let currentAdapter: ABAdapter = defaultMockABAdapter;

/**
 * Returns the currently active A/B testing adapter.
 * Defaults to the built-in MockABAdapter.
 */
export function getActiveABAdapter(): ABAdapter {
  return currentAdapter;
}

/**
 * Swaps the active A/B adapter (e.g. to a Statsig adapter in production).
 */
export function setActiveABAdapter(adapter: ABAdapter): void {
  currentAdapter = adapter;
}

/**
 * Returns the default in-memory MockABAdapter instance for configuring test mocks.
 */
export function getDefaultMockAdapter(): MockABAdapter {
  return defaultMockABAdapter;
}

/**
 * Resets the active adapter back to the default MockABAdapter.
 */
export function resetActiveABAdapter(): void {
  currentAdapter = defaultMockABAdapter;
  defaultMockABAdapter.reset();
}
