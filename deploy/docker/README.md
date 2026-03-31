# Full Stack Docker Deployment

This compose file runs a complete cloud-ready chain:

- `viewcapture-web`: unified workspace (login + project management + annotation + capture)
- `postgres`: platform persistence
- `redis`: session store
- optional legacy pipeline containers from your `.tar` images

## 1) Prepare

From repo root:

```bash
mkdir -p deploy/docker/runtime/input deploy/docker/runtime/output
```

Put CSV files into `deploy/docker/runtime/input/`.

## 2) Start Core Stack

```bash
docker compose -f deploy/docker/docker-compose.full.yml up -d --build
```

Open:

- `http://<server-ip>:8080/`

## 3) Start Legacy Chain (Optional)

Load image tar files first:

```bash
docker load -i docker_images/windowviewservice_v4.tar
docker load -i docker_images/windowviewdisplayv2.tar
docker load -i docker_images/redis_wvi.tar
docker load -i docker_images/pgsql_wvi.tar
```

Then start legacy profile:

```bash
docker compose -f deploy/docker/docker-compose.full.yml --profile legacy up -d
```

By default this repo now starts legacy AI in **CPU mode** (`WVI_FORCE_CPU=1`).
If you want GPU later:

```bash
WVI_FORCE_CPU=0 CUDA_VISIBLE_DEVICES=0 NVIDIA_VISIBLE_DEVICES=all \
docker compose -f deploy/docker/docker-compose.full.yml --profile legacy up -d
```

Notes about model weights:

- If you use `windowviewservice_v4.tar`, weights are already inside the image.
- If you run from source volume (`/model`) instead, keep the checkpoint files under:
  - `deeplabv3/trained_checkpoints/...`
  - `deeplabv3/pytorch-deeplab-xception-master/models/*.pth`

Legacy exposed ports:

- display: `8081`
- service: `5000`
- redis: `6380`
- postgres: `5433`

## 4) Stop

```bash
docker compose -f deploy/docker/docker-compose.full.yml down
```
