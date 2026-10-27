// Metro no empaqueta el worker de MapLibre GL: lo servimos como archivo estático desde public/.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'),
  path.join(root, 'public/maplibre-gl-worker.mjs'),
);
