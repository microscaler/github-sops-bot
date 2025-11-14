/**
 * GitHub SOPS Bot
 * 
 * Probot app that automatically manages GPG keys for repositories
 * subscribed to secret management.
 * 
 * This bot:
 * 1. Monitors repositories for .github/secret-management.yaml
 * 2. Creates GPG key pairs for subscribed repositories
 * 3. Stores private key in GitHub Secrets (GPG_KEY)
 * 4. Commits public key to .github/.gpg
 */

import { Probot } from 'probot';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';
import sodium from 'libsodium-wrappers';

interface SecretManagementConfig {
  apiVersion: string;
  _extends?: string;
  subscribe: boolean;
  optionalPathRegex?: string;
}

interface GPGKeyPair {
  privateKey: string;
  publicKey: string;
  fingerprint: string;
}

/**
 * Generate a GPG key pair for a repository
 */
function generateGPGKeyPair(org: string, repo: string): GPGKeyPair {
  // Create a temporary GPG home directory
  const gpgHome = `/tmp/gpg-${crypto.randomUUID()}`;
  fs.mkdirSync(gpgHome, { recursive: true });

  // Key name: org/repo
  const keyName = `${org}/${repo}`;

  // Generate GPG key batch file
  const batchContent = `Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: ${keyName}
Name-Comment: GitHub SOPS Secret Management
Name-Email: noreply@github.com
Expire-Date: 0
%no-protection
%commit
`;

  const batchFile = path.join(gpgHome, 'batch.txt');
  fs.writeFileSync(batchFile, batchContent);

  try {
    // Generate GPG key
    execSync(`gpg --batch --gen-key ${batchFile}`, {
      env: { ...process.env, GNUPGHOME: gpgHome },
      stdio: 'pipe',
    });

    // Get key fingerprint
    const fingerprintOutput = execSync(
      `gpg --list-keys --fingerprint --with-colons`,
      {
        env: { ...process.env, GNUPGHOME: gpgHome },
        encoding: 'utf-8',
      }
    );

    const fingerprintLine = fingerprintOutput
      .split('\n')
      .find((line) => line.startsWith('fpr::'));

    if (!fingerprintLine) {
      throw new Error('Failed to extract fingerprint');
    }

    const fingerprint = fingerprintLine.split(':')[9];

    // Export private key
    const privateKeyOutput = execSync(
      `gpg --armor --export-secret-keys ${fingerprint}`,
      {
        env: { ...process.env, GNUPGHOME: gpgHome },
        encoding: 'utf-8',
      }
    );

    // Export public key
    const publicKeyOutput = execSync(
      `gpg --armor --export ${fingerprint}`,
      {
        env: { ...process.env, GNUPGHOME: gpgHome },
        encoding: 'utf-8',
      }
    );

    return {
      privateKey: privateKeyOutput,
      publicKey: publicKeyOutput,
      fingerprint,
    };
  } finally {
    // Cleanup
    fs.rmSync(gpgHome, { recursive: true, force: true });
  }
}

/**
 * Parse secret management configuration from YAML
 */
function parseSecretManagementConfig(content: string): SecretManagementConfig {
  const doc = yaml.load(content) as any;

  if (!doc) {
    throw new Error('Empty YAML document');
  }

  if (!doc.apiVersion) {
    throw new Error('Missing apiVersion');
  }

  if (typeof doc.subscribe !== 'boolean') {
    throw new Error('Missing or invalid subscribe field');
  }

  return {
    apiVersion: doc.apiVersion,
    _extends: doc._extends,
    subscribe: doc.subscribe,
    optionalPathRegex: doc.optionalPathRegex,
  };
}

/**
 * Check if repository has secret management subscription
 */
async function checkSecretManagementSubscription(
  octokit: any,
  owner: string,
  repo: string
): Promise<SecretManagementConfig | null> {
  const path = '.github/secret-management.yaml';

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: 'HEAD',
    });

    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    const config = parseSecretManagementConfig(content);
    return config;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Store private key in GitHub Secrets using libsodium sealed box encryption
 */
async function storePrivateKeyInSecrets(
  octokit: any,
  owner: string,
  repo: string,
  privateKey: string
): Promise<void> {
  console.log('Storing private key in GitHub Secrets:');
  console.log(`  Repository: ${owner}/${repo}`);
  console.log(`  Secret Name: GPG_KEY`);

  try {
    // Base64 encode the private key
    const privateKeyBase64 = Buffer.from(privateKey).toString('base64');

    // Get repository public key for encryption
    const { data: publicKeyData } = await octokit.actions.getRepoPublicKey({
      owner,
      repo,
    });

    console.log(`  Public Key ID: ${publicKeyData.key_id}`);

    // Initialize libsodium
    await sodium.ready;

    // Convert base64 strings to Uint8Array
    const messageBytes = Buffer.from(privateKeyBase64, 'utf-8');
    const keyBytes = Buffer.from(publicKeyData.key, 'base64');

    // Encrypt using libsodium sealed box (public key encryption)
    const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);
    const encryptedValue = Buffer.from(encryptedBytes).toString('base64');

    // Store encrypted secret in GitHub Secrets
    await octokit.actions.createOrUpdateRepoSecret({
      owner,
      repo,
      secret_name: 'GPG_KEY',
      encrypted_value: encryptedValue,
      key_id: publicKeyData.key_id,
    });

    console.log('  ✅ Successfully stored GPG_KEY secret');
  } catch (error: any) {
    console.error('  ❌ Failed to store secret:', error.message);
    if (error.response) {
      console.error('  Response status:', error.response.status);
      console.error('  Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Commit public key to repository
 */
async function commitPublicKey(
  octokit: any,
  owner: string,
  repo: string,
  publicKey: string
): Promise<void> {
  const filePath = '.github/.gpg';
  const message = 'chore: Add GPG public key for SOPS secret management';
  const branch = 'main'; // Will be determined from default branch

  // Get repository default branch
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  // Check if file already exists
  let fileExists = false;
  let fileSha: string | undefined;

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: defaultBranch,
    });
    fileExists = true;
    fileSha = (data as any).sha;
  } catch (error: any) {
    if (error.status !== 404) {
      throw error;
    }
  }

  if (fileExists) {
    console.log(`  ℹ️  Public key already exists at ${filePath}`);
    return;
  }

  // Get latest commit SHA
  const { data: branchData } = await octokit.repos.getBranch({
    owner,
    repo,
    branch: defaultBranch,
  });

  const baseTreeSha = branchData.commit.commit.tree.sha;

  // Create blob with public key
  const { data: blobData } = await octokit.git.createBlob({
    owner,
    repo,
    content: publicKey,
    encoding: 'utf-8',
  });

  // Create tree
  const { data: treeData } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: [
      {
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      },
    ],
  });

  // Create commit
  const { data: commitData } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: treeData.sha,
    parents: [branchData.commit.sha],
  });

  // Update branch reference
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
    sha: commitData.sha,
  });

  console.log(`  ✅ Committed public key to ${owner}/${repo}:${filePath}`);
}

/**
 * Process a repository for secret management
 */
async function processRepository(
  octokit: any,
  owner: string,
  repo: string
): Promise<void> {
  console.log(`Processing repository: ${owner}/${repo}`);

  // Check if repository has secret management subscription
  const config = await checkSecretManagementSubscription(octokit, owner, repo);

  if (!config) {
    console.log('  ℹ️  Repository does not have secret-management.yaml');
    return;
  }

  if (!config.subscribe) {
    console.log('  ℹ️  Repository has secret-management.yaml but subscribe=false');
    return;
  }

  console.log('  ✅ Repository is subscribed to secret management');
  console.log(`  API Version: ${config.apiVersion}`);
  if (config.optionalPathRegex) {
    console.log(`  Path Regex: ${config.optionalPathRegex}`);
  }

  // Check if GPG key already exists
  try {
    await octokit.repos.getContent({
      owner,
      repo,
      path: '.github/.gpg',
      ref: 'HEAD',
    });
    console.log('  ℹ️  GPG public key already exists (.github/.gpg)');
    console.log('  Skipping key generation');
    return;
  } catch (error: any) {
    if (error.status !== 404) {
      throw error;
    }
  }

  // Generate GPG key pair
  console.log('  Generating GPG key pair...');
  const keyPair = generateGPGKeyPair(owner, repo);
  console.log('  ✅ Generated key pair');
  console.log(`  Fingerprint: ${keyPair.fingerprint}`);

  // Store private key in GitHub Secrets
  console.log('  Storing private key in GitHub Secrets...');
  await storePrivateKeyInSecrets(octokit, owner, repo, keyPair.privateKey);

  // Commit public key to repository
  console.log('  Committing public key to repository...');
  await commitPublicKey(octokit, owner, repo, keyPair.publicKey);

  console.log(`  ✅ Successfully processed repository: ${owner}/${repo}`);
}

export default (app: Probot) => {
  // Listen for push events (when secret-management.yaml is created/modified)
  app.on('push', async (context) => {
    const { owner, repo } = context.repo();
    const files = context.payload.commits
      .flatMap((commit) => commit.added.concat(commit.modified));

    // Check if secret-management.yaml was added or modified
    if (files.includes('.github/secret-management.yaml')) {
      console.log(`Detected secret-management.yaml change in ${owner}/${repo}`);
      await processRepository(context.octokit, owner, repo);
    }
  });

  // Listen for repository creation events
  app.on('repository.created', async (context) => {
    const { owner, repo } = context.repo();
    console.log(`New repository created: ${owner}/${repo}`);
    await processRepository(context.octokit, owner, repo);
  });

  // Manual trigger via repository_dispatch
  app.on('repository_dispatch', async (context) => {
    const { owner, repo } = context.repo();
    const eventType = context.payload.action;

    if (eventType === 'process-secret-management') {
      console.log(`Manual trigger for ${owner}/${repo}`);
      await processRepository(context.octokit, owner, repo);
    }
  });
};

