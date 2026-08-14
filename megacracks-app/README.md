# Megacracks 26/27 — álbum con cuentas reales

Web app completa: backend en Node/Express con base de datos SQLite (un solo archivo,
sin necesidad de contratar una base de datos aparte) + frontend que habla con esa API.

- Contraseñas cifradas en el servidor (bcrypt), nunca en texto plano.
- Sesiones con token (JWT), válidas 90 días.
- Cada usuario tiene su colección guardada en el servidor (no en el navegador).
- "Usuarios" y "Coincidencias" funcionan de verdad entre cualquiera que entre a tu web,
  estén donde estén — no dependen de Claude ni de estar todos en el mismo sitio.

## Estructura

```
megacracks-app/
  server/
    server.js      → API (Express)
    db.js           → base de datos SQLite
    auth.js         → login con JWT
    checklist.js    → las 725 cartas del checklist 25-26
  public/
    index.html      → toda la web (HTML+CSS+JS en un archivo)
  data/             → aquí se crea el archivo de la base de datos (no lo borres)
  .env.example
  package.json
```

## 1. Probarlo en tu ordenador

Necesitas [Node.js](https://nodejs.org) instalado (versión 18 o más reciente).

```bash
cd megacracks-app
npm install
cp .env.example .env
```

Abre `.env` y cambia `JWT_SECRET` por una cadena larga y aleatoria (por ejemplo,
generada con `openssl rand -hex 32`). Esto es lo que protege las sesiones — no lo
compartas ni lo subas a un repositorio público.

```bash
npm start
```

Abre `http://localhost:3000` en el navegador. Ya puedes crear una cuenta y probarlo.
Para que tus amigos lo prueben desde sus móviles mientras está en tu ordenador,
puedes usar algo como [ngrok](https://ngrok.com) (`ngrok http 3000`) y compartir el
enlace temporal que te da.

## 2. Ponerlo online de verdad (gratis)

La forma más sencilla es **Railway** o **Render**, ambos tienen plan gratuito y
soportan Node.js + un disco persistente para el archivo de la base de datos.

### Railway (recomendado, es el más simple)
1. Crea una cuenta en [railway.app](https://railway.app) y conéctala con GitHub.
2. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
3. En Railway: "New Project" → "Deploy from GitHub repo" → elige el repositorio.
4. En "Variables", añade `JWT_SECRET` con una cadena aleatoria larga.
5. En "Settings" → "Volumes", añade un volumen montado en `/app/data` (así la base
   de datos no se borra cada vez que Railway reinicia el servidor).
6. Railway te da automáticamente una URL pública tipo `tuapp.up.railway.app`. Esa es
   la que compartes con tus amigos.

### Render
1. Crea cuenta en [render.com](https://render.com), conecta el repositorio de GitHub.
2. "New" → "Web Service", elige el repo. Build command: `npm install`. Start command: `npm start`.
3. En "Environment", añade `JWT_SECRET`.
4. En "Disks", añade un disco persistente montado en `/opt/render/project/src/data`
   y ajusta `DB_PATH` en las variables de entorno para que apunte ahí.

### Un servidor propio (VPS)
Si tienes un VPS (DigitalOcean, Hetzner, etc.), es tan simple como subir la carpeta,
`npm install`, configurar `.env`, y dejarlo corriendo con algo como
[pm2](https://pm2.keymetrics.io/) (`pm2 start server/server.js --name megacracks`)
detrás de un proxy con HTTPS (por ejemplo, [Caddy](https://caddyserver.com), que hace
el certificado SSL automáticamente).

## Notas importantes

- **La base de datos es un archivo** (`data/megacracks.db`). Si despliegas en un
  servicio "sin estado" (como muchos planes gratuitos que reinician el disco en cada
  deploy), necesitas un volumen/disco persistente o los datos desaparecerán. Railway
  y Render lo permiten en su plan gratuito, tal como se explica arriba.
- Si más adelante esto crece mucho (cientos de usuarios activos), lo natural es migrar
  de SQLite a Postgres — el código de `db.js` es la única pieza que tocaría.
- El checklist es el de la temporada 25-26 (aún no existe uno oficial de la 26/27).
  Está en `server/checklist.js`; cuando salga el checklist real de la 26/27, se
  actualiza ahí y ya está disponible para todos los usuarios automáticamente.
