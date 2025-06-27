# 🐳 MarketPulse Docker Setup

This guide explains how to run MarketPulse locally using Docker containers.

## 📋 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your machine
- [Docker Compose](https://docs.docker.com/compose/install/) installed (usually comes with Docker Desktop)

## 🚀 Quick Start

### 1. Clone and Navigate to Project
```bash
git clone <your-repo-url>
cd marketpulse-frontend-new
```

### 2. Environment Variables
The Docker Compose file includes all necessary environment variables. For custom configurations, you can:

- Create a `.env.local` file with your custom variables
- Modify the environment section in `docker-compose.yml`

### 3. Run Development Environment
```bash
# Build and start the development container
docker-compose up marketpulse-dev --build

# Or run in detached mode (background)
docker-compose up marketpulse-dev -d --build
```

The application will be available at: **http://localhost:3000**

## 📁 Available Docker Configurations

### Development Mode (`Dockerfile.dev`)
- **Purpose**: Local development with hot reloading
- **Features**:
  - Source code is mounted as a volume for real-time changes
  - Uses `pnpm dev` for development server
  - Includes all dev dependencies
  - Environment: `development`

### Production Mode (`Dockerfile`)
- **Purpose**: Optimized production build
- **Features**:
  - Multi-stage build for smaller image size
  - Standalone Next.js output
  - Runs with minimal privileges
  - Environment: `production`

## 🛠️ Docker Commands

### Development
```bash
# Start development environment
docker-compose up marketpulse-dev

# Build and start
docker-compose up marketpulse-dev --build

# Run in background
docker-compose up marketpulse-dev -d

# View logs
docker-compose logs marketpulse-dev

# Stop containers
docker-compose down

# Restart specific service
docker-compose restart marketpulse-dev
```

### Production (Optional)
```bash
# Uncomment the production service in docker-compose.yml first, then:
docker-compose up marketpulse-prod --build
```

### Container Management
```bash
# Remove containers and volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Rebuild from scratch
docker-compose build --no-cache marketpulse-dev
```

## 🔧 Customization

### Environment Variables
Key environment variables used in the application:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-key
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Port Configuration
To change the port, modify the `ports` section in `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Maps host port 8080 to container port 3000
```

### Volume Mounting
The development setup mounts your source code for hot reloading:
```yaml
volumes:
  - .:/app                # Source code
  - /app/node_modules     # Prevent overwriting node_modules
  - /app/.next            # Prevent overwriting build cache
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   
   # Kill the process or change the port in docker-compose.yml
   ```

2. **Permission issues on Linux**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

3. **Out of disk space**
   ```bash
   # Clean up Docker
   docker system prune -a
   ```

4. **Node modules issues**
   ```bash
   # Rebuild container from scratch
   docker-compose down -v
   docker-compose build --no-cache marketpulse-dev
   docker-compose up marketpulse-dev
   ```

### Logs and Debugging
```bash
# View container logs
docker-compose logs marketpulse-dev

# Follow logs in real-time
docker-compose logs -f marketpulse-dev

# Access container shell
docker-compose exec marketpulse-dev sh

# Check container status
docker-compose ps
```

## 🔄 Development Workflow

1. **Start the container**:
   ```bash
   docker-compose up marketpulse-dev
   ```

2. **Make changes** to your code - they'll be reflected immediately thanks to volume mounting

3. **View changes** at http://localhost:3000

4. **Stop when done**:
   ```bash
   docker-compose down
   ```

## 📊 Performance Tips

- Use `.dockerignore` to exclude unnecessary files
- The development setup uses volume mounting for fast rebuilds
- Production build uses multi-stage builds for optimization
- Consider using `docker-compose up -d` for background running

## 🔐 Security Notes

- Never commit real API keys to version control
- Use environment files (`.env.local`) for sensitive data
- The production Dockerfile runs as non-root user
- Environment variables are properly scoped per environment

## 🎯 Next Steps

After getting Docker running:

1. **Database Setup**: Ensure your Supabase database is configured
2. **Stripe Integration**: Set up your Stripe webhooks and products
3. **Dashboard Access**: Create a user account to test the dashboard
4. **Trading Signals**: Verify the signals are displaying correctly

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Docker and container logs
3. Ensure all environment variables are properly set
4. Verify Docker and Docker Compose are properly installed 