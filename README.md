# Taller — API de Personajes Marvel con NestJS

API REST desarrollada para el taller de Programación con Tecnologías Web — ISIS3710. Permite administrar equipos y personajes del universo Marvel, sus relaciones y las reglas de negocio del enunciado.

Repositorio de la API: https://github.com/Exodiiall/taller-marvel-API

## Tecnologías

- NestJS y TypeScript.
- PostgreSQL y TypeORM.
- Docker Compose para la base de datos proporcionada por el profesor.
- `class-validator` y `class-transformer` para validar las peticiones.
- Postman para las pruebas funcionales.

## Requisitos

- Node.js y npm compatibles con las dependencias del proyecto.
- Docker Desktop con soporte para Docker Compose.
- Git.
- Postman de escritorio para ejecutar la colección de pruebas.

Las dependencias de la API y sus versiones están registradas en `api/package.json` y `api/package-lock.json`.

## Organización

| Ruta | Contenido |
|---|---|
| `api/src/teams/` | Entidad, DTO, controlador, servicio y módulo de equipos. |
| `api/src/characters/` | Entidad, enum de estados, DTO, controlador, servicio y módulo de personajes. |
| `api/src/app.module.ts` | Configuración de módulos y conexión a PostgreSQL. |
| `api/src/main.ts` | Inicio de la aplicación y validación global. |
| `api/.env.example` | Configuración de ejemplo para la base de datos de práctica. |
| `postman/Pruebas_Taller_Marvel.postman_collection.json` | Colección de pruebas funcionales. |
| `postman/Resultados_Taller_Marvel.postman_test_run.json` | Evidencia exportada de la ejecución de las pruebas. |

La base de datos se ejecuta desde el repositorio independiente proporcionado por el profesor.

## Ejecutar la base de datos

Repositorio de la base de datos: https://github.com/JGarcia55/marvel-characters

Con Docker Desktop abierto, ejecutar los siguientes comandos en la carpeta de ese repositorio, donde está `docker-compose.yml`:

```powershell
docker compose up -d
docker compose ps
```

El contenedor es `marvel_db`. PostgreSQL se publica en el puerto `5433` del computador.

El script de inicialización suministrado crea las tablas y carga los datos la primera vez que se inicializa la base de datos. La API trabaja con ese esquema existente: tiene `synchronize: false` y `migrationsRun: false`.

## Ejecutar la API

Clonar este repositorio:

```powershell
git clone https://github.com/Exodiiall/taller-marvel-API.git
cd taller-marvel-API
cd api
npm ci
```

Crear la configuración local a partir del ejemplo:

```powershell
Copy-Item .env.example .env
```

Configuración para la base de datos de práctica del profesor:

```dotenv
DB_HOST=localhost
DB_PORT=5433
DB_USER=marvel
DB_PASSWORD=marvel123
DB_NAME=marvel_db
```

Iniciar la aplicación desde `api`:

```powershell
npm run start:dev
```

Dirección base: `http://localhost:3000`.

Para compilar el proyecto, ejecutar desde `api`:

```powershell
npm run build
```

## Endpoints

### Equipos

| Método | Ruta | Operación |
|---|---|---|
| GET | `/teams` | Listar equipos. |
| GET | `/teams/:id` | Consultar un equipo. |
| GET | `/teams/:id/characters` | Listar los personajes de un equipo. |
| POST | `/teams` | Crear un equipo; admite `characterIds` opcional. |
| PUT | `/teams/:id` | Reemplazar los datos de un equipo. |
| PATCH | `/teams/:id/characters` | Asignar uno o varios personajes mediante `characterIds`. |
| DELETE | `/teams/:id` | Eliminar un equipo sin personajes asociados. |

### Personajes

| Método | Ruta | Operación |
|---|---|---|
| GET | `/characters` | Listar personajes; admite filtros `status` y `teamId`. |
| GET | `/characters/:id` | Consultar un personaje, incluyendo los datos de su equipo. |
| POST | `/characters` | Crear un personaje. |
| PUT | `/characters/:id` | Reemplazar los datos de un personaje. |
| PATCH | `/characters/:id/status` | Cambiar únicamente su estado. |
| DELETE | `/characters/:id` | Eliminar un personaje. |

Ejemplo de filtros combinados:

```text
GET /characters?status=ACTIVE&teamId=1
```

### Datos de las peticiones

Para crear un equipo, `name` es obligatorio. `base`, `founded_year`, `active` y `characterIds` son opcionales; `active` toma el valor `true` cuando se omite.

En el PUT de equipos se requieren `name` y `active`. Los campos opcionales `base` y `founded_year` quedan en `null` cuando se omiten. Las asignaciones de personajes se gestionan en las rutas correspondientes.

Para crear un personaje se requieren `real_name`, `alias`, `main_power` y `power_level`. Cuando se omiten, `status` toma el valor `ACTIVE`, `is_villain` toma el valor `false` y `team_id` queda en `null`.

En el PUT de personajes se requieren los campos no nulos, incluidos `status` e `is_villain`. Si se omite `team_id` o se envía como `null`, el personaje queda sin equipo.

Ejemplo de asignación de personajes a un equipo:

```json
{
  "characterIds": [16, 17]
}
```

Los ids de este ejemplo deben existir en la base de datos utilizada.

## Validaciones y reglas de negocio

- Los equipos y personajes inexistentes responden con `404` en las operaciones sobre un recurso específico.
- El nombre de los equipos y el alias de los personajes son únicos. Los duplicados responden con `409`.
- `power_level` debe ser un entero entre `1` y `100`.
- Los estados permitidos son `ACTIVE`, `INJURED`, `MISSING` y `RETIRED`.
- Al crear o reemplazar un personaje con `team_id`, el equipo debe existir y estar activo.
- Para asignar personajes a un equipo, todos los ids deben existir y el equipo debe estar activo. Si un personaje ya pertenece a otro equipo, se reasigna.
- La creación de equipos con personajes y las asignaciones usan transacciones para evitar cambios parciales.
- Un equipo con personajes asociados no puede eliminarse: responde con `409`. Puede desactivarse mediante PUT con `active: false` y los demás datos del reemplazo.
- Un personaje `RETIRED` no puede pasar directamente a `INJURED`; responde con `400`. Sí puede volver a `ACTIVE`. La regla aplica tanto a PUT como a PATCH.
- Las entradas inválidas y las propiedades no permitidas responden con `400`.

## Códigos de respuesta

| Código | Uso |
|---|---|
| `200 OK` | Consulta, actualización o eliminación exitosa. |
| `201 Created` | Creación exitosa. |
| `400 Bad Request` | Entrada inválida o regla de negocio incumplida. |
| `404 Not Found` | Recurso inexistente. |
| `409 Conflict` | Nombre o alias duplicado, o eliminación de un equipo con personajes. |

## Pruebas funcionales

Con Docker y la API encendidos:

1. Importar `postman/Pruebas_Taller_Marvel.postman_collection.json` en Postman.
2. Ejecutar la colección completa en su orden original, con una iteración y ejecución local.
3. La variable `baseUrl` incluida es `http://localhost:3000`. No se necesita un environment adicional ni un archivo de datos.
4. Revisar que las comprobaciones terminen aprobadas. Los HTTP `400`, `404` y `409` son resultados esperados en los casos negativos.

La colección captura los ids automáticamente, crea registros propios con prefijo `QA-` y los elimina al terminar. Además, compara los datos previos y posteriores para comprobar que los registros existentes se conservaron. Si la ejecución se interrumpe o la API falla durante la limpieza, pueden quedar registros de prueba de esa ejecución.

Resultado de la ejecución exportada el **18 de octubre de 2026**:

| Verificación | Resultado |
|---|---:|
| Peticiones ejecutadas | 83 |
| Comprobaciones aprobadas | 114 |
| Comprobaciones fallidas | 0 |
| Conservación de equipos y personajes previos | Aprobada |
| Compilación con `npm run build` | Exitosa |

La colección cubre los 13 endpoints, los filtros, las reglas de negocio, los errores esperados y la limpieza de los registros de prueba. La evidencia se incluye en `postman/Resultados_Taller_Marvel.postman_test_run.json`.

## Detener y reanudar

Detener la API con `Ctrl + C` en su terminal. Para detener PostgreSQL desde la carpeta de la base de datos:

```powershell
docker compose stop
```

Para reanudar, ejecutar `docker compose up -d` en la carpeta de la base de datos y `npm run start:dev` desde `api`.