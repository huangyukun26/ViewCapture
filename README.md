# CityVisionLab WindowViewCapture

Unified web workspace for:

- login + project management
- window annotation
- batch view capture
- semantic analysis (AI backend proxy)
- admin dashboard

All modules are served from the same Node server (`server.js`), with clean public routes.

## Highlights (Current)

- Workspace keeps annotation/capture/analysis/admin inside one page via in-page module switching.
- Semantic analysis module supports:
  - image upload
  - CSV upload (including folder selection)
  - job queue polling
  - result inspection and JSON export
- Admin supports full CRUD for users/projects/jobs and runtime AI backend URL configuration.

## 1. Local Start

From repo root:

```powershell
npm install
npm start
```

Default URL: `http://localhost:8080`

### Optional start modes

- public bind:
  `node server.js --public --production --port 8080`
- hardened public mode:
  - Linux/macOS:
    `CITYVISIONLAB_HARDEN_PUBLIC=1 CORS_ORIGINS="https://cityvisionlab.cn,https://www.cityvisionlab.cn" node server.js --public --production --port 8080`
  - PowerShell:
    `$env:CITYVISIONLAB_HARDEN_PUBLIC='1'; $env:CORS_ORIGINS='https://cityvisionlab.cn,https://www.cityvisionlab.cn'; node server.js --public --production --port 8080`

## 2. Main Routes

- `/` or `/portal`: unified login page
- `/workspace`: unified workspace (project/data/job panel + embedded tools)
- `/annotation`: annotation module shell
- `/capture`: capture module shell
- `/analysis`: semantic analysis module shell
- `/analysis/examples`: semantic analysis instruction + downloadable example files
- `/admin`: admin dashboard shell
- `/healthz`: service health
- `/api/platform/health`: platform backend health

Internal legacy pages are still present, but you should use the clean routes above.

## 3. Platform API (New)

Mounted at `/api/platform`:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /projects`
- `POST /projects`
- `PATCH /projects/:projectId`
- `DELETE /projects/:projectId`
- `GET /jobs`
- `POST /jobs`
- `PATCH /jobs/:jobId/status`
- `GET /admin/summary`
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/:userId`
- `PATCH /admin/users/:userId/role`
- `DELETE /admin/users/:userId`
- `GET /admin/projects`
- `POST /admin/projects`
- `PATCH /admin/projects/:projectId`
- `DELETE /admin/projects/:projectId`
- `GET /admin/jobs`
- `PATCH /admin/jobs/:jobId`
- `DELETE /admin/jobs/:jobId`
- `GET /admin/ai-config`
- `PATCH /admin/ai-config`
- `POST /admin/ai-config/test`

AI backend proxy (requires login):

- `/api/platform/ai/*` -> forwards to runtime AI URL (default `http://127.0.0.1:5000`)
- examples:
  - `POST /api/platform/ai/upload`
  - `POST /api/platform/ai/upload_csv`
  - `GET /api/platform/ai/job/:jobId/status`

GPU service handoff:

- Legacy AI backend can run in CPU mode first (default in `deploy/docker/docker-compose.full.yml`).
- When GPU server is ready, admin can update AI URL in `/admin` page without redeploy.
- Runtime config persists at `data/platform/runtime-config.json`.

CPU self-check (Conda):

```powershell
$env:CUDA_VISIBLE_DEVICES='-1'
conda run -n windpred python `
  windowview_tool_USTGZ_0327/windowview_tool_USTGZ/backend_v2/backend_v2/volume/window_view_service/deeplabv3/pytorch-deeplab-xception-master/predict_window_view_analysis_v1.py `
  --device cpu --gpu_id -1 `
  --input windowview_tool_USTGZ_0327/windowview_tool_USTGZ/test_images `
  --save_pred_results_to windowview_tool_USTGZ_0327/windowview_tool_USTGZ/backend_v2/backend_v2/volume/window_view_service/deeplabv3/pytorch-deeplab-xception-master/imageset/segmented_images_cpu_test `
  --ckpt windowview_tool_USTGZ_0327/windowview_tool_USTGZ/backend_v2/backend_v2/volume/window_view_service/deeplabv3/trained_checkpoints/cim_wv2060/deepresnet_16/checkpoint_300.pth.tar
```

Weights note:

- Running from legacy image tar (`windowviewservice_v4.tar`): weights are built in.
- Running from source/conda: keep local `.pth/.pth.tar` checkpoint files.

Storage backend selection:

- If `PLATFORM_DATABASE_URL` is provided: PostgreSQL
- Else fallback: `data/platform/store.json`

Session backend selection:

- If `PLATFORM_REDIS_URL` is provided: Redis
- Else fallback: in-memory sessions

Bootstrap admin (optional, defaults provided):

- `PLATFORM_BOOTSTRAP_ADMIN_USERNAME` (default `admin`)
- `PLATFORM_BOOTSTRAP_ADMIN_PASSWORD` (default `admin12345`)

Important:

- CSV workflow is browser-local now. Users should load CSV files/folders from web file picker.
- Workspace no longer depends on server-side `Apps/myapp/input` listing.
- Legacy semantic-segmentation sample files are bundled under `Apps/myapp/portal/examples/semantic-analysis/`.

## 4. Docker Full Stack (Cloud)

Files:

- `deploy/docker/Dockerfile`
- `deploy/docker/docker-compose.full.yml`
- `deploy/docker/README.md`

Quick run:

```bash
docker compose -f deploy/docker/docker-compose.full.yml up -d --build
```

This starts:

- `viewcapture-web` (unified app)
- `postgres` (platform data)
- `redis` (sessions)

Optional legacy profile is supported for your provided image tar files (`windowviewservice_v4`, `windowviewdisplayv2`, `redis_wvi`, `pgsql_wvi`).

## 5. Production Nginx + PM2

- PM2 config: `ecosystem.config.cjs`
- Nginx sample: `deploy/nginx/cityvisionlab.cn.conf`

## 6. 3D Tiles Download Script

```powershell
node scripts/download-3dtiles.js --url "https://livablecitylab.hkust-gz.edu.cn/HKUSTGZ_3D/Data/tileset.json" --out ".\HKUSTGZ_3D_Download" --concurrency 12
```
