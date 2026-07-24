import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Lighthouse CI configuration', () => {
  it('targets the local preview server and enforces minimum quality thresholds', () => {
    const configPath = path.resolve(process.cwd(), 'lighthouserc.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(config.ci.collect.startServerCommand).toContain('npm run preview');
    expect(config.ci.collect.url).toContain('http://127.0.0.1:4173/');
    expect(config.ci.assert.assertions['categories:performance']).toEqual([
      'warn',
      { minScore: 0.8 },
    ]);
    expect(config.ci.assert.assertions['categories:accessibility']).toEqual([
      'warn',
      { minScore: 0.9 },
    ]);
  });
});
