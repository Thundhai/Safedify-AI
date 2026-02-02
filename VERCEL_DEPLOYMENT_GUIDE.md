# Vercel Deployment Guide for Safedify AI Platform

## Overview

This guide explains how to deploy the Safedify AI Platform to Vercel. The project consists of two separate deployments:
1. **Frontend** - React/Vite application
2. **Backend** - Node.js/Express REST API

## Git Author Issue Resolution

### Problem
Vercel shows warning: "No GitHub account was found matching the commit author email address"

### Cause
The commits are authored by `Blackbox Agent <agent@blackbox.ai>` which is not linked to a GitHub account.

### Solutions

#### Option 1: Link Email to GitHub Account
1. Go to GitHub Settings → Emails
2. Add `agent@blackbox.ai` as a verified email
3. This will link past commits to your account

#### Option 2: Change Git Author (Future Commits)
```bash
git config user.name "Your Name"
git config user.email "your-github-email@example.com"
```

#### Option 3: Rewrite Commit History (Advanced)
⚠️ **Warning**: This rewrites history. Only use if you understand the implications.

```bash
# Backup your repository first
git clone /path/to/repo /path/to/backup

# Rewrite author for all commits
git filter-branch --env-filter '
OLD_EMAIL="agent@blackbox.ai"
CORRECT_NAME="Your Name"
CORRECT_EMAIL="your-github-email@example.com"

if [ "$GIT_COMMITTER_EMAIL" = "$OLD_EMAIL" ]
then
    export GIT_COMMITTER_NAME="$CORRECT_NAME"
    export GIT_COMMITTER_EMAIL="$CORRECT_EMAIL"
fi
if [ "$GIT_AUTHOR_EMAIL" = "$OLD_EMAIL" ]
then
    export GIT_AUTHOR_NAME="$CORRECT_NAME"
    export GIT_AUTHOR_EMAIL="$CORRECT_EMAIL"
fi
' --tag-name-filter cat -- --branches --tags

# Force push (careful!)
git push --force --tags origin 'refs/heads/*'
```

## Frontend Deployment

### Configuration
The frontend is configured in `/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install"
}
```

### Deployment Steps

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository

2. **Configure Project**
   - Framework Preset: **Vite**
   - Root Directory: **/** (root)
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Set Environment Variables**
   Required variables:
   - `VITE_API_URL` - Your backend API URL (e.g., `https://safedify-backend.vercel.app`)
   - `VITE_GEMINI_API_KEY` - Your Google Gemini API key

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy

### Environment Variables Setup

In Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_URL` | `https://your-backend-url.vercel.app` | Production, Preview |
| `VITE_GEMINI_API_KEY` | `your_gemini_api_key_here` | Production |

## Backend Deployment

### Configuration
The backend has a separate `vercel.json` in `/server/vercel.json`:

```json
{
  "version": 2,
  "name": "safedify-backend",
  "builds": [
    {
      "src": "src/server.ts",
      "use": "@vercel/node"
    }
  ]
}
```

### Deployment Steps

1. **Create Separate Project**
   - Create a **new Vercel project** for the backend
   - Import the **same GitHub repository**

2. **Configure Backend Project**
   - Framework Preset: **Other**
   - Root Directory: **/server**
   - Build Command: `npm install && npm run build`
   - Output Directory: `dist`

3. **Set Environment Variables**
   Required variables:
   - `NODE_ENV` - `production`
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Strong random secret (min 32 characters)
   - `JWT_EXPIRES_IN` - `7d`
   - `UPLOAD_MAX_SIZE` - `5242880`
   - `UPLOAD_DIR` - `/tmp/uploads`
   - `CORS_ORIGIN` - Your frontend URL

4. **Deploy**
   - Click "Deploy"

### Database Setup

#### Option 1: Vercel Postgres
1. In Backend Project → Storage → Create Database
2. Select **Postgres**
3. Copy the `POSTGRES_URL` environment variable
4. Run migrations:
   ```bash
   npm run migrate
   ```

#### Option 2: External PostgreSQL
Use any PostgreSQL provider:
- **Supabase** (recommended, has free tier)
- **Neon** (serverless PostgreSQL)
- **Railway**
- **AWS RDS**

Set `DATABASE_URL` in format:
```
postgresql://user:password@host:5432/database?sslmode=require
```

### Backend Environment Variables

In Vercel Dashboard → Backend Project → Settings → Environment Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection |
| `JWT_SECRET` | `your-secret-key-min-32-chars` | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `UPLOAD_MAX_SIZE` | `5242880` | Max upload size (5MB) |
| `UPLOAD_DIR` | `/tmp/uploads` | Upload directory |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app` | CORS allowed origin |

### Running Database Migrations

After deploying the backend:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link to backend project
cd server
vercel link

# Run migrations
vercel env pull .env.local
npm run migrate
```

Or manually run the SQL schema:
```bash
psql $DATABASE_URL < src/models/schema.sql
```

## Deployment Workflow

### Automatic Deployments
- **Production**: Pushes to `main` branch trigger production deployments
- **Preview**: Pull requests trigger preview deployments

### Manual Deployments
```bash
# Install Vercel CLI
npm i -g vercel

# Frontend deployment
vercel --prod

# Backend deployment
cd server
vercel --prod
```

## Post-Deployment Checklist

### Frontend
- [ ] Website loads correctly
- [ ] Environment variables are set
- [ ] API connection works
- [ ] Authentication flows work
- [ ] All routes are accessible

### Backend
- [ ] API endpoints respond correctly
- [ ] Database connection established
- [ ] Migrations have run successfully
- [ ] Authentication endpoints work
- [ ] File uploads work (test with small file)
- [ ] CORS configuration allows frontend

### Testing
```bash
# Test backend health
curl https://your-backend.vercel.app/health

# Test frontend
curl https://your-frontend.vercel.app

# Test API from frontend
# Login and check network tab in browser DevTools
```

## Common Issues & Solutions

### Issue: "No GitHub account found" Warning
**Solution**: See "Git Author Issue Resolution" section above

### Issue: Backend 404 Errors
**Solution**: Check `vercel.json` routes configuration and ensure root directory is set to `/server`

### Issue: Database Connection Failed
**Solutions**:
- Verify `DATABASE_URL` is correctly set
- Ensure PostgreSQL is accessible from Vercel IPs
- Check SSL mode in connection string (`?sslmode=require`)

### Issue: CORS Errors
**Solutions**:
- Set `CORS_ORIGIN` environment variable to your frontend URL
- Update `src/middleware/security.ts` if needed
- Ensure frontend uses correct backend URL

### Issue: Environment Variables Not Working
**Solutions**:
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)
- For frontend, ensure variables start with `VITE_`

### Issue: File Uploads Fail
**Solutions**:
- Vercel serverless functions use `/tmp` for storage
- Uploaded files are temporary and not persisted
- Consider using cloud storage (S3, Cloudinary) for production

## Production Considerations

### Security
- [ ] Use strong `JWT_SECRET` (minimum 32 random characters)
- [ ] Enable HTTPS only (Vercel does this automatically)
- [ ] Set appropriate `CORS_ORIGIN` (not `*`)
- [ ] Use environment-specific secrets
- [ ] Enable rate limiting in production

### Performance
- [ ] Enable Vercel Edge Caching where appropriate
- [ ] Optimize database queries with indexes
- [ ] Monitor serverless function execution time
- [ ] Set appropriate `maxDuration` for functions

### Monitoring
- [ ] Enable Vercel Analytics
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Monitor database performance
- [ ] Set up uptime monitoring

### Scaling
- [ ] Vercel automatically scales frontend
- [ ] Backend scales based on function concurrency
- [ ] Database may need separate scaling strategy
- [ ] Consider CDN for static assets

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         GitHub Repository               │
│  github.com/Thundhai/Safedify-AI        │
└─────────────┬───────────────────────────┘
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌──────────┐    ┌─────────────┐
│ Frontend │    │   Backend   │
│ Project  │    │   Project   │
│ (Root)   │    │  (/server)  │
└────┬─────┘    └──────┬──────┘
     │                 │
     │                 │
     ▼                 ▼
┌──────────┐    ┌─────────────┐
│  Vercel  │◄───│   Vercel    │
│ Frontend │    │   Backend   │
│  CDN     │    │  Functions  │
└────┬─────┘    └──────┬──────┘
     │                 │
     │                 ▼
     │          ┌─────────────┐
     │          │  PostgreSQL │
     │          │  Database   │
     │          └─────────────┘
     │
     ▼
┌──────────┐
│   User   │
└──────────┘
```

---

**Last Updated**: 2025-02-02
**Version**: 1.0.0
