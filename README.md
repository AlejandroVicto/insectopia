# Insectopia

Red social para aficionados a los insectos, desarrollada como proyecto universitario de Programación Web.

## Tecnologías

- **Frontend:** React con Vite
- **Backend:** Java con Spring Boot y Maven
- **Base de datos:** MySQL y Flyway
- **Seguridad:** Spring Security y JWT
- **Pruebas de API:** Bruno
- **Control de versiones:** Git y GitHub

## Configuración del entorno de desarrollo — Insectopia

## 1. Requisitos

Para trabajar en el proyecto Insectopia se utilizan las siguientes herramientas:

| Herramienta | Versión de referencia |
|---|---|
| Java JDK | 21 |
| Node.js | 24 |
| npm | 11 |
| MySQL | 8.4 |
| Maven | Maven Wrapper incluido en `backend` |
| Git | Versión compatible con GitHub |
| Visual Studio Code | Editor recomendado |
| DBeaver | Cliente para administrar MySQL |

## 2. Configuración del frontend

Desde la raíz del repositorio, abrir una terminal PowerShell y ejecutar:

```powershell
cd frontend
npm install
```

Copiar el archivo de ejemplo para crear la configuración local:

```powershell
Copy-Item .env.example .env
```

Para iniciar React:

```powershell
npm run dev
```

La variable `VITE_API_URL` indica la dirección del backend. Su valor predeterminado para desarrollo local es `http://localhost:8080`.

## 3. Configuración del backend

Entrar a la carpeta `backend`:

```powershell
cd backend
```

Crear el archivo de variables de entorno:

```powershell
Copy-Item .env.example .env
```

Editar `.env` y configurar los valores locales:

- `DB_HOST`: servidor MySQL.
- `DB_PORT`: puerto de MySQL.
- `DB_NAME`: nombre de la base de datos.
- `DB_USER`: usuario de MySQL.
- `DB_PASSWORD`: contraseña de MySQL.
- `JWT_SECRET`: clave secreta para firmar tokens.
- `JWT_EXPIRATION`: duración configurada para tokens, en milisegundos.

No subir `.env` a GitHub.

### Generar una clave JWT

En PowerShell:

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$jwtSecret = [BitConverter]::ToString($bytes).Replace("-", "")
Set-Clipboard -Value $jwtSecret
$rng.Dispose()
```

Pegar la clave generada en el valor de `JWT_SECRET` del archivo `.env`.

## 4. Cargar variables de entorno en PowerShell

Desde la raíz del repositorio, ejecutar:

```powershell
Get-Content .\backend\.env | ForEach-Object {
    $linea = $_.Trim()
    if ($linea -and -not $linea.StartsWith("#")) {
        $partes = $linea -split "=", 2
        if ($partes.Count -eq 2) {
            $nombre = $partes[0].Trim()
            $valor = $partes[1].Trim()
            if ($nombre -match '^[A-Za-z_][A-Za-z0-9_]*$') {
                [Environment]::SetEnvironmentVariable($nombre, $valor, "Process")
            }
        }
    }
}
```

Las variables estarán disponibles en la terminal actual.

## 5. Compilar el backend

Desde `backend`:

```powershell
.\mvnw.cmd -DskipTests compile
```

Si se necesita almacenar las dependencias de Maven en otra unidad, por ejemplo D:, utilizar:

```powershell
.\mvnw.cmd "-Dmaven.repo.local=D:\maven-repository" -DskipTests compile
```

## 6. Ejecutar el backend

Crea una base de datos MySQL vacía (codificación `utf8mb4`) y configura su conexión en `backend/.env` según la sección 3. No es necesario crear las tablas manualmente: **Flyway ejecuta automáticamente las migraciones `V1` a `V10` antes de que arranque la aplicación** y Hibernate valida el esquema con `spring.jpa.hibernate.ddl-auto=validate`.

Modo normal, sin datos ficticios:

```powershell
.\mvnw.cmd spring-boot:run
```

El backend utilizará el puerto `8080` de forma predeterminada. En este modo se aplican las migraciones, pero `DatabaseSeeder` no se activa porque está anotado con `@Profile("demo")`.

Modo con datos de demostración (sección "Datos de demostración"): se añade el perfil `demo` y el seeder genera los 288 registros ficticios después de Flyway.

## 7. Seguridad

- Nunca subir archivos `.env` con credenciales reales.
- No incluir contraseñas directamente en el código fuente.
- Utilizar claves JWT aleatorias.
- Cada desarrollador debe utilizar su propia configuración local.
- Compartir únicamente archivos `.env.example` y otras plantillas sin secretos.

## Base de datos — Insectopia

### Modelo de datos

Insectopia utiliza MySQL 8.4 como sistema gestor de base de datos y Flyway para el control de versiones del esquema.

El modelo consta de 16 tablas de aplicación:

- **Usuarios y roles:** `usuarios`, `roles`, `auditoria_roles`.
- **Interacción social:** `publicaciones`, `comentarios`, `reacciones`, `seguidores`.
- **Mensajería:** `conversaciones`, `participantes_conversacion`, `mensajes`.
- **Eventos:** `eventos`, `participantes_evento`.
- **Moderación y notificaciones:** `reportes`, `notificaciones`.
- **Seguridad:** `tokens_recuperacion`, `tokens_revocados`.

El diagrama entidad-relación se encuentra en [database/ER/insectopia.png](database/ER/insectopia.png).

### Migraciones de Flyway

Se implementaron diez migraciones SQL, ubicadas en `backend/src/main/resources/db/migration/`, desde `V1` hasta `V10`.

Estas crean el esquema, sus relaciones y restricciones, e insertan los tres roles iniciales: `ADMINISTRADOR`, `MODERADOR` y `USUARIO`.

La tabla `flyway_schema_history` conserva el historial de ejecución.

### Datos de demostración

El backend incorpora `DatabaseSeeder`, un componente que solo se activa con el perfil `demo` (`@Profile("demo")`). Flyway ejecuta primero `V1`–`V10` y, a continuación, el seeder genera los datos ficticios. No dependas de scripts externos de carga: **reutiliza el bloque de carga de variables de la sección 4** (`Get-Content .\backend\.env | ForEach-Object { ... }`), ejecutado desde la raíz del repositorio. Después, entra en `backend` y ejecuta el backend con Maven Wrapper:

```powershell
cd backend
.\mvnw.cmd "-Dspring-boot.run.profiles=demo" spring-boot:run
```

Si necesitas ubicar el repositorio de Maven en otra unidad, conserva el argumento que ya se usa en la sección 5:

```powershell
.\mvnw.cmd "-Dmaven.repo.local=D:\maven-repository" "-Dspring-boot.run.profiles=demo" spring-boot:run
```

Diferencia entre ambos modos:

- `.\mvnw.cmd spring-boot:run`: arranca sin perfil `demo`; Flyway migra, pero no se cargan datos ficticios.
- `.\mvnw.cmd "-Dspring-boot.run.profiles=demo" spring-boot:run`: además de migrar, activa `DatabaseSeeder` y puebla la base con los datos de evaluación.

La carga es idempotente: ejecutarla varias veces no duplica usuarios, eventos ni participaciones. Si la base ya contuviera datos de una versión anterior del seeder, la reparación demo está limitada al perfil `demo`, se ejecuta en una transacción y solo elimina de forma individual las participaciones ficticias en eventos no aprobados que coinciden con la firma antigua (`fecha_inscripcion = fecha_creacion + 2 días`). Nunca elimina participaciones de usuarios reales ni aplica borrados masivos.

Conteos esperados tras la carga (288 registros de aplicación, incluidos los 3 roles de Flyway):

| Tabla | Registros |
|---|---:|
| roles | 3 |
| usuarios | 15 |
| publicaciones | 15 |
| comentarios | 30 |
| reacciones | 30 |
| conversaciones | 15 |
| participantes_conversacion | 30 |
| mensajes | 50 |
| eventos | 15 (5 APROBADOS, 5 PENDIENTES, 5 RECHAZADOS) |
| participantes_evento | 30 |
| seguidores | 20 |
| notificaciones | 20 |
| reportes | 15 |
| tokens_recuperacion | 0 |
| tokens_revocados | 0 |
| auditoria_roles | 0 |

Reglas de integridad de la actividad 037: las 30 participaciones demo pertenecen **exclusivamente a los 5 eventos APROBADOS**, se reparten 6 por evento sin superar el cupo máximo, no se repite la pareja `(id_evento, id_usuario)` y toda cancelación tiene `fecha_cancelacion >= fecha_inscripcion`.

Las contraseñas de los usuarios ficticios se almacenan mediante BCrypt. **Las cuentas y contraseñas demo son únicamente para desarrollo y evaluación local; no deben desplegarse ni reutilizarse en producción.**

### Validación de integridad

Las consultas utilizadas para verificar los registros y las relaciones se encuentran en:

`database/validaciones/039_validacion_integridad.sql`

El script es de solo lectura y **no contiene `USE insectopia;`**: muestra primero `DATABASE()` para que compruebes el esquema activo seleccionado en DBeaver antes de interpretar resultados. Conserva las comprobaciones de relaciones originales (incluidas conversaciones con dos participantes y remitentes que pertenecen a la conversación) y añade:

- participaciones en eventos no aprobados;
- eventos con inscritos que superan el cupo máximo;
- participaciones duplicadas por `(id_evento, id_usuario)`;
- canceladas sin fecha de cancelación y cancelaciones anteriores a la inscripción;
- diferencias entre los conteos esperados y los reales, incluidas las tres tablas que deben estar vacías;
- un resumen de participaciones agrupadas por estado del evento.

En una base nueva correctamente poblada con Flyway + perfil `demo`, todas las comprobaciones devuelven 0 errores.

### Respaldo SQL

El respaldo de la base de datos se generó con la herramienta **MySQL Dump** de DBeaver.

Archivo:

`database/insectopia_backup.sql`

El respaldo incluye la estructura, los datos ficticios y el historial de las diez migraciones Flyway.

**Este archivo es una instantánea anterior a la corrección de la actividad 037**: contiene participaciones en eventos PENDIENTES y RECHAZADOS, por lo que **no** debe considerarse una fuente con las participaciones corregidas. No se modifica ni se reemplaza automáticamente; conserva la evidencia histórica de la actividad 042. Para obtener los datos corregidos, crea una base nueva y ejecuta Flyway (`V1`–`V10`) junto con el perfil `demo`, tal como se indica en "Datos de demostración".

Para generar un respaldo equivalente se debe utilizar la opción **Tools → Dump database** de DBeaver, seleccionando estructura y datos, e incluyendo el argumento:

```text
--no-tablespaces
```

Este argumento evita requerir el privilegio global `PROCESS` para consultar información de tablespaces.

### Restauración de la base de datos

La restauración se verificó en una base independiente denominada `insectopia_restauracion`, sin modificar la base original.

Procedimiento:

1. Crear una base vacía con codificación `utf8mb4`.
2. Abrir **Tools → Restore database** desde la base de destino en DBeaver.
3. Seleccionar el archivo `insectopia_backup.sql`.
4. Confirmar que el destino sea la base temporal, nunca la base original.
5. Ejecutar la restauración.
6. Verificar los registros y el historial de Flyway mediante consultas SQL.

La prueba realizada recuperó correctamente:

- **288 registros** pertenecientes a las 16 tablas de la aplicación.
- **10 registros** del historial de migraciones Flyway.
- **298 registros en total**, distribuidos entre 17 tablas.

La restauración terminó sin errores visibles y los conteos coincidieron con los de la base original.

### Precauciones

Los respaldos deben revisarse antes de publicarse para evitar incluir credenciales, tokens o información real de usuarios. El archivo de configuración `.env` no debe agregarse al repositorio.

Las restauraciones de prueba deben realizarse exclusivamente sobre bases aisladas.
