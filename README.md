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
