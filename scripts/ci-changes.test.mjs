import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { changedFiles, classifyChanges } from './ci-changes.mjs';

test('README, documentation assets, and classifier maintenance avoid app builds', () => {
  assert.equal(
    classifyChanges(['README.md', 'docs/setup.md', 'docs/screenshot.png']).appChanged,
    false
  );
  assert.equal(
    classifyChanges([
      '.github/workflows/ci.yml',
      'scripts/ci-changes.mjs',
      'scripts/ci-changes.test.mjs',
    ]).appChanged,
    false
  );
});

test('runtime Markdown, code, dependencies, and unknown paths still run app CI', () => {
  for (const file of [
    'content/blog/post.md',
    'app/page.tsx',
    'package-lock.json',
    'next.config.ts',
    '.github/workflows/deploy-production.yml',
    'new-file',
  ]) {
    assert.equal(classifyChanges(['README.md', file]).appChanged, true, file);
  }
});

test('Git comparisons retain app deletions/renames and use the PR merge-base', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'bleep-ci-changes-'));
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' });
  const commit = message => {
    git('add', '.');
    git('-c', 'user.name=CI Test', '-c', 'user.email=ci@example.invalid', 'commit', '-m', message);
    return git('rev-parse', 'HEAD').trim();
  };
  try {
    git('init', '-b', 'main');
    mkdirSync(path.join(directory, 'app'));
    writeFileSync(path.join(directory, 'app/page.tsx'), 'runtime');
    writeFileSync(path.join(directory, 'README.md'), 'docs');
    const base = commit('base');
    git('checkout', '-b', 'docs');
    writeFileSync(path.join(directory, 'README.md'), 'updated docs');
    const docsHead = commit('docs');
    git('checkout', 'main');
    writeFileSync(path.join(directory, 'app/page.tsx'), 'new runtime');
    const advancedMain = commit('main advanced');
    assert.equal(
      classifyChanges(changedFiles(advancedMain, docsHead, 'pull_request', git)).appChanged,
      false
    );
    git('checkout', 'docs');
    mkdirSync(path.join(directory, 'docs'));
    renameSync(path.join(directory, 'app/page.tsx'), path.join(directory, 'docs/example.md'));
    const renameHead = commit('move app file');
    const moved = changedFiles(base, renameHead, 'pull_request', git);
    assert.ok(moved.includes('app/page.tsx'));
    assert.equal(classifyChanges(moved).appChanged, true);
    assert.equal(
      classifyChanges(changedFiles('0'.repeat(40), renameHead, 'push', git)).appChanged,
      false
    );
    assert.equal(classifyChanges(changedFiles(base, advancedMain, 'push', git)).appChanged, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('invalid event SHAs fail instead of silently skipping application checks', () => {
  assert.throws(() => changedFiles(undefined, 'a'.repeat(40), 'push'));
});
