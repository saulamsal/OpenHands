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
# Simple Django setup - let OpenHands handle port detection
pip install django

django-admin startproject MyProject && cd MyProject

python manage.py startapp myapp && python manage.py migrate

python manage.py runserver &

echo "✅ Done! OpenHands will show Django app in 'Available Hosts' automatically"
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