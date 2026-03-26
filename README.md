# Cesium App Notes

This repo is a CesiumJS workspace with custom apps under `Apps/myapp` and a demo under `JiangDemo`.

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

## Pages

All pages are served from the same dev server (default `http://localhost:8080`):

- Window annotation (custom fields, CSV export)  
  `http://localhost:8080/Apps/myapp/GE_WongChukHung_annotation/GE3d_WongChuHung_annotation.html`

- Batch view capture (load CSV, filename field order, zip download)  
  `http://localhost:8080/Apps/myapp/ViewGenerationImage/GE3d.html`

- Jiang demo tileset viewer  
  `http://localhost:8080/JiangDemo/test.html`

## CSV Input

CSV files for the capture app are read from:

```
Apps/myapp/input
```

The page loads the list from:

```
GET /api/input-csv
```

## Tileset Notes

The capture page currently loads the tileset from:

```
https://livablecitylab.hkust-gz.edu.cn/HKUSTGZ_3D/Data/tileset.json
```

## Custom Script

Download a full 3D Tileset to local disk:

```powershell
node scripts/download-3dtiles.js --url "https://livablecitylab.hkust-gz.edu.cn/HKUSTGZ_3D/Data/tileset.json" --out ".\HKUSTGZ_3D_Download" --concurrency 12
```

If you are running in a folder without `type: module`, rename to `.mjs` and run the same command with `.mjs`.
