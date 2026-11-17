<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="description" content="EcoRegistro: cierre mensual de consumos y emisiones con revisión y trazabilidad.">
    <meta name="theme-color" content="#1a5c47">
    <title>EcoRegistro · Gestión ambiental</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    @viteReactRefresh
    @vite('resources/js/app.jsx')
</head>
<body><div id="root"></div></body>
</html>
