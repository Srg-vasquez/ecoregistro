#!/bin/sh
set -eu
mkdir -p storage/app storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs database
if [ "${DB_CONNECTION:-}" = "sqlite" ]; then
    DB_FILE="${DB_DATABASE:-database/database.sqlite}"
    case "$DB_FILE" in
        /*) ;;
        *) DB_FILE="/app/$DB_FILE" ;;
    esac
    mkdir -p "$(dirname "$DB_FILE")"
    touch "$DB_FILE"
fi
PORT="${PORT:-8000}"
if [ -z "${APP_KEY:-}" ]; then
  if [ -f .env ] && grep -q '^APP_KEY=base64:' .env; then
    APP_KEY="$(grep -m1 '^APP_KEY=' .env | cut -d= -f2-)"
    export APP_KEY
  elif [ ! -f storage/app/demo-app.key ]; then
    php -r 'echo "base64:".base64_encode(random_bytes(32));' > storage/app/demo-app.key
    chmod 600 storage/app/demo-app.key
    APP_KEY="$(cat storage/app/demo-app.key)"
    export APP_KEY
  else
    APP_KEY="$(cat storage/app/demo-app.key)"
    export APP_KEY
  fi
fi
php artisan migrate --force
if [ "${DEMO_SEED:-false}" = "true" ]; then
    php artisan db:seed --force
fi
exec php -S "0.0.0.0:${PORT}" -t public server.php
