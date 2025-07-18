# Docker Setup for Resource Planner

This guide explains how to run the Resource Planner application using Docker containers.

## Architecture

The application consists of three main services:

- **Frontend**: React/Vite application served by Nginx
- **Backend**: Node.js/Express API with Prisma ORM
- **Database**: PostgreSQL database

## Prerequisites

- Docker and Docker Compose installed on your system
- At least 4GB of available RAM
- Ports 80, 3001, and 5432 available on your machine

## Quick Start

1. **Clone and navigate to the project directory**:

   ```bash
   cd /path/to/your/cursor-jobs
   ```

2. **Build and start all services**:

   ```bash
   docker-compose up --build
   ```

3. **Access the application**:
   - Frontend: http://localhost (port 80)
   - Backend API: http://localhost:3001
   - Database: localhost:5432 (accessible for debugging)

## Detailed Commands

### First Time Setup

```bash
# Build all images and start services
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Day-to-Day Usage

```bash
# Start existing containers
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart backend

# View logs for a specific service
docker-compose logs -f frontend
```

### Development Commands

```bash
# Rebuild a specific service
docker-compose build backend
docker-compose up -d backend

# Execute commands inside containers
docker-compose exec backend sh
docker-compose exec database psql -U postgres -d resource_planner

# View database logs
docker-compose logs database
```

### Data Management

```bash
# Reset database (destroys all data)
docker-compose down -v
docker volume rm cursor-jobs_postgres_data
docker-compose up --build

# Backup database
docker-compose exec database pg_dump -U postgres resource_planner > backup.sql

# Restore database
docker-compose exec -T database psql -U postgres resource_planner < backup.sql
```

## Troubleshooting

### Common Issues

1. **Port conflicts**:

   ```bash
   # Check what's using the ports
   lsof -i :80
   lsof -i :3001
   lsof -i :5432

   # Modify docker-compose.yml to use different ports if needed
   ```

2. **Permission errors**:

   ```bash
   # Fix Docker permissions (Linux/Mac)
   sudo chown -R $USER:$USER .
   ```

3. **Database connection issues**:

   ```bash
   # Check if database is healthy
   docker-compose exec database pg_isready -U postgres

   # View database logs
   docker-compose logs database
   ```

4. **Frontend not loading**:

   ```bash
   # Check if backend is accessible
   curl http://localhost:3001/api/health

   # Verify nginx configuration
   docker-compose exec frontend nginx -t
   ```

5. **npm authentication errors during build**:

   ```bash
   # If you see "Unable to authenticate" or SSL certificate errors during Docker build
   # This usually happens when package-lock.json references private registries
   # or when there are SSL/TLS certificate verification issues
   # The Dockerfiles skip package-lock.json and configure npm/Node.js for SSL issues
   # Common errors include:
   # - npm: "unable to get local issuer certificate"
   # - Prisma: "request to binaries.prisma.sh failed"

   # If issues persist, try clearing Docker build cache:
   docker system prune -a
   docker-compose build --no-cache

   # Note: For development, SSL verification is disabled for npm and Node.js
   # This includes: npm strict-ssl=false, NODE_TLS_REJECT_UNAUTHORIZED=0
   # For production, re-enable SSL verification for security.
   ```

6. **TypeScript compilation errors during frontend build**:

   ```bash
   # If you see TypeScript errors like "error TS6133: 'variable' is declared but its value is never read"
   # The frontend Dockerfile uses a more permissive TypeScript configuration for Docker builds
   # This handles unused imports/variables that would otherwise fail the build
   # The application will still function correctly

   # To fix TypeScript errors in development:
   cd resourcePlanner
   npm run lint:fix  # Auto-fix some issues
   # Or manually remove unused imports and variables

   # The Docker build uses tsconfig.build.json which disables noUnusedLocals/noUnusedParameters
   ```

7. **Backend API errors**:

   ```bash
   # Check backend logs
   docker-compose logs backend

   # Verify database schema
   docker-compose exec backend npx prisma db pull
   ```

8. **Missing database tables**:

   ```bash
   # If you see "table does not exist" errors, the database schema wasn't created
   # The backend uses 'prisma db push' to create tables from schema.prisma
   # Check if the database initialization completed:
   docker-compose logs backend

   # Look for lines like:
   # "Your database is now in sync with your schema."
   # "Generated Prisma Client"

   # If tables are still missing, recreate containers:
   docker-compose down -v
   docker-compose up --build

   # This will destroy all data and recreate the database with proper schema
   ```

### Service Health Checks

The docker-compose configuration includes health checks:

- Database: `pg_isready` check every 10 seconds
- Backend: HTTP health endpoint check every 30 seconds
- Frontend: Depends on backend health

### Performance Tips

1. **Use bind mounts for development**:
   Add volume mounts to docker-compose.yml for live reloading:

   ```yaml
   backend:
     volumes:
       - ./resourcePlannerBackend/src:/app/src
   ```

2. **Optimize build context**:
   The `.dockerignore` files exclude unnecessary files from builds

3. **Use Docker layer caching**:
   Dependencies are installed before copying source code for better caching

## Configuration

### Environment Variables

Copy `resourcePlannerBackend/env.example` to create your own environment file:

```bash
cp resourcePlannerBackend/env.example resourcePlannerBackend/.env
```

### Database Configuration

Default PostgreSQL settings:

- Database: `resource_planner`
- Username: `postgres`
- Password: `password`
- Port: `5432`

### Nginx Configuration

The frontend nginx configuration in `resourcePlanner/nginx.conf`:

- Serves static files with caching
- Proxies `/api/*` requests to backend
- Handles React Router client-side routing
- Includes security headers

### SSL Configuration (Development vs Production)

**Development Configuration** (current setup):

- npm: `strict-ssl false` - Disables SSL verification for package downloads
- Node.js: `NODE_TLS_REJECT_UNAUTHORIZED=0` - Disables SSL verification for all HTTPS requests
- Required for: Corporate networks, proxy servers, or environments with certificate issues

**Production Configuration** (recommended):

- npm: `strict-ssl true` - Enables SSL verification for security
- Node.js: Remove `NODE_TLS_REJECT_UNAUTHORIZED` - Default secure behavior
- Ensure proper SSL certificates and network configuration

## Production Deployment

For production deployment, use the provided production configuration:

```bash
# Copy and configure production environment
cp env.prod.example .env.prod
# Edit .env.prod with your secure values

# Deploy with production overrides
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Consider these additional production requirements:

1. **Security**:

   - Change default database passwords
   - Use secrets management
   - Enable HTTPS with SSL certificates
   - Restrict database port access
   - **Re-enable SSL verification for security**:
     - `npm config set strict-ssl true`
     - Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from environment variables
     - Configure proper SSL certificates and certificate authorities

2. **Performance**:

   - Use multi-stage builds for smaller images
   - Enable Nginx gzip compression
   - Configure proper caching headers
   - Use a reverse proxy (like Traefik or nginx-proxy)

3. **Monitoring**:

   - Add health check endpoints
   - Configure log aggregation
   - Set up monitoring and alerting

4. **Scaling**:
   - Use Docker Swarm or Kubernetes for orchestration
   - Configure horizontal scaling for backend
   - Use external database service (RDS, etc.)

## Volumes and Data Persistence

- Database data is persisted in the `postgres_data` Docker volume
- Frontend assets are built into the image (no persistence needed)
- Backend logs can be accessed via `docker-compose logs`

To completely reset the application:

```bash
docker-compose down -v --remove-orphans
docker system prune -a
```
