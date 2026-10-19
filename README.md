# Taller — API de Personajes Marvel con NestJS

API REST desarrollada para el taller de Programación con Tecnologías Web — ISIS3710. Permite administrar equipos y personajes del universo Marvel, sus relaciones y las reglas de negocio del enunciado.

## Tecnologías

- NestJS y TypeScript.
- PostgreSQL y TypeORM.
- Docker Compose.
- class-validator y class-transformer.
- Postman para las pruebas funcionales.

## Requisitos

- Node.js y npm compatibles con las dependencias del proyecto.
- Docker Desktop abierto.
- Git.
- Postman de escritorio para ejecutar las pruebas funcionales.

Las dependencias están registradas en `api/package.json` y `api/package-lock.json`.

## Estructura del proyecto

| Ruta | Contenido |
|---|---|
| `api/src/teams/` | Entidad, DTO, servicio, controlador y módulo de equipos. |
| `api/src/characters/` | Entidad, enum de estados, DTO, servicio, controlador y módulo de personajes. |
| `api/src/app.module.ts` | Configuración de módulos y conexión a PostgreSQL. |
| `api/src/main.ts` | Inicio de la aplicación y validación global. |
| `api/.env.example` | Variables de entorno de ejemplo. |
| `postman/Pruebas_Taller_Marvel.postman_collection.json` | Colección de pruebas funcionales. |
| `postman/Resultados_Taller_Marvel.postman_test_run.json` | Resultados exportados de Postman. |

## 1. Preparar la base de datos

La base de datos se proporciona en el repositorio del profesor:

https://github.com/JGarcia55/marvel-characters

Clonar ese repositorio en una carpeta independiente del proyecto NestJS:

```powershell
git clone https://github.com/JGarcia55/marvel-characters.git
cd marvel-characters
```

Con Docker Desktop abierto, ejecutar desde la carpeta donde está `docker-compose.yml`:

```powershell
docker compose up -d
docker compose ps
```

El contenedor de PostgreSQL se llama `marvel_db` y utiliza el puerto `5433` del computador.

El script suministrado por el profesor crea las tablas y carga los datos iniciales al inicializar la base de datos por primera vez.

La API utiliza el esquema existente y mantiene estas opciones:

```typescript
synchronize: false,
migrationsRun: false,
```

Estas opciones desactivan la sincronización automática del esquema y la ejecución automática de migraciones.

## 2. Instalar la API

En otra terminal, desde la carpeta donde se desee guardar el proyecto:

```powershell
git clone https://github.com/Exodiiall/taller-marvel-API.git
cd taller-marvel-API
cd api
npm ci
```

Crear el archivo de configuración local:

```powershell
Copy-Item .env.example .env
```

El archivo `api/.env` debe contener los datos de conexión de la base de datos de práctica:

```dotenv
DB_HOST=localhost
DB_PORT=5433
DB_USER=marvel
DB_PASSWORD=marvel123
DB_NAME=marvel_db
```

El archivo `.env` está excluido de Git. El archivo `.env.example` se incluye como referencia.

## 3. Ejecutar la API

Desde la carpeta `api`:

```powershell
npm run start:dev
```

La dirección base de la API es:

```text
http://localhost:3000
```

Para compilar el proyecto, ejecutar desde `api`:

```powershell
npm run build
```

## Endpoints de equipos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/teams` | Lista todos los equipos. |
| GET | `/teams/:id` | Consulta un equipo por su id. |
| GET | `/teams/:id/characters` | Lista los personajes de un equipo. |
| POST | `/teams` | Crea un equipo y admite una lista opcional `characterIds`. |
| PUT | `/teams/:id` | Reemplaza los datos de un equipo. |
| PATCH | `/teams/:id/characters` | Asigna uno o varios personajes al equipo. |
| DELETE | `/teams/:id` | Elimina un equipo sin personajes asociados. |

### Crear un equipo

Ejemplo de cuerpo para `POST /teams`:

```json
{
  "name": "Equipo de ejemplo",
  "base": "Bogotá",
  "founded_year": 2026,
  "active": true
}
```

El campo `name` es obligatorio. Los campos `base`, `founded_year`, `active` y `characterIds` son opcionales. Si se omite `active`, se utiliza `true`.

### Reemplazar un equipo

En `PUT /teams/:id` se requieren `name` y `active`.

Los campos `base` y `founded_year` quedan en `null` cuando se omiten. Las asignaciones de personajes se gestionan mediante las rutas correspondientes.

### Asignar personajes

Ejemplo de cuerpo para `PATCH /teams/:id/characters`:

```json
{
  "characterIds": [16, 17]
}
```

Los personajes deben existir y el equipo debe estar activo. Si un personaje pertenece a otro equipo, se reasigna al equipo indicado.

## Endpoints de personajes

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/characters` | Lista los personajes y admite filtros opcionales. |
| GET | `/characters/:id` | Consulta un personaje e incluye los datos de su equipo. |
| POST | `/characters` | Crea un personaje. |
| PUT | `/characters/:id` | Reemplaza los datos de un personaje. |
| PATCH | `/characters/:id/status` | Cambia únicamente el estado del personaje. |
| DELETE | `/characters/:id` | Elimina un personaje. |

### Crear un personaje

Ejemplo de cuerpo para `POST /characters`:

```json
{
  "real_name": "Personaje de ejemplo",
  "alias": "Heroe de ejemplo",
  "main_power": "Control de energía",
  "power_level": 60,
  "status": "ACTIVE",
  "is_villain": false,
  "team_id": null
}
```

Los campos obligatorios son `real_name`, `alias`, `main_power` y `power_level`.

Cuando se omiten los campos opcionales:

- `status` toma el valor `ACTIVE`.
- `is_villain` toma el valor `false`.
- `team_id` queda en `null`.

### Reemplazar un personaje

En `PUT /characters/:id` se requieren los campos no nulos, incluidos `status` e `is_villain`.

Si se omite `team_id` o se envía como `null`, el personaje queda sin equipo.

### Cambiar el estado

Ejemplo de cuerpo para `PATCH /characters/:id/status`:

```json
{
  "status": "RETIRED"
}
```

Los estados permitidos son:

- `ACTIVE`
- `INJURED`
- `MISSING`
- `RETIRED`

### Filtrar personajes

Por estado:

```text
GET /characters?status=ACTIVE
```

Por equipo:

```text
GET /characters?teamId=1
```

Combinando ambos filtros:

```text
GET /characters?status=ACTIVE&teamId=1
```

## Reglas de negocio

1. Si un equipo o personaje no existe, las operaciones sobre ese recurso responden con `404 Not Found`.

2. Los nombres de los equipos y los alias de los personajes son únicos. Los duplicados responden con `409 Conflict`.

3. `power_level` debe ser un entero entre 1 y 100. Un valor inválido responde con `400 Bad Request`.

4. El estado debe pertenecer a los valores definidos en `CharacterStatus`. Un estado inválido responde con `400 Bad Request`.

5. Al crear o reemplazar un personaje con `team_id`, el equipo debe existir y estar activo. Si no existe, se responde con `404`; si está inactivo, con `400`.

6. Al asignar personajes a un equipo mediante POST o PATCH, todos los personajes deben existir y el equipo debe estar activo. Los personajes que pertenecen a otro equipo se reasignan.

7. Un equipo con personajes asociados no puede eliminarse y responde con `409 Conflict`. Puede desactivarse mediante PUT con `active: false`, enviando los demás datos requeridos del reemplazo.

8. Un personaje en estado `RETIRED` no puede pasar directamente a `INJURED`. Esta transición responde con `400 Bad Request`. Sí puede volver a `ACTIVE`. La restricción aplica tanto a PUT como a PATCH.

9. Las operaciones de creación de equipos con personajes y las asignaciones utilizan transacciones para evitar cambios parciales.

10. Los datos inválidos y las propiedades no permitidas en los DTO responden con `400 Bad Request`.

## Códigos de respuesta

| Código | Uso |
|---|---|
| `200 OK` | Consulta, actualización o eliminación exitosa. |
| `201 Created` | Creación exitosa mediante POST. |
| `400 Bad Request` | Datos inválidos o regla de negocio incumplida. |
| `404 Not Found` | Recurso inexistente. |
| `409 Conflict` | Datos duplicados o intento de eliminar un equipo con personajes. |

## Pruebas funcionales con Postman

Con la base de datos y la API encendidas:

1. Abrir Postman de escritorio.
2. Importar `postman/Pruebas_Taller_Marvel.postman_collection.json`.
3. Seleccionar la colección y abrir **Run collection**.
4. Ejecutar todas las peticiones en su orden original, con una iteración y ejecución local.
5. Revisar los resultados de las comprobaciones.

La colección incluye la variable:

```text
baseUrl = http://localhost:3000
```

No requiere un entorno adicional ni un archivo de datos.

Los códigos `400`, `404` y `409` son resultados esperados en las pruebas de validación y errores. Una prueba se considera aprobada cuando su respuesta coincide con lo esperado.

La colección crea registros propios con prefijo `QA-`, captura sus ids y los elimina al finalizar. También compara los datos anteriores y posteriores para comprobar que los registros existentes se conservaron.

Si la ejecución se interrumpe o falla la limpieza, pueden quedar registros de prueba de esa ejecución.

### Resultados verificados

Ejecución realizada el **18 de octubre de 2026**:

| Verificación | Resultado |
|---|---|
| Peticiones ejecutadas | 83 |
| Comprobaciones aprobadas | 114 |
| Comprobaciones fallidas | 0 |
| Conservación de los registros previos | Aprobada |
| Compilación con `npm run build` | Exitosa |

La colección cubre los 13 endpoints, los filtros y las reglas de negocio del taller.

La evidencia exportada está en:

```text
postman/Resultados_Taller_Marvel.postman_test_run.json
```

## Detener y reanudar

Para detener la API, presionar `Ctrl + C` en su terminal.

Para detener la base de datos, ejecutar desde la carpeta del repositorio del profesor:

```powershell
docker compose stop
```

Para reanudar la base de datos:

```powershell
docker compose up -d
```

Para reanudar la API, ejecutar desde `api`:

```powershell
npm run start:dev
```
