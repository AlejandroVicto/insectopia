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

Una vez configurada la base de datos y las migraciones Flyway:

```powershell
.\mvnw.cmd spring-boot:run
```

El backend utilizará el puerto `8080` de forma predeterminada.

**Nota:** la aplicación aún requiere la creación del esquema MySQL y las migraciones correspondientes para iniciar completamente.

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

El backend incorpora `DatabaseSeeder`, un componente que genera datos ficticios cuando se activa el perfil `demo`.

Para ejecutarlo desde `backend`, primero deben cargarse las variables de entorno locales y después iniciarse Spring Boot:

```powershell
. .\cargar-env.ps1
.\mvnw.cmd "-Dmaven.repo.local=D:\maven-repository" "-Dspring-boot.run.profiles=demo" spring-boot:run
```

La carga es idempotente: las ejecuciones posteriores no deben duplicar los registros existentes.

El conjunto inicial de demostración contiene 288 registros, distribuidos entre usuarios, roles, publicaciones, comentarios, reacciones, conversaciones, mensajes, eventos, participaciones, seguidores, notificaciones y reportes.

Las contraseñas de los usuarios ficticios se almacenan mediante BCrypt.

### Validación de integridad

Las consultas utilizadas para verificar los registros y las relaciones se encuentran en:

`database/validaciones/039_validacion_integridad.sql`

La validación realizada en DBeaver confirmó los 288 registros esperados y no detectó inconsistencias en las 30 comprobaciones de integridad ejecutadas.

### Respaldo SQL

El respaldo de la base de datos se generó con la herramienta **MySQL Dump** de DBeaver.

Archivo:

`database/insectopia_backup.sql`

El respaldo incluye la estructura, los datos ficticios y el historial de las diez migraciones Flyway.

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
