# Local Video Renderer

Renderiza lotes de videos en una computadora local con FFmpeg, sin enviar
assets ni trabajos a servidores externos. El CLI puede generar una plantilla de
100 videos, repartir el render entre varios procesos locales y usar NVENC de
NVIDIA automaticamente cuando el runtime local lo expone.

## Requisitos

- Python 3.10+
- FFmpeg instalado localmente y disponible como `ffmpeg`
- Opcional: GPU NVIDIA con `h264_nvenc` para aceleracion por hardware

## Crear una configuracion de 100 videos

```bash
python3 local_video_renderer.py init-config --path configs/example_100_videos.json --count 100
```

La configuracion generada usa un `job_template` con `count: 100`. Puedes cambiar
titulos, subtitulos, colores, duracion, resolucion, `source` de video/imagen,
`audio` y nombre de salida.

## Renderizar localmente

```bash
python3 local_video_renderer.py render \
  --config configs/example_100_videos.json \
  --output-dir renders \
  --workers auto \
  --encoder auto \
  --skip-existing
```

Opciones utiles:

- `--workers auto`: usa CPU y RAM locales para elegir una concurrencia segura.
- `--encoder auto`: usa `h264_nvenc` si hay runtime NVIDIA; si no, usa `libx264`.
- `--encoder cpu`: fuerza render por CPU con `libx264`.
- `--encoder nvidia`: fuerza `h264_nvenc`.
- `--limit N`: renderiza solo los primeros `N` trabajos para pruebas.
- `--dry-run`: imprime los comandos FFmpeg sin renderizar.
- `--skip-existing`: permite reanudar lotes grandes sin repetir MP4 ya creados.
- `--manifest ruta.json`: guarda un reporte JSON con estado, tamanos, comandos y errores.
- `--no-manifest`: desactiva el reporte JSON automatico `render_manifest.json`.

Cada render normal escribe por defecto `renders/render_manifest.json`. Ese archivo
sirve para auditar los 100 resultados, detectar fallos y repetir solo lo que falte
con `--skip-existing`.

## Validar antes de renderizar

```bash
python3 local_video_renderer.py validate \
  --config configs/example_100_videos.json \
  --output-dir renders \
  --workers auto \
  --encoder auto
```

La validacion revisa que no haya IDs duplicados, nombres de salida repetidos,
assets inexistentes, dimensiones incompatibles con H.264 y encoders locales no
disponibles.

## Formato de configuracion

```json
{
  "defaults": {
    "width": 1280,
    "height": 720,
    "fps": 30,
    "duration": 8,
    "background": "#101827",
    "font_color": "white",
    "subtitle_color": "#dbeafe"
  },
  "count": 100,
  "job_template": {
    "id": "video-{index:03d}",
    "title": "Video local {index:03d}",
    "subtitle": "Renderizado sin servidores externos usando FFmpeg local",
    "output_name": "video-{index:03d}.mp4"
  }
}
```

Tambien puedes reemplazar `count`/`job_template` por una lista `jobs` cuando
cada video necesita contenido distinto.

## Ver encoders locales

```bash
python3 local_video_renderer.py list-encoders
```

## Ejecutar pruebas

```bash
python3 -m unittest discover -s tests
```
