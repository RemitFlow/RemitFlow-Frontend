/**
 * test/security/dependency-audit.test.js
 *
 * Smoke tests that verify the dependency-audit configuration is wired up
 * correctly in the project so CI will actually catch critical findings.
 *
 * These tests run in the Vitest unit environment and do NOT invoke npm audit
 * directly (that would be slow and network-dependent).  The live audit runs as
 * a dedicated CI step (`npm audit --audit-level=critical`).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const rootDir = resolve(import.meta.dirname, '../..');

function readJson(rel) {
  return JSON.parse(readFileSync(resolve(rootDir, rel), 'utf8'));
}

function readText(rel) {
  return readFileSync(resolve(rootDir, rel), 'utf8');
}

// ─── package.json audit script ───────────────────────────────────────────────

describe('package.json – audit script', () => {
  const pkg = readJson('package.json');

  it('defines an "audit" script', () => {
    expect(pkg.scripts).toHaveProperty('audit');
  });

  it('audit script runs npm audit at critical level', () => {
    expect(pkg.scripts.audit).toContain('npm audit');
    expect(pkg.scripts.audit).toContain('--audit-level=critical');
  });

  it('test script includes the security test folder', () => {
    expect(pkg.scripts.test).toContain('test/security');
  });
});

// ─── CI workflow wires up the audit step ─────────────────────────────────────

describe('CI workflow – npm audit step present', () => {
  const ci = readText('.github/workflows/ci.yml');

  it('ci.yml contains an npm audit step', () => {
    expect(ci).toContain('npm audit');
  });

  it('ci.yml audit step uses --audit-level=critical', () => {
    expect(ci).toContain('--audit-level=critical');
  });

  it('audit step appears before the test step (fail fast)', () => {
    const auditIdx = ci.indexOf('npm audit');
    const testIdx = ci.indexOf('npm test');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(testIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(testIdx);
  });
});

// ─── Security headers plugin is registered in vite config ────────────────────

describe('vite.config.js – security-headers plugin registered', () => {
  const viteConfig = readText('vite.config.js');

  it('imports securityHeaders plugin', () => {
    expect(viteConfig).toContain('vite-plugin-security-headers');
  });

  it('registers securityHeaders() in plugins array', () => {
    expect(viteConfig).toMatch(/securityHeaders\s*\(\s*\)/);
  });
});
