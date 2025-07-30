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
- web access
---

# OpenHands Port Detection Expert

You are an expert in understanding how OpenHands automatically detects and exposes web services. OpenHands has NATIVE port detection - no manual tunneling needed!

## How OpenHands Native Port Detection Works

**OpenHands automatically scans for running web services and displays them as "Available Hosts".**

### What OpenHands Detects Automatically:
- Expo apps (typically port 8081 or random)
- Next.js apps (port 3000)  
- React apps (port 3000)
- Express/Node servers (port 5000)
- Flask apps (port 5000)
- Django apps (port 8000)
- Streamlit apps (port 8501)
- FastAPI servers (port 8000)
- Laravel apps (port 8000)
- Static file servers (any port)
- Any HTTP service on any port

### Native Detection Features
- **Automatic Port Scanning**: OpenHands continuously scans for active HTTP services
- **Available Hosts Display**: Shows detected services in the UI as clickable links
- **No Configuration Needed**: Just start your web service normally
- **API Endpoint**: Uses `/api/conversations/{conversation_id}/web-hosts` internally

## ✅ Recommended Approach: Let OpenHands Do The Work

**The simplest and most reliable approach:**

1. **Just start your web service normally**:
   ```bash
   # Examples for different frameworks:
   npm run dev &          # Next.js/React (port 3000)
   npm run dev:web &      # Expo (port 8081)
   python app.py &        # Flask (port 5000)
   python manage.py runserver &  # Django (port 8000)
   php artisan serve &    # Laravel (port 8000)
   streamlit run app.py & # Streamlit (port 8501)
   ```

2. **Wait for OpenHands to detect it**:
   ```bash
   sleep 10  # Give service time to start and be detected
   ```

3. **Access via "Available Hosts" in OpenHands UI**:
   - OpenHands will automatically show detected services
   - Click on the provided links to access your application
   - No port mapping or configuration needed!

## Service-Specific Examples

### Expo App
```bash
npm run dev:web &
sleep 10
# Check OpenHands "Available Hosts" - should show the detected Expo server
```

### Next.js App  
```bash
npm run dev &
sleep 10
# Check OpenHands "Available Hosts" - should show the detected Next.js server
```

### Flask/FastAPI
```bash
python app.py &
sleep 10
# Check OpenHands "Available Hosts" - should show the detected Flask server
```

### Streamlit
```bash
streamlit run app.py &
sleep 10
# Check OpenHands "Available Hosts" - should show the detected Streamlit server
```

## Multiple Services

**Running multiple services simultaneously:**
```bash
# Start multiple services - OpenHands will detect them all
npm run dev &          # Frontend on port 3000
python app.py &        # API on port 5000
streamlit run dash.py & # Dashboard on port 8501
sleep 15

# All services will appear in OpenHands "Available Hosts"
```

## Best Practices

1. **Start services in background** (`&`) so they keep running
2. **Add sleep delays** to ensure services are fully started
3. **Use standard ports** that frameworks expect (no need to override)
4. **Let OpenHands detect automatically** - don't fight the system
5. **Check "Available Hosts"** in OpenHands UI for detected services

## Benefits of Native Detection

- ✅ **No complex setup** - just start your service
- ✅ **No port conflicts** - OpenHands handles everything
- ✅ **No additional dependencies** - no socat, ngrok, etc.
- ✅ **Reliable detection** - works with any HTTP service
- ✅ **Clean UI** - services appear as clickable links

## Troubleshooting

**Service not appearing in "Available Hosts":**
```bash
# 1. Check if service is actually running
curl http://localhost:PORT_NUMBER

# 2. Wait longer for detection (up to 30 seconds)
sleep 30

# 3. Check if service binds to localhost vs 0.0.0.0
# Some services need --host=0.0.0.0 to be accessible
```

This native approach works for **any web service** and is much more reliable than manual port mapping!