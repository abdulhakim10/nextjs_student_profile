# Attendance Admin Frontend — Docker & ECS Deployment

## Environment Variables

There are two categories of env vars:

### Build-time (NEXT*PUBLIC*\*)

These are baked into the JavaScript bundle during `next build`. They must be passed as `--build-arg` when building the Docker image.

| Variable                                | Description                   | Default                                  |
| --------------------------------------- | ----------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`              | User/general API base URL     | `https://devapi02.awfatech.com`          |
| `NEXT_PUBLIC_UTILITIES_API_BASE_URL`    | Utilities service base URL    | falls back to `NEXT_PUBLIC_API_BASE_URL` |
| `NEXT_PUBLIC_AUTH_API_BASE_URL`         | Auth service base URL         | `https://aws01.awfatech.com`             |
| `NEXT_PUBLIC_ATTENDANCE_API_BASE_URL`   | Attendance backend base URL   | `http://localhost:20019`                 |
| `NEXT_PUBLIC_NOTIFICATION_API_BASE_URL` | Notification service base URL | `https://devapi01.awfatech.com`          |
| `NEXT_PUBLIC_API_VERSION`               | API version prefix            | `v2`                                     |
| `NEXT_PUBLIC_DEFAULT_APP`               | Default app code              | `eboss`                                  |
| `NEXT_PUBLIC_DEFAULT_USER_TYPE`         | Default user type             | `staff`                                  |
| `NEXT_PUBLIC_APP_NAME`                  | App display name              | `Attendance Admin Dashboard`             |

### Runtime (server-only)

These are read by the Next.js server at runtime. Pass them as `-e` when running the container or in the ECS task definition.

| Variable            | Description                        |
| ------------------- | ---------------------------------- |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI assistant |

---

## Local Docker Build & Run

### 1. Build the image

```bash
cd frontend

docker build -t attendance-frontend .
```

### 2. Run the container

```bash
docker run -d -p 40001:40001 \
  -e ANTHROPIC_API_KEY=sk-ant-REDACTED \
  attendance-frontend
```

App will be available at `http://localhost:40001`.

---

## AWS ECS Deployment

### 1. Push image to ECR

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com

# Tag and push
docker tag attendance-frontend:latest <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/attendance-frontend:latest
docker push <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/attendance-frontend:latest
```

### 2. ECS Task Definition

Key settings for the container definition:

```json
{
  "containerDefinitions": [
    {
      "name": "attendance-frontend",
      "image": "<ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/attendance-frontend:latest",
      "portMappings": [
        {
          "containerPort": 40001,
          "protocol": "tcp"
        }
      ],
      "environment": [],
      "secrets": [
        {
          "name": "ANTHROPIC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:<ACCOUNT_ID>:secret:attendance/anthropic-api-key"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:40001/ || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      }
    }
  ],
  "cpu": "256",
  "memory": "512"
}
```

### 3. Service & Load Balancer

- Create an ECS service with desired count (e.g. 1–2 tasks)
- Attach an ALB target group pointing to container port 40001
- Configure ALB listener rules to route traffic to the target group
- Set up health check path: `/`

---

## CI/CD (GitHub Actions Example)

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: [frontend/**]

env:
  AWS_REGION: ap-southeast-1
  ECR_REPOSITORY: attendance-frontend
  ECS_CLUSTER: attendance-cluster
  ECS_SERVICE: attendance-frontend-service

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - id: ecr-login
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        working-directory: frontend
        run: |
          IMAGE=${{ steps.ecr-login.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}

          docker build \
            --build-arg NEXT_PUBLIC_API_BASE_URL=${{ vars.NEXT_PUBLIC_API_BASE_URL }} \
            --build-arg NEXT_PUBLIC_UTILITIES_API_BASE_URL=${{ vars.NEXT_PUBLIC_UTILITIES_API_BASE_URL }} \
            --build-arg NEXT_PUBLIC_AUTH_API_BASE_URL=${{ vars.NEXT_PUBLIC_AUTH_API_BASE_URL }} \
            --build-arg NEXT_PUBLIC_ATTENDANCE_API_BASE_URL=${{ vars.NEXT_PUBLIC_ATTENDANCE_API_BASE_URL }} \
            --build-arg NEXT_PUBLIC_NOTIFICATION_API_BASE_URL=${{ vars.NEXT_PUBLIC_NOTIFICATION_API_BASE_URL }} \
            -t $IMAGE .

          docker push $IMAGE

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment
```

Store `NEXT_PUBLIC_*` values as **GitHub repository variables** (Settings > Variables) and `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` as **GitHub secrets**.

---

## Environment File Loading (Local Development)

Next.js automatically sets `NODE_ENV` based on the command — you never set it manually:

| Command                        | `NODE_ENV`    | Env files loaded (highest priority first)                             |
| ------------------------------ | ------------- | --------------------------------------------------------------------- |
| `npm run dev` (`next dev`)     | `development` | `.env.development.local` > `.env.development` > `.env.local` > `.env` |
| `npm run build` (`next build`) | `production`  | `.env.production.local` > `.env.production` > `.env.local` > `.env`   |
| `npm run start` (`next start`) | `production`  | `.env.production.local` > `.env.production` > `.env.local` > `.env`   |

### Recommended file layout

| File                     | Purpose                                                | Git tracked?    |
| ------------------------ | ------------------------------------------------------ | --------------- |
| `.env`                   | Shared defaults (app name, version, non-secret values) | Yes             |
| `.env.local`             | Local secrets (`ANTHROPIC_API_KEY`) — **never commit** | No (gitignored) |
| `.env.development`       | Dev-specific URLs (localhost backends)                 | Yes             |
| `.env.production`        | Production URLs (live APIs)                            | Yes             |
| `.env.development.local` | Personal dev overrides — **never commit**              | No (gitignored) |
| `.env.production.local`  | Personal prod overrides — **never commit**             | No (gitignored) |

### Example setup

**`.env`** (shared defaults):

```
NEXT_PUBLIC_API_VERSION=v2
NEXT_PUBLIC_DEFAULT_APP=eboss
NEXT_PUBLIC_DEFAULT_USER_TYPE=staff
NEXT_PUBLIC_APP_NAME=Attendance Admin Dashboard
```

**`.env.development`** (dev URLs):

```
NEXT_PUBLIC_API_BASE_URL=https://devapi02.awfatech.com
NEXT_PUBLIC_UTILITIES_API_BASE_URL=https://devapi02.awfatech.com
NEXT_PUBLIC_AUTH_API_BASE_URL=https://aws01.awfatech.com
NEXT_PUBLIC_ATTENDANCE_API_BASE_URL=http://localhost:20019
NEXT_PUBLIC_NOTIFICATION_API_BASE_URL=https://devapi01.awfatech.com
```

**`.env.production`** (production URLs):

```
NEXT_PUBLIC_API_BASE_URL=https://api.yourapp.com
NEXT_PUBLIC_UTILITIES_API_BASE_URL=https://api.yourapp.com
NEXT_PUBLIC_AUTH_API_BASE_URL=https://auth.yourapp.com
NEXT_PUBLIC_ATTENDANCE_API_BASE_URL=https://attendance.yourapp.com
NEXT_PUBLIC_NOTIFICATION_API_BASE_URL=https://notification.yourapp.com
```

**`.env.local`** (secrets, gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

### Key rules

- **`NEXT_PUBLIC_*`** = exposed to the browser (baked into JS bundle at build time)
- **Without `NEXT_PUBLIC_`** = server-only (e.g. `ANTHROPIC_API_KEY`), never sent to browser
- Higher-priority files override lower ones (e.g. `.env.development` overrides `.env`)
- **Docker builds** don't use `.env` files — pass values via `--build-arg` (see above)

---

## Notes

- `NEXT_PUBLIC_*` vars are embedded at build time. To change them, you must rebuild the image.
- `ANTHROPIC_API_KEY` is runtime-only. Use AWS Secrets Manager to avoid storing it in plaintext.
- The image runs as non-root user `nextjs` (uid 1001) for security.
- Container listens on port 40001.
- Recommended ECS resources: 256 CPU / 512 MiB memory (adjust based on traffic).
