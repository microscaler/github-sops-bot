# GitHub SOPS Bot

GitHub App (built with Probot) that automatically manages GPG keys for repositories subscribed to secret management by listening to GitHub webhook events.

## Overview

This is a **GitHub App** that runs as a service and listens to GitHub webhook events. When repositories subscribe to secret management, the bot automatically:

1. **Listens for events** - Receives webhook events from GitHub (push, repository.created)
2. **Detects subscriptions** - Checks for `.github/secret-management.yaml` with `subscribe: true`
3. **Generates GPG keys** - Creates a GPG key pair named `{org}/{repo}`
4. **Stores private key** - Saves the private key in GitHub Secrets as `GPG_KEY` (base64 encoded)
5. **Commits public key** - Commits the public key to `.github/.gpg` in the repository

**Important:** This bot runs as a GitHub App service that receives webhook events from GitHub. It must be deployed to a platform that can receive HTTP webhooks and configured in your GitHub organization settings.

## Quick Start

1. **Create GitHub App** → [See detailed instructions](#github-app-setup)
2. **Deploy the bot** → Deploy to a platform that can receive webhooks (see [Deployment](#deployment))
3. **Configure webhook URL** → Set the webhook URL in GitHub App settings to point to your deployed bot
4. **Install app on organization** → Grant permissions and install on repositories
5. **Subscribe repositories** → Create `.github/secret-management.yaml` in repositories

For detailed instructions, see [GitHub App Setup](#github-app-setup) and [Deployment](#deployment) sections below.

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

## How It Works

This bot operates as a **GitHub App** that:

1. **Receives webhook events** from GitHub when repositories are created or files are pushed
2. **Processes events** to detect `.github/secret-management.yaml` files
3. **Generates GPG keys** for subscribed repositories
4. **Stores keys** securely using GitHub's API

The bot must be:
- **Deployed** to a platform accessible via HTTPS (to receive webhooks)
- **Configured** as a GitHub App in your organization settings
- **Installed** on the repositories where you want secret management

## Installation

### Prerequisites

- GitHub organization admin access (to create and install GitHub App)
- A deployment platform that can receive HTTPS webhooks (see [Deployment](#deployment))
- GPG installed and available in PATH (on the deployment platform)
- Node.js 18+ (if deploying from source)

### Step-by-Step Installation

#### 1. Create GitHub App

First, create a GitHub App in your organization. See [GitHub App Setup](#github-app-setup) for detailed instructions.

#### 2. Deploy the Bot

Deploy the bot to a platform that can receive webhooks. See [Deployment](#deployment) section for options.

#### 3. Configure Webhook URL

Update your GitHub App settings with the webhook URL of your deployed bot.

#### 4. Install the App

Install the GitHub App on your organization and grant permissions to repositories.

#### 5. Subscribe Repositories

Create `.github/secret-management.yaml` files in repositories to enable secret management.

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

## Deployment

The bot must be deployed to a platform that can receive HTTPS webhooks from GitHub. The deployment platform needs:

- **HTTPS endpoint** accessible from the internet
- **GPG installed** and available in PATH
- **Environment variables** configured (APP_ID, PRIVATE_KEY, WEBHOOK_SECRET)

### Recommended Deployment Platforms

#### GitHub App Hosting Services

- **[Glitch](https://glitch.com/)** - Easy hosting for Probot apps (recommended for quick setup)
- **[Railway](https://railway.app/)** - Modern deployment platform
- **[Heroku](https://www.heroku.com/)** - Traditional PaaS

#### Self-Hosted Options

If you need to host the bot yourself, you can deploy it to:

- **Docker container** on any platform
- **Cloud Run** (GCP), **Lambda** (AWS), or similar serverless platforms
- **VPS** or **Kubernetes** cluster (if you have infrastructure)

### Environment Variables

Required environment variables:

- `APP_ID` - GitHub App ID (from GitHub App settings)
- `PRIVATE_KEY` or `PRIVATE_KEY_PATH` - GitHub App private key
- `WEBHOOK_SECRET` - Webhook secret (set when creating GitHub App)

Optional:
- `LOG_LEVEL` - Logging level (default: `info`)
- `PORT` - HTTP port (default: `3000`)

### Docker Image

The bot is published to GitHub Container Registry:

- `ghcr.io/microscaler/github-sops-bot:latest`
- `ghcr.io/microscaler/github-sops-bot:v1.0.0` (for tagged releases)

### Example: Deploying with Docker

```bash
docker run -d \
  -e APP_ID=your-app-id \
  -e PRIVATE_KEY="$(cat private-key.pem)" \
  -e WEBHOOK_SECRET=your-webhook-secret \
  -p 3000:3000 \
  ghcr.io/microscaler/github-sops-bot:latest
```

**Important:** Ensure the container has GPG installed and the port is accessible via HTTPS (use a reverse proxy or load balancer if needed).

## Development

### Local Development Setup

For local development, use [smee.io](https://smee.io) to forward webhooks:

1. Install smee CLI:
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
   npm install
   npm run dev
   ```

### Testing

```bash
npm test
```

## Related Components

- **GitHub Actions**: Custom actions in `github.com/microscaler/get-users-with-access-on-repo` and `github.com/microscaler/sops-encryption-generator`
- **Pre-commit Hooks**: Validation scripts in the main repository
- **Workflows**: GitHub Actions workflows that use the bot

## License

[Add your license here]
