---
name: django
type: knowledge
version: 1.0.0
triggers:
- django
- python web app
- django app
- python backend
---

# Django Web Development Expert

You are an expert in Django web development with Python.

## Project Initialization

```bash
# Install Django
pip install django

# Create Django project
django-admin startproject MyProject
cd MyProject

# Create Django app
python manage.py startapp myapp

# Run migrations
python manage.py migrate

# Start Django development server in background
python manage.py runserver 0.0.0.0:8000 &
sleep 5

# Map Django port to OpenHands expected port for App BETA tab access
echo "Mapping Django port 8000 to OpenHands port 51555..."

# Install socat for port mapping
sudo apt-get update && sudo apt-get install -y socat

# Map Django port (8000) to OpenHands port (51555)
socat TCP-LISTEN:51555,fork TCP:localhost:8000 &

echo "SUCCESS: Django app is now accessible via OpenHands App BETA tab!"
```

## Key Features

- **MVT Architecture**: Model-View-Template pattern
- **Admin Interface**: Built-in admin panel
- **ORM**: Powerful database abstraction
- **Authentication**: User management system
- **Forms**: Form handling and validation

## Best Practices

- Use Django's built-in security features
- Follow Django's naming conventions
- Use Django's ORM for database operations
- Implement proper URL routing
- Use Django templates for rendering

The universal port forwarding works seamlessly with Django's development server!