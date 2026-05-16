# Compra y venta pedernales

Marketplace premium de alta gama para Pedernales. La aplicacion es una SPA React/Vite con
experiencia movil, interfaz 3D/neumorfica, feed social de compra/venta, KYC obligatorio para
operar, reputacion por transaccion y acceso oculto del propietario mediante servidor.

## Flujos principales

- **Registro rapido:** el usuario entra con correo y contraseña. La navegacion inicial es inmediata.
- **Bloqueo KYC:** comprar, vender y comentar quedan bloqueados hasta subir la foto de la cedula
  ecuatoriana desde el perfil. Al cargarla se asigna visto azul automaticamente.
- **Propietario verificado:** el propietario principal aparece verificado automaticamente por su rol
  seguro y no necesita subir cedula.
- **Inicio:** feed cronologico con fotos HD, videos verticales, descripciones, etiquetas, compra
  directa, llamada, videollamada HD, mensaje privado, reacciones, comentarios y directorio comercial.
- **Estados y publicidad:** los estados aparecen en inicio con alcance organico del 50%; al pagar
  publicidad pasan al 100% y el dinero se suma a la billetera publicitaria del propietario.
- **Subastas:** modulo ordenado por categoria con entrada de subasta, pujas superiores obligatorias,
  historial de pujas y compra directa.
- **Anuncios en fotos y videos:** carril de publicidad internacional ordenado por mayor presupuesto
  para monetizar el inventario visual de la app.
- **Configuraciones:** notificaciones, politicas de alcance, subastas, publicidad y billetera del
  propietario para retirar ingresos recaudados.
- **Perfil:** foto de perfil, portada, datos personales, verificacion, editar perfil, publicaciones,
  historias, transmisiones en vivo, amigos y solicitudes.
- **Reputacion:** cuando una compra se concreta se habilitan botones `Recomendado` y
  `No Recomendado`; el perfil calcula el porcentaje publico de confianza.
- **Convivencia:** comentarios y chats pasan por un filtro de palabras prohibidas. Si detecta una
  infraccion, bloquea el envio, alerta al usuario y registra el evento para auditoria.
- **Propietario oculto:** no hay panel admin publico. El propietario inicia sesion en el mismo
  formulario y solo ve el panel de control dentro de su perfil si el servidor valida su rol.
- **Retiros del propietario:** solo la cuenta propietaria verificada por servidor puede retirar el
  dinero acumulado por publicidad pagada.
- **Soporte ordenado:** cualquier usuario puede reportar errores o problemas al verificarse. La app
  crea tickets numerados en orden y responde automaticamente que un agente se pondra en contacto.

## Credenciales del propietario

No se almacenan correos ni contrasenas en texto plano dentro del codigo fuente. El servidor valida
el rol propietario contra hashes SHA-256 en variables de entorno:

```bash
cp .env.example .env
node -e "console.log(require('crypto').createHash('sha256').update('correo@propietario.com').digest('hex'))"
node -e "console.log(require('crypto').createHash('sha256').update('clave-segura').digest('hex'))"
```

Configura:

```bash
OWNER_EMAIL_SHA256=<hash-del-correo-en-minusculas>
OWNER_PASSWORD_SHA256=<hash-de-la-clave>
```

> Nota: para produccion real, reemplazar SHA-256 simple por autenticacion robusta con hash de
> contrasenas con sal (Argon2/bcrypt), MFA, sesiones firmadas, permisos por backend, cifrado de
> documentos KYC y auditoria persistente.

## Desarrollo

```bash
npm install
npm run dev
```

## Build y servidor con autenticacion integrada

```bash
npm run build
npm start
```

## Validacion

```bash
npm run lint
npm run build
```
