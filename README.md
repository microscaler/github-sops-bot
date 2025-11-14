# GitHub SOPS Bot

GitHub Probot app that automatically manages GPG keys for repositories subscribed to secret management.

## Overview

This bot monitors repositories for `.github/secret-management.yaml` files and automatically:

1. **Detects subscriptions** - Checks for `.github/secret-management.yaml` with `subscribe: true`
2. **Generates GPG keys** - Creates a GPG key pair named `{org}/{repo}`
3. **Stores private key** - Saves the private key in GitHub Secrets as `GPG_KEY` (base64 encoded)
4. **Commits public key** - Commits the public key to `.github/.gpg` in the repository

Built with [Probot](https://probot.github.io/) - a framework for building GitHub Apps in Node.js.

## Quick Start

1. **Create GitHub App** → [See detailed instructions](#github-app-setup)
2. **Install dependencies** → `npm install`
3. **Configure environment** → Create `.env` file
4. **Install app on organization** → Grant permissions
5. **Deploy** → Choose your platform
6. **Subscribe repositories** → Create `.github/secret-management.yaml`

For detailed instructions, see [Installation](#installation) and [GitHub App Setup](#github-app-setup) sections below.

## Deployment

### Using Published Docker Image

The bot is automatically published to GitHub Container Registry (ghcr.io) when:
- Code is pushed to `main` or `master` branch
- A new tag starting with `v` is created (e.g., `v1.0.0`)

The published image is available at:
- `ghcr.io/microscaler/github-sops-bot:latest`
- `ghcr.io/microscaler/github-sops-bot:v1.0.0` (for tagged releases)
- `ghcr.io/microscaler/github-sops-bot:main` (for main branch)

### Running with Docker

```bash
docker run -d \
  -e APP_ID=your-app-id \
  -e PRIVATE_KEY="$(cat private-key.pem)" \
  -e WEBHOOK_SECRET=your-webhook-secret \
  -e GITHUB_CLIENT_ID=your-client-id \
  -e GITHUB_CLIENT_SECRET=your-client-secret \
  -p 3000:3000 \
  ghcr.io/microscaler/github-sops-bot:latest
```

### Running with Docker Compose

```yaml
version: '3'
services:
  github-sops-bot:
    image: ghcr.io/microscaler/github-sops-bot:latest
    environment:
      APP_ID: ${APP_ID}
      PRIVATE_KEY: ${PRIVATE_KEY}
      WEBHOOK_SECRET: ${WEBHOOK_SECRET}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
    ports:
      - "3000:3000"
    restart: unless-stopped
```

### Running on Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: github-sops-bot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: github-sops-bot
  template:
    metadata:
      labels:
        app: github-sops-bot
    spec:
      containers:
      - name: bot
        image: ghcr.io/microscaler/github-sops-bot:latest
        env:
        - name: APP_ID
          valueFrom:
            secretKeyRef:
              name: github-sops-bot-secrets
              key: app-id
        - name: PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: github-sops-bot-secrets
              key: private-key
        - name: WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: github-sops-bot-secrets
              key: webhook-secret
        ports:
        - containerPort: 3000
```

## Secret Management Configuration

Repositories subscribe to secret management by creating `.github/secret-management.yaml`:

```yaml
apiVersion: secret-management/v1
_extends: .github
subscribe: true
optionalPathRegex: microservices/.*/deployment-configuration/.*/application\.secrets\.env$
```

### Configuration Fields

- `apiVersion`: Must be `secret-management/v1`
- `subscribe`: `true` to enable secret management for this repository
- `optionalPathRegex`: Optional regex pattern for secret file paths
- `_extends`: Optional reference to parent configuration

## Installation

### Prerequisites

- Node.js 18+ 
- GPG installed and available in PATH (`gpg --version` to verify)
- GitHub organization admin access (to create and install GitHub App)
- A GitHub App created (see [GitHub App Setup](#github-app-setup) below)

### Step-by-Step Installation

#### 1. Clone or Navigate to Bot Directory

```bash
git clone https://github.com/microscaler/github-sops-bot.git
cd github-sops-bot
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Build TypeScript

```bash
npm run build
```

#### 4. Configure Environment

Create a `.env` file in the root directory:

```bash
APP_ID=your-app-id
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
WEBHOOK_SECRET=your-webhook-secret
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

#### 5. Run Locally

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## GitHub App Setup

### Creating a GitHub App

1. Go to your organization's settings
2. Navigate to **Developer settings** → **GitHub Apps**
3. Click **New GitHub App**
4. Fill in the app details:
   - **Name**: `SOPS Secret Management Bot`
   - **Homepage URL**: Your bot's homepage
   - **Webhook URL**: `https://your-bot-domain.com` (for production) or use a tool like [smee.io](https://smee.io) for local development
   - **Webhook secret**: Generate a random secret and save it
5. Set permissions:
   - **Repository permissions**:
     - Contents: **Read & write**
     - Secrets: **Write**
     - Metadata: **Read-only**
6. Subscribe to events:
   - **Push**
   - **Repository**
7. Click **Create GitHub App**

### Installing the App

1. After creating the app, click **Install App**
2. Choose which repositories to install it on (or all repositories)
3. Click **Install**

### Getting Credentials

After installation, you'll need:

- **App ID**: Found on the app's general settings page
- **Private Key**: Generate one from the app's settings page
- **Webhook Secret**: The secret you set when creating the app
- **Client ID** and **Client Secret**: Found on the app's general settings page

## Development

### Local Development Setup

1. Install [smee.io](https://smee.io) CLI:
   ```bash
   npm install -g smee-client
   ```

2. Start smee to forward webhooks:
   ```bash
   smee -u https://smee.io/your-channel -p 3000
   ```

3. Update your GitHub App's webhook URL to the smee.io URL

4. Run the bot in development mode:
   ```bash
   npm run dev
   ```

### Testing

```bash
npm test
```

## Publishing

This bot is automatically published to GitHub Container Registry (ghcr.io) when:
- Code is pushed to `main` or `master` branch
- A new tag starting with `v` is created (e.g., `v1.0.0`)

The published image is available at:
- `ghcr.io/microscaler/github-sops-bot:latest`
- `ghcr.io/microscaler/github-sops-bot:v1.0.0` (for tagged releases)
- `ghcr.io/microscaler/github-sops-bot:main` (for main branch)

## Related Components

- **GitHub Actions**: Custom actions in `github.com/microscaler/get-users-with-access-on-repo` and `github.com/microscaler/sops-encryption-generator`
- **Pre-commit Hooks**: Validation scripts in the main repository
- **Workflows**: GitHub Actions workflows that use the bot

## License

[Add your license here]
