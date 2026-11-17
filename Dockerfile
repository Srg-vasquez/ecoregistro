FROM node:24-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js ./
COPY resources ./resources
RUN npm run build

FROM php:8.4-cli-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev libsqlite3-dev libonig-dev libzip-dev libxml2-dev unzip git \
    && docker-php-ext-install pdo_pgsql pdo_sqlite mbstring zip dom \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts --no-autoloader --no-dev
COPY . .
COPY --from=frontend /app/public/build ./public/build
RUN composer dump-autoload --optimize && chmod +x docker/entrypoint.sh \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs storage/app bootstrap/cache database \
    && cp .env.sqlite.example .env \
    && sed -i 's|^DB_DATABASE=.*|DB_DATABASE=/app/database/database.sqlite|' .env \
    && php artisan key:generate --force \
    && touch database/database.sqlite \
    && php artisan migrate --force \
    && DEMO_SEED=true DEMO_PASSWORD=EcoRegistroDemo2026! php artisan db:seed --force \
    && chown -R www-data:www-data storage bootstrap/cache database .env
USER www-data
EXPOSE 8000
ENTRYPOINT ["/app/docker/entrypoint.sh"]
