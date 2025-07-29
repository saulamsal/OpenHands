---
name: tunneling
type: knowledge
version: 1.0.0
triggers:
- tunnel
- port forward
- public url
- external access
- expose port
- localhost tunnel
- socat
- port mapping
---

# Universal Port Forwarding Expert

You are an expert in making web services accessible through OpenHands' port forwarding system. This works for ANY framework running inside OpenHands containers.

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
- Laravel apps (port 8000)
- Static file servers (any port)
- Databases with web UIs
- API servers
- Development servers

## OpenHands Port Forwarding System

**OpenHands automatically detects services running on specific ports and makes them available in the "App BETA" tab.**

### Expected OpenHands Ports
OpenHands looks for services on these ports:
- `51555` - Primary application port
- `57374` - Secondary application port  
- Other dynamically assigned ports

### Port Mapping with socat

**When your service runs on a different port than expected:**

```bash
# Install socat (usually pre-installed in OpenHands containers)
sudo apt-get update && sudo apt-get install -y socat

# Map service port to OpenHands expected port
socat TCP-LISTEN:OPENHANDS_PORT,fork TCP:localhost:SERVICE_PORT &

# Examples:
socat TCP-LISTEN:51555,fork TCP:localhost:8081 &  # Expo
socat TCP-LISTEN:51555,fork TCP:localhost:3000 &  # Next.js  
socat TCP-LISTEN:51555,fork TCP:localhost:8000 &  # Django/Laravel
socat TCP-LISTEN:51555,fork TCP:localhost:8501 &  # Streamlit
```

## Universal Port Forwarding Protocol

**For ANY web service in OpenHands:**

1. **Start the service in background**:
   ```bash
   # Examples for different frameworks:
   npm run dev &          # Next.js/React (port 3000)
   npm run web &          # Expo (port 8081)
   python app.py &        # Flask (port 5000)
   python manage.py runserver &  # Django (port 8000)
   php artisan serve &    # Laravel (port 8000)
   streamlit run app.py & # Streamlit (port 8501)
   ```

2. **Wait for service to start**:
   ```bash
   sleep 5  # Give service time to start
   ```

3. **Map to OpenHands expected port**:
   ```bash
   # Install socat if not available
   sudo apt-get update && sudo apt-get install -y socat
   
   # Map service port to OpenHands port 51555
   socat TCP-LISTEN:51555,fork TCP:localhost:SERVICE_PORT &
   
   # Examples:
   socat TCP-LISTEN:51555,fork TCP:localhost:3000 &  # Next.js
   socat TCP-LISTEN:51555,fork TCP:localhost:8081 &  # Expo
   socat TCP-LISTEN:51555,fork TCP:localhost:8000 &  # Django/Laravel
   socat TCP-LISTEN:51555,fork TCP:localhost:8501 &  # Streamlit
   ```

4. **Access via OpenHands App BETA tab**

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
sleep 5
sudo apt-get update && sudo apt-get install -y socat
socat TCP-LISTEN:51555,fork TCP:localhost:8081 &
echo "Expo app accessible via OpenHands App BETA tab!"
```

### Next.js App  
```bash
npm run dev &
sleep 5
sudo apt-get update && sudo apt-get install -y socat
socat TCP-LISTEN:51555,fork TCP:localhost:3000 &
echo "Next.js app accessible via OpenHands App BETA tab!"
```

### Flask/FastAPI
```bash
python app.py &
sleep 5
sudo apt-get update && sudo apt-get install -y socat
socat TCP-LISTEN:51555,fork TCP:localhost:5000 &
echo "Flask app accessible via OpenHands App BETA tab!"
```

### Streamlit
```bash
streamlit run app.py &
sleep 5
sudo apt-get update && sudo apt-get install -y socat
socat TCP-LISTEN:51555,fork TCP:localhost:8501 &
echo "Streamlit app accessible via OpenHands App BETA tab!"
```

## Multiple Services

**Map multiple ports simultaneously:**
```bash
# Start multiple services
npm run web &          # Expo on 8081
npm run api &          # API on 5000
sleep 5

# Install socat
sudo apt-get update && sudo apt-get install -y socat

# Map primary service to 51555
socat TCP-LISTEN:51555,fork TCP:localhost:8081 &

# Map secondary service to 57374
socat TCP-LISTEN:57374,fork TCP:localhost:5000 &
```

## Best Practices

1. **Always start service in background** (`&`) before port mapping
2. **Add sleep delay** to ensure service is ready
3. **Use port 51555 as primary** for OpenHands App BETA tab
4. **Use port 57374 as secondary** for additional services
5. **Install socat once** per container session
6. **Kill socat processes** when done: `pkill socat`

## Security Notes

- Port mapping stays within OpenHands container environment
- Safe for development and testing within OpenHands
- No external internet exposure (unlike cloudflared/ngrok)
- Only accessible through OpenHands App BETA tab

## Troubleshooting

**Service not accessible via OpenHands App BETA tab:**
```bash
# Check if service is running locally first
curl http://localhost:PORT_NUMBER

# Check if port is bound correctly
ss -tlnp | grep :PORT_NUMBER

# Check if socat mapping is active
ss -tlnp | grep :51555

# Restart port mapping if needed
pkill socat
sudo apt-get update && sudo apt-get install -y socat
socat TCP-LISTEN:51555,fork TCP:localhost:PORT_NUMBER &
```

This universal approach works for **any web service** regardless of technology stack.