// Sunset Courier — the hand-in program (Node 22, standard library only).
//
// It takes this repository's game/ (the playable static files) and
// screenshots/ (three or four renders of the game itself) and writes them
// to the output directory, together with /output/dossier.json, the summary
// the judge reads, built by the vendored make.fun library.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, from the competition's gate: the dossier text
// holds at most 160 KiB, at most four screenshots of at most 256 KiB each,
// and game/ holds at most 993 files and directories and 48 MiB in all.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Fail fast with a readable message when the hand-in is incomplete, so a
// missing file shows up here instead of as a DossierError from the library.
function requireFile(path, what) {
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`Sunset Courier hand-in is missing ${what}: ${path}`);
  }
}

requireFile(join(repoRoot, 'game', 'index.html'), 'the game entrypoint');
const shotNames = readdirSync(join(repoRoot, 'screenshots')).filter((name) =>
  /\.(png|jpe?g|webp)$/i.test(name),
);
if (shotNames.length === 0 || shotNames.length > DOSSIER_CAPS.screenshots.max) {
  throw new Error(
    `Sunset Courier needs 1-${DOSSIER_CAPS.screenshots.max} screenshots, found ${shotNames.length}.`,
  );
}
for (const name of shotNames) {
  const size = statSync(join(repoRoot, 'screenshots', name)).size;
  if (size > DOSSIER_CAPS.screenshots.max_bytes) {
    throw new Error(`Screenshot ${name} is ${size} bytes, over the 256 KiB cap.`);
  }
}

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(join(dir, entry.name));
    else if (entry.isFile()) n += 1;
  }
  return n;
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, DOSSIER_CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const gameFiles = countFiles(join(outDir, 'game'));
const shotFiles = readdirSync(join(outDir, 'screenshots')).filter((name) =>
  statSync(join(outDir, 'screenshots', name)).isFile(),
);
const shotSizes = shotFiles
  .map((name) => `${name} ${Math.round(statSync(join(outDir, 'screenshots', name)).size / 1024)} KiB`)
  .join(', ');
console.log(
  `Sunset Courier handed in: ${gameFiles} game files, ${shotFiles.length} screenshots (${shotSizes}), dossier ${dossier.length} bytes.`,
);
