# Deployment Guide

This guide covers how to deploy OpenHands using Docker for production or demo purposes.

## Docker Deployment

Docker is the recommended way to deploy OpenHands in production or for demos. 

> **Note**: Docker deployment is NOT for development. For development with hot reload, see the [Local Development Guide](./local_development_guide.md).

### Quick Start with Docker

#### 1. Pull and Run OpenHands
```bash
docker run -it --rm --pull=always \
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.50-nikolaik \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v ~/.openhands:/.openhands \
    -p 3000:3000 \
    --add-host host.docker.internal:host-gateway \
    --name openhands-app \
    docker.all-hands.dev/all-hands-ai/openhands:0.50
```

#### 2. Access OpenHands
Open your browser and go to: **http://localhost:3000**

### Running Docker Locally (Non-Development)

You can run the Docker container locally for testing or demos:

```bash
# Run in background (detached mode)
docker run -d --pull=always \
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.50-nikolaik \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v ~/.openhands:/.openhands \
    -p 3000:3000 \
    --add-host host.docker.internal:host-gateway \
    --name openhands-app \
    docker.all-hands.dev/all-hands-ai/openhands:0.50
```

> **Important**: When running via Docker, you CANNOT:
> - Edit code and see live changes
> - Use hot reload
> - Develop new features
> 
> For development, use the [Local Development Guide](./local_development_guide.md).

### Docker Commands

#### Check if container is running
```bash
docker ps | grep openhands-app
```

#### View logs
```bash
docker logs openhands-app
docker logs -f openhands-app  # Follow logs
```

#### Stop the container
```bash
docker stop openhands-app
```

#### Remove the container
```bash
docker rm openhands-app
```

#### Update to latest version
```bash
docker pull docker.all-hands.dev/all-hands-ai/openhands:0.50
```

## Production Deployment

### Environment Variables

For production deployments, configure these environment variables:

```bash
docker run -d \
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.50-nikolaik \
    -e LLM_MODEL=anthropic/claude-3-5-sonnet \
    -e LLM_API_KEY=your-production-api-key \
    -e LOG_LEVEL=INFO \
    -e FILE_STORE_TYPE=s3 \
    -e S3_BUCKET_NAME=your-bucket \
    -e AWS_ACCESS_KEY_ID=your-key \
    -e AWS_SECRET_ACCESS_KEY=your-secret \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -p 3000:3000 \
    --name openhands-prod \
    docker.all-hands.dev/all-hands-ai/openhands:0.50
```

### Security Considerations

#### 1. Secure Network Binding
For public deployments, bind to localhost only and use a reverse proxy:
```bash
-p 127.0.0.1:3000:3000
```

#### 2. Use HTTPS
Always use HTTPS in production. Example with nginx:
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

#### 3. Resource Limits
Set Docker resource limits:
```bash
docker run -d \
    --memory="4g" \
    --cpus="2" \
    # ... other options
```

### Docker Compose (Optional)

For complex deployments, use docker-compose:

```yaml
# docker-compose.yml
version: '3.8'

services:
  openhands:
    image: docker.all-hands.dev/all-hands-ai/openhands:0.50
    container_name: openhands-app
    environment:
      - SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.50-nikolaik
      - LLM_MODEL=${LLM_MODEL}
      - LLM_API_KEY=${LLM_API_KEY}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ~/.openhands:/.openhands
    ports:
      - "3000:3000"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## Cloud Deployments

### AWS ECS
1. Push image to ECR
2. Create task definition with proper environment variables
3. Ensure task has access to Docker socket

### Kubernetes
Use the OpenHands Helm chart (separate repository):
```bash
helm repo add openhands https://charts.all-hands.dev
helm install openhands openhands/openhands
```

### Google Cloud Run
Not recommended due to Docker-in-Docker requirements.

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Metrics
OpenHands supports OpenTelemetry. Configure with:
```bash
-e OTEL_EXPORTER_OTLP_ENDPOINT=your-endpoint
```

## Backup and Recovery

### Backup User Data
```bash
# Backup
docker run --rm \
    -v ~/.openhands:/backup/openhands \
    -v $(pwd):/backup/output \
    alpine tar czf /backup/output/openhands-backup.tar.gz /backup/openhands

# Restore
tar xzf openhands-backup.tar.gz -C ~/
```

## Troubleshooting

### Container won't start
Check logs:
```bash
docker logs openhands-app
```

### Permission issues
Ensure Docker socket is accessible:
```bash
sudo chmod 666 /var/run/docker.sock
```

### Out of memory
Increase Docker memory allocation or container limits.

## Notes

- **For development**: Use the [Local Development Guide](./local_development_guide.md)
- **Data persistence**: Mount `~/.openhands` to persist data
- **Updates**: Always pull latest image before deployment
- **Multi-tenant**: Not supported - one instance per user

## Related Guides

- [Local Development Guide](./local_development_guide.md) - For development with hot reload
- [Architecture Guide](./architecture_guide.md) - Understanding the system