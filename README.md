# Generador de Videos IA Moithano

Renderiza lotes de videos en una computadora local con FFmpeg, sin enviar
assets ni trabajos a servidores externos. El CLI puede generar una plantilla de
100 videos, repartir el render entre varios procesos locales y usar NVENC de
NVIDIA automaticamente cuando el runtime local lo expone.

Incluye configuracion para carpetas de trabajo, musica de fondo, avatar opcional,
posicion/tamano del avatar, volumen de musica, nichos, capitulos, hashes anti
repeticion, compilacion ordenada y proveedores de voz como Microsoft Edge o
servicios pagos configurables.

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
`voice_audio`, musica, avatar, nicho, capitulo y nombre de salida.

## Carpetas de ejemplo

La plantilla incluye estas carpetas:

- `ejemplos/entrada`: videos, imagenes o recursos de entrada.
- `ejemplos/videos_cortitos`: clips cortos generados por cada capitulo/parte.
- `ejemplos/videos_finalizados`: videos largos ya unidos y listos para publicar.
- `ejemplos/musica_fondo`: musica para elegir o usar con `music: "auto"`.
- `ejemplos/avatares`: imagenes o videos de avatar para `avatar: "auto"`.
- `ejemplos/hashes_procesados.json`: registro de preguntas/contenidos ya usados.
- `assets/moithano_icon.svg`: icono inicial del programa; puedes reemplazarlo.

## Renderizar localmente

```bash
python3 local_video_renderer.py render \
  --config configs/example_100_videos.json \
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
- `--hash-registry ruta.json`: usa una lista JSON de hashes ya procesados.
- `--no-update-hash-registry`: prueba sin guardar nuevos hashes.

Cada render normal guarda clips en `folders.clips_dir`, escribe un manifiesto y
actualiza el registro de hashes para evitar preguntas o contenidos repetidos.

## Compilar clips cortos en video final

```bash
python3 local_video_renderer.py compile \
  --config configs/example_100_videos.json \
  --story-id historia-moithano-001 \
  --output-name historia-final.mp4
```

El compilador ordena por `story_id`, `sequence` y `chapter`, toma los clips desde
`ejemplos/videos_cortitos` y deja el video largo en `ejemplos/videos_finalizados`.
Tambien escribe `compile_manifest.json` con el orden usado para que la historia
no quede como una sopa de letras.

## Validar antes de renderizar

```bash
python3 local_video_renderer.py validate \
  --config configs/example_100_videos.json \
  --output-dir renders \
  --workers auto \
  --encoder auto
```

La validacion revisa que no haya IDs duplicados, nombres de salida repetidos,
secuencias repetidas por historia, preguntas/contenido ya usado, assets
inexistentes, dimensiones incompatibles con H.264 y encoders locales no
disponibles.

## Progreso estilo militar

Los pasos de renderizado y compilacion muestran barra verde, porcentaje, cantidad
de videos, minutos, segundos y microsegundos generados/transcurridos. Ese formato
esta pensado para futuras pantallas de descargas, renderizado, generador de voces
y compilador de videos.

## Avatar, voz y musica

En cada trabajo o en `defaults` puedes usar:

- `presentation_mode`: `voice_only` para solo narracion o `avatar` para mostrar avatar.
- `avatar`: ruta, nombre dentro de `folders.avatar_dir`, o `auto`.
- `avatar_position`: `bottom_center`, `bottom_right`, `bottom_left`, `top_right`, `top_left`.
- `avatar_size_percent`: tamano del avatar respecto al ancho del video, de `5` a `100`.
- `music`: ruta, nombre dentro de `folders.music_dir`, o `auto`.
- `music_volume`: volumen de la musica de fondo de `1` a `200`.
- `voice_provider`: `microsoft_edge`, `levelup_paid`, `elevenlabs` u otro proveedor externo.
- `voice_name`: nombre de voz a usar por tu generador de audios.
- `military_border`: `true` para borde verde estilo militar en el video.

El renderizador mezcla musica y voz cuando ambos archivos existen. Los campos de
Sora 2 y proveedores pagos quedan en la configuracion para integrarlos con tus
generadores, mientras FFmpeg ensambla el video final localmente.

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
    "subtitle_color": "#dbeafe",
    "story_id": "historia-moithano-001",
    "sequence": 1,
    "presentation_mode": "avatar",
    "avatar": "auto",
    "avatar_position": "bottom_right",
    "avatar_size_percent": 28,
    "music": "auto",
    "music_volume": 35
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
