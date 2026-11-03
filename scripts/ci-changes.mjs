import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ciFiles = new Set([
  '.github/workflows/ci.yml',
  'scripts/ci-changes.mjs',
  'scripts/ci-changes.test.mjs',
]);

export function classifyChanges(files) {
  const lightweight = file =>
    ['README.md', 'CLAUDE.md', 'LICENSE'].includes(file) ||
    file.startsWith('docs/') ||
    ciFiles.has(file);

  return {
    appChanged: files.some(file => !lightweight(file)),
    formatFiles: files.filter(file => lightweight(file) && /\.(md|mdx|mjs|json|ya?ml)$/.test(file)),
  };
}

export function changedFiles(
  base,
  head,
  eventName,
  git = (...args) => execFileSync('git', args, { encoding: 'utf8' })
) {
  if (![base, head].every(sha => /^[a-f0-9]{40}$/.test(sha))) {
    throw new Error('Expected explicit GitHub base and head commit SHAs');
  }
  if (/^0+$/.test(base)) {
    return git('ls-tree', '-r', '--name-only', '-z', head).split('\0').filter(Boolean);
  }
  // A PR can be behind main. Only changes since its merge-base belong to that PR.
  const diffBase = eventName === 'pull_request' ? git('merge-base', base, head).trim() : base;
  // Report renames as deletion + addition, so moving app code into docs cannot skip app CI.
  return git('diff', '--name-only', '--no-renames', '-z', diffBase, head)
    .split('\0')
    .filter(Boolean);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = changedFiles(
    process.env.CI_BASE_SHA,
    process.env.CI_HEAD_SHA,
    process.env.GITHUB_EVENT_NAME
  );
  const result = classifyChanges(files);
  const output =
    [
      `app_changed=${result.appChanged}`,
      `format_files=${JSON.stringify(result.formatFiles.filter(file => existsSync(file)))}`,
    ].join('\n') + '\n';
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
  console.log(output);
}
