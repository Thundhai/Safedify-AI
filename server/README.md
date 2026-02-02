# Safedify HSE Platform - Backend API

Secure Node.js/Express backend for the Safedify AI HSE Management Platform.

## Features

- **Secure Authentication**: JWT-based authentication with refresh tokens
- **Role-Based Access Control (RBAC)**: Granular permissions system
- **PostgreSQL Database**: Robust relational database with proper indexing
- **Input Validation**: Comprehensive validation and sanitization
- **Security Best Practices**:
  - Helmet.js for security headers
  - CORS protection
  - Rate limiting
  - Bcrypt password hashing
  - SQL injection prevention via parameterized queries
  - XSS protection
- **File Upload**: Secure file handling with type validation
- **API Documentation**: RESTful API design

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+

## Installation

1. Install dependencies:
```bash
cd server
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set your configuration:
- Database credentials
- JWT secret (must be changed in production)
- CORS origin
- Other settings

3. Set up PostgreSQL database:
```bash
# Create database
createdb safedify_db

# Run migrations
npm run migrate
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| POST | `/refresh` | Refresh access token | No |
| POST | `/logout` | Logout user | Yes |
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update profile | Yes |
| POST | `/change-password` | Change password | Yes |

### Incidents (`/api/v1/incidents`)

| Method | Endpoint | Description | Permission Required |
|--------|----------|-------------|---------------------|
| GET | `/` | Get all incidents | - |
| GET | `/:id` | Get incident by ID | - |
| POST | `/` | Create incident | `create_incident` |
| PUT | `/:id` | Update incident | `manage_incidents` |
| DELETE | `/:id` | Delete incident | `manage_incidents` |
| GET | `/stats` | Get statistics | - |

## Security Features

### 1. Authentication & Authorization
- JWT tokens with expiration
- Refresh token rotation
- Password hashing with bcrypt (12 rounds)
- Role-based access control
- Permission-based authorization

### 2. Input Validation
- Express-validator for all inputs
- SQL injection prevention
- XSS protection
- Type validation
- Length validation

### 3. Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- Prevents brute force attacks

### 4. Security Headers
- Helmet.js configuration
- HSTS enabled
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options

### 5. File Upload Security
- File type validation
- Size limits (10MB default)
- Unique filename generation
- Secure storage

### 6. Database Security
- Parameterized queries
- Connection pooling
- Automatic timestamps
- Foreign key constraints
- Indexes for performance

## Database Schema

Key tables:
- `users` - User accounts
- `roles` - Role definitions with permissions
- `incidents` - Safety incidents
- `inspections` - Safety inspections
- `permits` - Work permits
- `risk_assessments` - Risk assessments
- `workers` - Worker profiles
- `training_records` - Training history
- `assets` - Equipment and assets
- `contractors` - Contractor management

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 5000 |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_NAME | Database name | safedify_db |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | - |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | Access token expiry | 7d |
| BCRYPT_ROUNDS | Password hash rounds | 12 |
| CORS_ORIGIN | Allowed CORS origins | http://localhost:5173 |

## Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # Database connection
│   │   └── environment.ts # Environment config
│   ├── controllers/     # Request handlers
│   │   ├── authController.ts
│   │   └── incidentController.ts
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts      # Authentication
│   │   ├── security.ts  # Security headers, CORS, rate limiting
│   │   ├── validation.ts # Input validation
│   │   └── upload.ts    # File upload handling
│   ├── models/          # Database models
│   │   └── schema.sql   # Database schema
│   ├── routes/          # API routes
│   │   ├── authRoutes.ts
│   │   └── incidentRoutes.ts
│   ├── scripts/         # Utility scripts
│   │   └── migrate.ts   # Database migration
│   └── server.ts        # Main application
├── .env.example         # Environment template
├── package.json
└── tsconfig.json
```

## Production Deployment Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Set NODE_ENV=production
- [ ] Use strong database password
- [ ] Configure proper CORS_ORIGIN
- [ ] Enable HTTPS
- [ ] Set up SSL/TLS for database connection
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Enable database backups
- [ ] Review rate limiting settings
- [ ] Set up process manager (PM2)
- [ ] Configure reverse proxy (nginx)

## Testing

```bash
# Test database connection
npm run migrate

# Test API health
curl http://localhost:5000/health

# Test registration
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password123","role":"Worker"}'
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `.env`
- Ensure database exists: `psql -l`

### Migration Errors
- Drop and recreate database if needed
- Check PostgreSQL version compatibility
- Verify schema.sql syntax

## License

MIT

## Support

For issues and questions, please refer to the main project repository.
