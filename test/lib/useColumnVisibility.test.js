'use strict';

import assert from 'node:assert';
import { test } from 'node:test';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

/*
 * The repo has no node_modules in this environment and `localStorage` does not
 * exist in Node. This hook is a real React hook (it imports from 'react' and
 * builds on useLocalStorage). To exercise its logic via `node --test` without
 * installing dependencies, we:
 *   1. Provide an in-memory localStorage on globalThis.
 *   2. Register a tiny ESM loader that resolves the bare 'react' specifier to a
 *      minimal hooks runtime (useState / useCallback / useMemo) with indexed
 *      hook slots, so the hook renders like it would under React.
 * The loader + render harness only mimic React's contract; the hook code under
 * test is unchanged.
 */

// --- in-memory localStorage --------------------------------------------------
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}
globalThis.localStorage = new MemoryStorage();

// --- minimal React hooks runtime ---------------------------------------------
// Exposed on globalThis so the loader-provided 'react' stub can reach it.
const reactRuntime = {
  slots: [],
  index: 0,
  rerender: null,
  beginRender() {
    this.index = 0;
  },
  useState(initial) {
    const i = this.index++;
    if (this.slots[i] === undefined) {
      this.slots[i] = {
        value: typeof initial === 'function' ? initial() : initial,
      };
    }
    const slot = this.slots[i];
    const setState = (next) => {
      slot.value = typeof next === 'function' ? next(slot.value) : next;
      if (this.rerender) this.rerender();
    };
    return [slot.value, setState];
  },
  useCallback(fn) {
    // Return a stable-ish wrapper; identity is not asserted in these tests.
    return fn;
  },
  useMemo(factory) {
    // Recompute each render — matches observable behavior for our assertions.
    return factory();
  },
};
globalThis.__REACT_TEST_RUNTIME__ = reactRuntime;

// The loader stub for 'react' simply forwards to the global runtime.
const reactStubSource = `
const rt = globalThis.__REACT_TEST_RUNTIME__;
export const useState = (init) => rt.useState(init);
export const useCallback = (fn) => rt.useCallback(fn);
export const useMemo = (factory) => rt.useMemo(factory);
export default { useState, useCallback, useMemo };
`;

const loaderSource = `
const REACT_STUB = ${JSON.stringify(reactStubSource)};
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react') {
    return { url: 'data:text/javascript,' + encodeURIComponent(REACT_STUB), shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`;

register('data:text/javascript,' + encodeURIComponent(loaderSource), pathToFileURL('./'));

// --- render harness ----------------------------------------------------------
// Renders a hook, re-rendering on state changes, and exposes the latest result.
function mountHook(hookFn) {
  reactRuntime.slots = [];
  let latest;
  const render = () => {
    reactRuntime.beginRender();
    latest = hookFn();
  };
  reactRuntime.rerender = render;
  render();
  return {
    get current() {
      return latest;
    },
  };
}

const { useColumnVisibility } = await import('../../src/hooks/useColumnVisibility.js');
const COLUMNS = ['recipient', 'sent', 'received', 'date', 'status'];

test('defaults to all columns visible', () => {
  localStorage.clear();
  const h = mountHook(() => useColumnVisibility('cols:default', COLUMNS));
  for (const id of COLUMNS) {
    assert.strictEqual(h.current.visibility[id], true, `${id} should be visible`);
    assert.strictEqual(h.current.isVisible(id), true);
  }
});

test('toggleColumn hides then shows a column', () => {
  localStorage.clear();
  const h = mountHook(() => useColumnVisibility('cols:toggle', COLUMNS));

  h.current.toggleColumn('date');
  assert.strictEqual(h.current.visibility.date, false);
  assert.strictEqual(h.current.isVisible('date'), false);
  // other columns unaffected
  assert.strictEqual(h.current.visibility.recipient, true);

  h.current.toggleColumn('date');
  assert.strictEqual(h.current.visibility.date, true);
  assert.strictEqual(h.current.isVisible('date'), true);
});

test('persists across a fresh hook instance with the same storageKey', () => {
  localStorage.clear();
  const key = 'cols:persist';

  const first = mountHook(() => useColumnVisibility(key, COLUMNS));
  first.current.toggleColumn('status');
  assert.strictEqual(first.current.visibility.status, false);

  // Do NOT clear storage — a new instance must read the persisted state.
  const second = mountHook(() => useColumnVisibility(key, COLUMNS));
  assert.strictEqual(second.current.visibility.status, false);
  assert.strictEqual(second.current.isVisible('status'), false);
  // untouched columns still visible
  assert.strictEqual(second.current.visibility.recipient, true);
});

test('reset restores all columns visible and clears storage', () => {
  localStorage.clear();
  const key = 'cols:reset';

  const h = mountHook(() => useColumnVisibility(key, COLUMNS));
  h.current.toggleColumn('sent');
  h.current.toggleColumn('received');
  assert.strictEqual(h.current.visibility.sent, false);
  assert.strictEqual(h.current.visibility.received, false);

  h.current.reset();
  for (const id of COLUMNS) {
    assert.strictEqual(h.current.visibility[id], true, `${id} visible after reset`);
  }
  assert.strictEqual(localStorage.getItem(key), null, 'storage cleared on reset');
});

test('partial/unknown stored value merges back to all-visible defaults', () => {
  localStorage.clear();
  const key = 'cols:partial';
  // Only one column stored, plus an unknown key that must be ignored.
  localStorage.setItem(key, JSON.stringify({ date: false, bogus: true }));

  const h = mountHook(() => useColumnVisibility(key, COLUMNS));
  assert.strictEqual(h.current.visibility.date, false);
  assert.strictEqual(h.current.visibility.recipient, true);
  assert.strictEqual('bogus' in h.current.visibility, false);
});
