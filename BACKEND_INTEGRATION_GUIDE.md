# Backend Integration Guide

This guide explains how to integrate the frontend with the newly created backend API.

## Overview

A complete, secure backend has been created in the `/server` directory with:

- **Authentication & Authorization**: JWT-based auth with refresh tokens
- **Database**: PostgreSQL with comprehensive schema
- **Security**: Helmet, CORS, rate limiting, input validation
- **API Endpoints**: RESTful endpoints for all resources

## Quick Start

### 1. Set Up Backend

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Set up database
createdb safedify_db  # Create PostgreSQL database
npm run migrate       # Run migrations

# Start backend server
npm run dev           # Development mode
```

The backend will run on `http://localhost:5000`

### 2. Configure Frontend

```bash
# In the root directory
cp .env.example .env.local

# Edit .env.local and add:
VITE_API_URL=http://localhost:5000/api/v1
```

### 3. Switch to Backend Services

The frontend currently uses localStorage-based mock services. To switch to the backend:

#### Option A: Gradual Migration (Recommended)

Update services one at a time:

**Example: Auth Service**

```typescript
// In src/services/authService.ts
import { backendLogin, backendRegister, backendLogout } from './backendAuthService';

// Replace existing functions:
export const login = backendLogin;
export const register = backendRegister;
export const logout = backendLogout;
```

**Example: Incident Service**

Create a new file or update existing storage service:

```typescript
// In src/services/storageService.ts
import {
  backendGetIncidents,
  backendCreateIncident,
  backendUpdateIncident
} from './backendIncidentService';

// Replace localStorage functions with backend calls
export const getIncidents = async () => {
  const response = await backendGetIncidents();
  return response.incidents;
};

export const saveIncident = backendCreateIncident;
export const updateIncident = backendUpdateIncident;
```

#### Option B: Full Backend Mode

Set an environment variable to toggle between mock and real backend:

```typescript
// src/services/config.ts
export const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

// In service files:
import { USE_BACKEND } from './config';

export const getIncidents = USE_BACKEND
  ? backendGetIncidents
  : localGetIncidents;
```

## Available Backend Services

### 1. API Service (`src/services/apiService.ts`)

Centralized HTTP client with automatic token refresh:

```typescript
import api from './services/apiService';

// GET request
const data = await api.get('/incidents');

// POST request
const result = await api.post('/incidents', incidentData);

// File upload
await api.uploadFile('/upload', file, 'image');
```

### 2. Auth Service (`src/services/backendAuthService.ts`)

```typescript
import {
  backendLogin,
  backendRegister,
  backendLogout,
  backendGetProfile,
  backendUpdateProfile,
  backendChangePassword
} from './services/backendAuthService';

// Login
const user = await backendLogin('email@example.com', 'password');

// Register
const newUser = await backendRegister('Name', 'email@example.com', 'password', 'Worker');

// Get profile
const profile = await backendGetProfile();

// Update profile
await backendUpdateProfile('New Name', 'newemail@example.com');

// Change password
await backendChangePassword('oldPassword', 'newPassword');
```

### 3. Incident Service (`src/services/backendIncidentService.ts`)

```typescript
import {
  backendGetIncidents,
  backendGetIncidentById,
  backendCreateIncident,
  backendUpdateIncident,
  backendDeleteIncident,
  backendGetIncidentStats
} from './services/backendIncidentService';

// Get incidents with pagination
const response = await backendGetIncidents(1, 50);
console.log(response.incidents);
console.log(response.pagination);

// Filter by status
const openIncidents = await backendGetIncidents(1, 50, 'Open');

// Create incident
const newIncident = await backendCreateIncident({
  description: 'Safety issue',
  date: new Date().toISOString(),
  location: 'Site A',
  type: 'Near Miss',
  severity: 'Medium',
  images: [],
  reporter: 'User Name',
  status: 'Open'
});

// Get statistics
const stats = await backendGetIncidentStats();
```

## API Endpoints Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user |
| `/auth/login` | POST | Login user |
| `/auth/logout` | POST | Logout user |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/profile` | GET | Get user profile |
| `/auth/profile` | PUT | Update profile |
| `/auth/change-password` | POST | Change password |

### Incidents

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `/incidents` | GET | List incidents | - |
| `/incidents/:id` | GET | Get incident | - |
| `/incidents` | POST | Create incident | `create_incident` |
| `/incidents/:id` | PUT | Update incident | `manage_incidents` |
| `/incidents/:id` | DELETE | Delete incident | `manage_incidents` |
| `/incidents/stats` | GET | Get statistics | - |

## Security Features

### 1. Token Management

Tokens are automatically managed by the `apiService`:

- Access tokens stored in localStorage
- Automatic refresh on expiry
- Automatic redirect to login on auth failure

### 2. Permission Checking

Backend validates permissions on every request:

```typescript
// Frontend check (optional, for UI)
const canManage = checkPermission('manage_incidents');

// Backend automatically enforces permissions
// No need to handle manually
```

### 3. Input Validation

All inputs are validated on the backend:

- Email format
- Password strength (8+ chars, uppercase, lowercase, number)
- Required fields
- Data types
- Length limits

### 4. Rate Limiting

- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes

## Error Handling

The API service throws `ApiError` objects:

```typescript
import { ApiError } from './services/apiService';

try {
  await api.post('/incidents', data);
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Status:', error.status);
    console.log('Message:', error.message);
    console.log('Details:', error.details);

    // Handle specific errors
    if (error.status === 401) {
      // Unauthorized - redirect to login
    } else if (error.status === 403) {
      // Forbidden - show permission error
    } else if (error.status === 400) {
      // Validation error - show error details
    }
  }
}
```

## Migration Checklist

- [ ] Backend server running and healthy (`/health` endpoint)
- [ ] Database created and migrated
- [ ] Environment variables configured
- [ ] Frontend `.env.local` configured with `VITE_API_URL`
- [ ] Auth service switched to backend
- [ ] Test login/register functionality
- [ ] Incident service switched to backend
- [ ] Test CRUD operations
- [ ] Error handling implemented
- [ ] Permission checks updated
- [ ] File upload tested (if applicable)

## Development Workflow

### Frontend Only (Current)
```bash
npm run dev  # Port 5173
```

### Full Stack (Frontend + Backend)
```bash
# Terminal 1 - Backend
cd server
npm run dev  # Port 5000

# Terminal 2 - Frontend
npm run dev  # Port 5173
```

## Production Deployment

### Backend Deployment

1. Set environment variables (see `server/README.md`)
2. Build backend: `npm run build`
3. Run migrations: `npm run migrate`
4. Start server: `npm start`

### Frontend Deployment

1. Update `VITE_API_URL` to production backend URL
2. Build: `npm run build`
3. Deploy `dist/` folder

## Troubleshooting

### CORS Errors
Update `CORS_ORIGIN` in backend `.env`:
```
CORS_ORIGIN=http://localhost:5173,https://yourdomain.com
```

### Token Expiry
Tokens automatically refresh. If issues persist:
1. Clear localStorage
2. Login again
3. Check backend logs

### Database Connection
```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d safedify_db

# Check if database exists
psql -l

# Rerun migrations
npm run migrate
```

### API Not Responding
1. Check backend is running: `curl http://localhost:5000/health`
2. Check database connection in logs
3. Verify `.env` configuration

## Next Steps

1. **Complete Migration**: Migrate all services (inspections, permits, workers, etc.)
2. **Add More Endpoints**: Implement remaining CRUD operations
3. **Real-time Updates**: Add WebSocket support for live updates
4. **File Upload UI**: Implement file upload components
5. **Error Boundaries**: Add React error boundaries
6. **Testing**: Add integration tests

## Resources

- Backend README: `server/README.md`
- Database Schema: `server/src/models/schema.sql`
- API Service: `src/services/apiService.ts`
- Example Services: `src/services/backendAuthService.ts`

## Support

For issues or questions:
1. Check backend logs: `server/logs/`
2. Check browser console for frontend errors
3. Verify API requests in Network tab
4. Review this guide and backend README
