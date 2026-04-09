# Gestión SOT — Instalación Internet

Aplicación web (React + Vite + TailwindCSS) con **Firebase Authentication** (correo/contraseña), Firestore y Hosting. Tras configurar `.env`, la pantalla de **login** es la entrada por defecto. El modo sin login (`VITE_DISABLE_AUTH=true`) es solo para pruebas locales.

## Requisitos

- Node.js 18+
- Cuenta [Firebase](https://console.firebase.google.com/)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

## 1. Crear proyecto Firebase

1. En la consola Firebase, cree un proyecto.
2. **Authentication** → método **Correo/contraseña** (habilitar).
3. **Firestore** → crear base de datos (modo producción o prueba según su política).
4. **Hosting** (opcional hasta el deploy).
5. En **Project settings** → **Your apps** → Web, copie la configuración.

## 2. Variables de entorno

```bash
copy .env.example .env
```

Edite `.env` y complete los valores `VITE_FIREBASE_*` del paso anterior. Despliegue las reglas seguras: `firebase deploy --only firestore:rules` (el archivo `firestore.rules` del repo exige usuario autenticado y coincide con `firestore.rules.with-auth`).

### Usuarios y sesión

- En **Firebase Console** → **Authentication**, habilite **Correo/contraseña**.
- Cada usuario debe tener un documento en Firestore `users/{UID}` (UID = Authentication) con `role` y `contratista` (véase la sección de usuarios más abajo). Los administradores pueden crear usuarios con la Cloud Function `createUserWithProfile` desde la app.

### Modo demo sin login (opcional, `VITE_DISABLE_AUTH=true`)

- No hay pantalla de acceso; use **Perfil local** en la cabecera. **No use en producción.**
- Despliegue reglas abiertas copiando `firestore.rules.no-auth` sobre `firestore.rules`, o despliegue solo ese contenido en Firebase.

Si cambia la región de las Cloud Functions, defina también `VITE_FIREBASE_FUNCTIONS_REGION` (debe coincidir con `functions/index.js`).

## 3. Instalación y desarrollo local

```bash
npm install
npm run dev
```

Abra la URL que muestra Vite (normalmente `http://localhost:5173`).

## 4. Firebase CLI (`firebase init` ya contemplado en archivos)

Este repositorio incluye `firebase.json`, `firestore.rules` e `firestore.indexes.json`. En la carpeta del proyecto:

```bash
firebase login
firebase init
```

Si ya existe configuración, elija **no sobrescribir** los archivos listados arriba; solo vincule el proyecto:

```bash
firebase use --add
```

Despliegue reglas e índices (ajuste `firebase.json` si cambia la ruta):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Si la app muestra un error de índice faltante en la consola del navegador, use el enlace que ofrece Firebase para crearlo, o amplíe `firestore.indexes.json` y vuelva a desplegar índices.

## 5. Usuarios y roles

### Primer administrador (manual)

1. En **Authentication**, cree un usuario (correo/contraseña).
2. En **Firestore**, colección `users`, documento ID = **UID** de ese usuario:

```json
{
  "email": "admin@empresa.com",
  "displayName": "Admin",
  "role": "admin",
  "contratista": null,
  "createdAt": ...,
  "updatedAt": ...
}
```

### Administración (Excel + usuarios)

Los **administradores** tienen la ruta **`/admin` (Administración)** en el menú: allí pueden **importar el Excel base** de órdenes y usar el formulario para **generar usuarios** (correo, contraseña, rol). El alta de usuarios llama a la Cloud Function `createUserWithProfile`: crea la cuenta en **Firebase Authentication** y el documento `users/{uid}` en Firestore. La ruta antigua `/usuarios` redirige a `/admin`.

**Requisito:** plan de facturación **Blaze** en Firebase para desplegar Cloud Functions (límite gratuito generoso; consulte precios actuales en Google Cloud).

En la raíz del proyecto:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

La función está definida en `functions/index.js` con región `us-central1` (alineada con `VITE_FIREBASE_FUNCTIONS_REGION` en el front).

Valores de `role`: `admin`, `supervisor`, `asesor`.  
Para **supervisor** y **asesor**, `contratista` debe coincidir con la columna **CONTRATISTA** del Excel.

La tabla inferior permite **editar** rol y contratista de usuarios ya existentes.

Las reglas de Firestore solo permiten **actualizar** documentos de `users` a un **admin**. La creación del documento al usar el formulario la hace el **Admin SDK** en la función (no las reglas del cliente).

## 6. Build y despliegue en Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

Para desplegar hosting + reglas + índices:

```bash
firebase deploy
```

## 7. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Initial commit: gestión SOT"
```

Cree un repositorio vacío en GitHub y ejecute:

```bash
git remote add origin https://github.com/SU_USUARIO/SU_REPO.git
git branch -M main
git push -u origin main
```

No suba `.env` (está en `.gitignore`). En CI/CD, defina los secretos `VITE_FIREBASE_*` en GitHub Actions o en el proveedor que use.

## Modelo de datos (resumen)

- **`ordenes`**: documento ID derivado del **SOT** (caracteres seguros). Campos: ubicación, `contratista`, `gestion`, `tieneGestion`, `gestionTipo` (denormalizado para métricas), `historial`, timestamps.
- **`users`**: perfil y rol por UID.
- **`config/filtros`**: listas para desplegables (se actualizan al importar Excel como admin).

## Excel

Primera fila: columnas **REGION**, **DEPARTAMENTO**, **DISTRITO**, **CONTRATISTA**, **SOT** (nombres flexibles; ver `src/utils/excelParser.js`).

Lógica al importar: nueva SOT → alta; SOT existente sin gestión → actualiza datos; SOT con gestión → no modifica la fila (no pierde trabajo ya hecho).

## Scripts npm

| Comando        | Descripción              |
|----------------|--------------------------|
| `npm run dev`  | Servidor de desarrollo   |
| `npm run build`| Build de producción en `dist/` |
| `npm run preview` | Previsualizar el build |

---

Desarrollado para despliegue en Firebase Hosting con reglas de seguridad en `firestore.rules`.
