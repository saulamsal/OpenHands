---
name: tunneling
type: knowledge
version: 1.0.0
triggers:
- tunnel
- port forward
- public url
- external access
- ngrok
- expose port
- localhost tunnel
- cloudflare tunnel
---

# Universal Port Tunneling Expert

You are an expert in creating public tunnels for locally running web services. This enables external access to any application running inside containers or behind firewalls.

## Use Cases

**Any web service that needs external access:**
- Expo apps (port 8081)
- Next.js apps (port 3000)  
- React apps (port 3000)
- Express/Node servers (port 5000)
- Flask apps (port 5000)
- Django apps (port 8000)
- Streamlit apps (port 8501)
- FastAPI servers (port 8000)
- Static file servers (any port)
- Databases with web UIs
- API servers
- Development servers

## Tunneling Services (Free Tiers)

### 1. Cloudflare Tunnel (Recommended - Most Reliable)
```bash
# Install cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Create tunnel for any port
cloudflared tunnel --url http://localhost:PORT_NUMBER
```

### 2. ngrok (Popular - Easy Setup)
```bash
# Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Create tunnel for any port
ngrok http PORT_NUMBER
```

### 3. localhost.run (Simplest - No Installation)
```bash
# Create tunnel using SSH (replace PORT_NUMBER)
ssh -R 80:localhost:PORT_NUMBER localhost.run
```

### 4. localtunnel (npm-based)
```bash
# Install globally
npm install -g localtunnel

# Create tunnel for any port
lt --port PORT_NUMBER
```

## Universal Tunneling Protocol

**When starting ANY web service:**

1. **Start the service in background**:
   ```bash
   # Examples for different apps:
   npm run dev &          # Next.js/React
   npm run web &          # Expo  
   python app.py &        # Flask
   python manage.py runserver &  # Django
   streamlit run app.py & # Streamlit
   ```

2. **Wait for service to start**:
   ```bash
   sleep 3  # Give service time to start
   ```

3. **Create public tunnel** (choose one method):
   ```bash
   # Cloudflare (most reliable)
   cloudflared tunnel --url http://localhost:8081
   
   # OR ngrok
   ngrok http 8081
   
   # OR localhost.run  
   ssh -R 80:localhost:8081 localhost.run
   ```

4. **Display the public URL** to user

## Port Detection

**Auto-detect common ports:**
```bash
# Check what ports are in use
ss -tlnp | grep LISTEN | grep -E ':(3000|8081|5000|8000|8501|4000)'

# Or check specific port
curl -s http://localhost:8081 > /dev/null && echo "Port 8081 is active"
```

## Service-Specific Examples

### Expo App
```bash
npm run web &
sleep 3
cloudflared tunnel --url http://localhost:8081
```

### Next.js App  
```bash
npm run dev &
sleep 3
cloudflared tunnel --url http://localhost:3000
```

### Flask/FastAPI
```bash
python app.py &
sleep 3
cloudflared tunnel --url http://localhost:5000
```

### Streamlit
```bash
streamlit run app.py &
sleep 3
cloudflared tunnel --url http://localhost:8501
```

## Multiple Services

**Tunnel multiple ports simultaneously:**
```bash
# Start multiple services
npm run web &          # Expo on 8081
npm run api &          # API on 5000

# Create multiple tunnels
cloudflared tunnel --url http://localhost:8081 &
cloudflared tunnel --url http://localhost:5000 &
```

## Best Practices

1. **Always start service in background** (`&`) before tunneling
2. **Add sleep delay** to ensure service is ready
3. **Choose Cloudflare for production-like testing** (most reliable)
4. **Use ngrok for quick demos** (easier URLs)
5. **Display the tunnel URL prominently** for user access
6. **Kill tunnel processes** when done: `pkill cloudflared` or `pkill ngrok`

## Security Notes

- Tunnels expose your local service to the internet
- Only tunnel during development/testing
- Don't expose sensitive data or production services
- URLs are temporary and change each restart

## Troubleshooting

**Service not accessible through tunnel:**
```bash
# Check if service is running locally first
curl http://localhost:PORT_NUMBER

# Check if port is bound correctly
ss -tlnp | grep :PORT_NUMBER

# Restart tunnel if needed
pkill cloudflared
cloudflared tunnel --url http://localhost:PORT_NUMBER
```

This universal approach works for **any web service** regardless of technology stack.