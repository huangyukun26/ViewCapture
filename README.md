# Cesium App Notes

This repo is a CesiumJS workspace with custom apps under `Apps/myapp`.

## Start Server

From repo root:

```powershell
npm install
npm start
```

Notes:
- `npm start` runs `node server.js --production` (port 8080 by default).
- You can override port: `node server.js --production --port 8081`
- To listen on all interfaces: `node server.js --public --production --port 8080`
- Hardened public mode (recommended on server):
  - Linux/macOS:
    `CITYVISIONLAB_HARDEN_PUBLIC=1 CORS_ORIGINS="https://cityvisionlab.cn,https://www.cityvisionlab.cn" node server.js --public --production --port 8080`
  - Windows PowerShell:
    `$env:CITYVISIONLAB_HARDEN_PUBLIC='1'; $env:CORS_ORIGINS='https://cityvisionlab.cn,https://www.cityvisionlab.cn'; node server.js --public --production --port 8080`

## Pages

All pages are served from the same dev server (default `http://localhost:8080`):

- CityVisionLab home (service navigation)  
  `http://localhost:8080/Apps/myapp/index.html`

- Window annotation (custom fields, CSV export)  
  `http://localhost:8080/Apps/myapp/GE_WongChukHung_annotation/GE3d_WongChuHung_annotation.html`

- Batch view capture (load CSV, filename field order, zip download)  
  `http://localhost:8080/Apps/myapp/ViewGenerationImage/GE3d.html`

## CSV Input

The capture page supports loading CSV from local file/folder selection in browser.

## Tileset Notes

Both annotation and capture pages currently use Cesium Google Photorealistic 3D Tiles.

## Deployment

- PM2 config: `ecosystem.config.cjs`
- Nginx example: `deploy/nginx/cityvisionlab.cn.conf`
- Health check endpoint: `GET /healthz`

In hardened public mode:
- `/proxy/*` is disabled
- legacy `/data -> D:/` static mirror is disabled
- CORS is restricted to configured origins

## Custom Script

Download a full 3D Tileset to local disk:

```powershell
node scripts/download-3dtiles.js --url "https://livablecitylab.hkust-gz.edu.cn/HKUSTGZ_3D/Data/tileset.json" --out ".\HKUSTGZ_3D_Download" --concurrency 12
```

If you are running in a folder without `type: module`, rename to `.mjs` and run the same command with `.mjs`.
