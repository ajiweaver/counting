# Counting Battle! Deployment Guide

This project uses GitHub Actions for CI/CD with manual deployment triggers.

## Architecture

- **Backend**: Node.js + Socket.IO on Railway
- **Frontend**: Static files on Netlify
- **Database**: In-memory (for demo purposes)

## Required Secrets

Add these secrets to your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Railway Secrets
- `RAILWAY_TOKEN`: Your Railway API token
  - Get from: Railway Dashboard > Account Settings > Tokens
- `RAILWAY_SERVICE_ID`: Your Railway service ID
  - Get from: Railway project URL or CLI: `railway status`

### Netlify Secrets  
- `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
  - Get from: Netlify Dashboard > Account Settings > Applications > Personal access tokens
- `NETLIFY_SITE_ID`: Your Netlify site ID
  - Get from: Site settings > General > Site information

## Deployment Workflows

### 1. Manual Backend Deployment
- **Workflow**: `Deploy Backend to Railway`
- **Trigger**: Manual via GitHub Actions tab
- **What it does**: Deploys Node.js server to Railway
- **Options**: Production or Staging environment

### 2. Manual Frontend Deployment  
- **Workflow**: `Deploy Frontend to Netlify`
- **Trigger**: Manual via GitHub Actions tab  
- **What it does**: Deploys static files to Netlify
- **Options**: Production or Preview deployment

### 3. Full Stack Deployment
- **Workflow**: `Deploy Full Stack`
- **Trigger**: Manual via GitHub Actions tab
- **What it does**: Deploys both backend and frontend with health checks
- **Options**: Choose backend/frontend individually + environment

## How to Deploy

1. **Go to GitHub Actions tab** in your repository
2. **Select a workflow** from the left sidebar
3. **Click "Run workflow"** button
4. **Choose options** (environment, components to deploy)
5. **Click "Run workflow"** to start deployment

## Disabling Auto-Deploy

### Railway
1. Go to your Railway project settings
2. Under "Source" settings, disable auto-deploy
3. Set deploy trigger to "Manual" or remove GitHub integration

### Netlify  
1. Go to Site Settings > Build & Deploy
2. Under "Continuous Deployment", click "Edit settings"
3. Set "Branch deploys" to "None" or "Stop builds"
4. Or remove the GitHub integration entirely

## Environment Variables

### Production Backend (Railway)
```
NODE_ENV=production
PORT=3000 (automatically set by Railway)
```

### Production Frontend (Netlify)
No environment variables needed - all configuration is in the JavaScript files.

## Monitoring

- **Backend Health**: https://counting-production.up.railway.app/health
- **Backend API**: https://counting-production.up.railway.app/
- **Frontend**: https://your-site.netlify.app

## Rollback Strategy

If deployment fails:
1. Check the GitHub Actions logs
2. For Railway: Use Railway dashboard to rollback to previous deployment
3. For Netlify: Use Netlify dashboard to rollback to previous deployment
4. Or trigger a new deployment from a known-good commit

## Development Workflow

1. **Make changes** and commit to feature branch
2. **Create Pull Request** for code review
3. **Merge to main** branch (no auto-deploy)
4. **Manually trigger deployment** via GitHub Actions
5. **Monitor deployment** and run health checks

This setup gives you full control over when deployments happen while maintaining automation and proper CI/CD practices.
