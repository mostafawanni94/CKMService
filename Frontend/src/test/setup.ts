/**
 * Test setup.
 *
 * The dashboard talks to one API client and one auth module. Both are stubbed
 * here so a hook under test never reaches the network and never depends on
 * whatever happens to be in localStorage.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
