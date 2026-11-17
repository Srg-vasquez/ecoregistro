#!/bin/bash
set -euo pipefail

# Local launcher. Never connects to a remote Docker context or publishes a site.
eco_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$eco_project_dir"
eco_system="$(uname -s)"
eco_docker_bin="$(command -v docker || true)"
eco_temp_dir=""
eco_mount_dir=""

eco_cleanup() {
    if [ -n "$eco_mount_dir" ] && mount | grep -F " on $eco_mount_dir " >/dev/null 2>&1; then
        hdiutil detach "$eco_mount_dir" -quiet || true
    fi
    if [ -n "$eco_temp_dir" ] && [ -d "$eco_temp_dir" ]; then
        rm -rf -- "$eco_temp_dir"
    fi
}
trap eco_cleanup EXIT

echo "EcoRegistro · preparación del entorno local"
echo "Proyecto: $eco_project_dir"

if [ "$eco_system" = "Darwin" ]; then
    eco_docker_app=""
    for eco_candidate in /Applications/Docker.app "$HOME/Applications/Docker.app"; do
        if [ -d "$eco_candidate" ]; then eco_docker_app="$eco_candidate"; break; fi
    done
    if [ -z "$eco_docker_app" ]; then
        echo "Docker Desktop no está instalado. Descargando el instalador oficial…"
        eco_arch="$(uname -m)"
        case "$eco_arch" in
            arm64) eco_docker_arch=arm64 ;;
            x86_64) eco_docker_arch=amd64 ;;
            *) echo "Arquitectura no compatible: $eco_arch"; exit 1 ;;
        esac
        eco_temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ecoregistro-docker.XXXXXX")"
        eco_mount_dir="$eco_temp_dir/volume"
        mkdir "$eco_mount_dir"
        curl --fail --location --retry 2 --output "$eco_temp_dir/Docker.dmg" \
            "https://desktop.docker.com/mac/main/$eco_docker_arch/Docker.dmg"
        hdiutil attach "$eco_temp_dir/Docker.dmg" -nobrowse -readonly -mountpoint "$eco_mount_dir"
        codesign --verify --deep --strict "$eco_mount_dir/Docker.app"
        if [ -w /Applications ]; then
            eco_docker_app=/Applications/Docker.app
        else
            mkdir -p "$HOME/Applications"
            eco_docker_app="$HOME/Applications/Docker.app"
        fi
        ditto "$eco_mount_dir/Docker.app" "$eco_docker_app"
        echo "Docker Desktop instalado. Completa su configuración inicial si aparece en pantalla."
    fi
    open -a "$eco_docker_app"
    if [ -z "$eco_docker_bin" ]; then
        for eco_candidate in "$eco_docker_app/Contents/Resources/bin/docker" "$HOME/.docker/bin/docker"; do
            if [ -x "$eco_candidate" ]; then eco_docker_bin="$eco_candidate"; break; fi
        done
    fi
fi

if [ -z "$eco_docker_bin" ]; then
    echo "No se encontró Docker. Instala Docker Engine/Desktop en este equipo y vuelve a ejecutar el lanzador."
    echo "https://docs.docker.com/get-started/get-docker/"
    exit 1
fi

echo "Esperando al motor local de Docker…"
eco_ready=false
eco_context=""
for eco_attempt in $(seq 1 90); do
    if [ "$eco_system" = "Darwin" ] && "$eco_docker_bin" context inspect desktop-linux >/dev/null 2>&1; then
        eco_context=desktop-linux
    elif [ -z "$eco_context" ]; then
        eco_context="$("$eco_docker_bin" context show)"
    fi
    eco_endpoint="$("$eco_docker_bin" context inspect "$eco_context" --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)"
    case "$eco_endpoint" in
        unix://*|npipe://*) ;;
        *) echo "El contexto '$eco_context' no es un motor local. No se iniciará el proyecto en un servidor remoto."; exit 1 ;;
    esac
    if "$eco_docker_bin" --context "$eco_context" info >/dev/null 2>&1; then eco_ready=true; break; fi
    sleep 2
done
if [ "$eco_ready" != true ]; then
    echo "Docker todavía no está listo. Abre Docker Desktop, termina su configuración y vuelve a ejecutar este archivo."
    exit 1
fi

"$eco_docker_bin" --context "$eco_context" compose version
"$eco_docker_bin" --context "$eco_context" compose config --quiet
echo "Construyendo y levantando EcoRegistro. El primer arranque puede tardar varios minutos…"
if ! "$eco_docker_bin" --context "$eco_context" compose up --build --detach --wait --wait-timeout 240; then
    "$eco_docker_bin" --context "$eco_context" compose logs --tail=80 app db
    echo "El arranque no terminó correctamente. Conserva el mensaje anterior para revisar la causa."
    exit 1
fi

eco_response="$(curl --fail --silent --show-error --max-time 10 http://localhost:8000/api/session)"
if ! printf '%s' "$eco_response" | grep -q '"csrf_token"'; then
    echo "El servidor respondió, pero no se pudo validar la sesión de EcoRegistro."
    exit 1
fi
echo "EcoRegistro está listo en http://localhost:8000"
echo "Operador: operador@ecoregistro.test"
echo "Revisor: revisor@ecoregistro.test"
echo "Contraseña de la demo: la definida en DEMO_PASSWORD (por defecto, EcoRegistroDemo2026!)."
echo "Los contenedores quedan funcionando después de cerrar esta ventana."
if [ "$eco_system" = "Darwin" ]; then
    open http://localhost:8000
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:8000 >/dev/null 2>&1 || true
fi
