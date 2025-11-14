# Agent Guide - GitHub SOPS Bot

This guide helps AI agents understand how to work with the GitHub SOPS Bot repository.

## 🎯 Quick Start

1. **Check GitHub Issues First** - Always review open issues before starting work
2. **Follow Issue Templates** - Use existing issues as guidance for new work
3. **Update Issues** - Keep issues updated with progress and findings

## 📋 Working with Issues

### Finding Relevant Issues

```bash
# List all open issues
gh issue list --repo microscaler/github-sops-bot

# Search for specific issues
gh issue list --repo microscaler/github-sops-bot --label "bug"
gh issue list --repo microscaler/github-sops-bot --label "enhancement"

# View issue details
gh issue view <ISSUE_NUMBER> --repo microscaler/github-sops-bot
```

### Issue Labels

- `bug` - Bugs that need fixing
- `enhancement` - New features or improvements
- `documentation` - Documentation updates
- `security` - Security-related changes
- `ci/cd` - CI/CD pipeline changes
- `docker` - Docker-related changes
- `dependencies` - Dependency updates

### Creating New Issues

When creating new issues, use the template format:

```markdown
## Description
[Clear description of the issue or feature]

## Current Behavior
[What currently happens]

## Expected Behavior
[What should happen]

## Steps to Reproduce (for bugs)
1. Step one
2. Step two

## Files Affected
- `path/to/file`

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

## 🔍 Before Starting Work

1. **Check Open Issues**
   - Review `.github/ISSUES.md` for documented issues
   - Check GitHub for open issues: `gh issue list --repo microscaler/github-sops-bot`
   - Look for related issues that might be duplicates

2. **Understand the Architecture**
   - Read `README.md` for bot architecture
   - Understand it's a **GitHub App** (not Kubernetes service)
   - Know it listens to webhook events

3. **Review Recent Changes**
   - Check git log: `git log --oneline -10`
   - Review recent PRs: `gh pr list --repo microscaler/github-sops-bot`

## 🛠️ Development Workflow

### 1. Create or Assign Issue

```bash
# Create new issue
gh issue create \
  --repo microscaler/github-sops-bot \
  --title "Issue title" \
  --body-file issue-body.md \
  --label "bug"

# Assign issue to yourself
gh issue edit <ISSUE_NUMBER> \
  --repo microscaler/github-sops-bot \
  --add-assignee @me
```

### 2. Create Branch

```bash
# Create branch from issue number
git checkout -b fix/issue-<NUMBER>-short-description

# Or use issue title
git checkout -b fix/dockerfile-nodejs-build
```

### 3. Make Changes

- Follow existing code patterns
- Use yarn for all builds
- Write tests for new features
- Update documentation

### 4. Update Issue

```bash
# Add comment to issue
gh issue comment <ISSUE_NUMBER> \
  --repo microscaler/github-sops-bot \
  --body "Progress update: Implemented X, testing Y"
```

### 5. Create PR

```bash
# Create PR linked to issue
gh pr create \
  --repo microscaler/github-sops-bot \
  --title "Fix: Issue title" \
  --body "Fixes #<ISSUE_NUMBER>" \
  --base main
```

### 6. Close Issue

When PR is merged, the issue will be automatically closed if PR body includes `Fixes #<NUMBER>`.

## 📚 Key Files to Know

- `README.md` - Main documentation
- `.github/ISSUES.md` - Documented issues and fixes
- `package.json` - Dependencies and scripts
- `Dockerfile` - Container build configuration
- `src/index.ts` - Main bot logic
- `.github/workflows/publish.yml` - CI/CD workflow

## 🚨 Important Rules

1. **Always use yarn** - Never use npm
2. **Check issues first** - Don't duplicate work
3. **Update issues** - Keep stakeholders informed
4. **Follow patterns** - Match existing code style
5. **Test changes** - Run `yarn build` before committing
6. **Document changes** - Update README if needed

## 🔗 Related Resources

- **Repository:** https://github.com/microscaler/github-sops-bot
- **Issues:** https://github.com/microscaler/github-sops-bot/issues
- **Probot Docs:** https://probot.github.io/
- **GitHub Apps:** https://docs.github.com/en/apps

## 📝 Issue Templates

See `.github/ISSUES.md` for examples of well-documented issues.

## ✅ Checklist Before PR

- [ ] Issue created or assigned
- [ ] Branch created from main
- [ ] Changes made and tested
- [ ] `yarn build` succeeds
- [ ] Documentation updated
- [ ] Issue updated with progress
- [ ] PR created with issue reference

---

**Remember:** Always check issues first, update them as you work, and link PRs to issues!

