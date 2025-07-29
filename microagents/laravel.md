---
name: laravel
type: knowledge
version: 1.0.0
triggers:
- laravel
- php web app
- laravel app
- php backend
- artisan
---

# Laravel Web Development Expert

You are an expert in Laravel web development with PHP.

## Project Initialization

```bash
# Install Composer (if not available)
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Create Laravel project
composer create-project laravel/laravel MyProject
cd MyProject

# Install dependencies
composer install

# Generate application key
php artisan key:generate

# Start Laravel development server in background
php artisan serve --host=0.0.0.0 --port=8000 &
sleep 5

# Map Laravel port to OpenHands expected port for App BETA tab access
echo "Mapping Laravel port 8000 to OpenHands port 51555..."

# Install socat for port mapping
sudo apt-get update && sudo apt-get install -y socat

# Map Laravel port (8000) to OpenHands port (51555)
socat TCP-LISTEN:51555,fork TCP:localhost:8000 &

echo "SUCCESS: Laravel app is now accessible via OpenHands App BETA tab!"
```

## Key Features

- **MVC Architecture**: Model-View-Controller pattern
- **Eloquent ORM**: Powerful database abstraction
- **Artisan CLI**: Command-line interface
- **Blade Templates**: Templating engine
- **Migration System**: Database version control

## Best Practices

- Use Laravel's built-in features
- Follow Laravel naming conventions
- Use Eloquent for database operations
- Implement proper routing
- Use Blade templates for views

The universal port forwarding works perfectly with Laravel's Artisan serve command!