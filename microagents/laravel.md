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
# Simple Laravel setup - let OpenHands handle port detection
curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer

composer create-project laravel/laravel MyProject && cd MyProject

composer install && php artisan key:generate

php artisan serve &

echo "✅ Done! OpenHands will show Laravel app in 'Available Hosts' automatically"
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