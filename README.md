# Clockwork Payroll

Quiero desarrollar una aplicación web profesional de control horario (fichador de empleados), gestión de nóminas y control de horas extras para un taller mecánico.

El objetivo es sustituir completamente el fichaje en papel y automatizar el cálculo de salarios, horas extras y generación de nóminas.

La aplicación debe tener una interfaz moderna, responsive, rápida y fácil de utilizar desde móvil y ordenador.

Utilizar un diseño profesional con colores corporativos (azul oscuro, gris y blanco), iconografía moderna y una experiencia de usuario muy sencilla.

Debe utilizar una arquitectura preparada para cientos de trabajadores.

TECNOLOGÍA

Desarrollar con:

 Frontend moderno

 Backend seguro

 Base de datos SQL

 Autenticación mediante JWT

 API REST

Debe quedar preparado para desplegarse en:

 VPS

 Docker

 Cloud

 Vercel + Supabase (si se desea)

TIPOS DE USUARIO

Administrador

Puede:

 ver todos los trabajadores

 editar trabajadores

 eliminar trabajadores

 crear trabajadores

 desactivar trabajadores

 asignar salario personalizado

 asignar precio de hora extra

 modificar horario laboral

 generar nóminas

 descargar PDF

 enviar nómina para firma

 introducir fichajes manualmente

 crear incidencias

 generar informes

 ver estadísticas

Usuario

Puede:

 iniciar sesión

 fichar entrada

 fichar salida

 ver horas trabajadas

 ver horas extras

 consultar histórico

 descargar sus nóminas

 firmar las nóminas

 editar algunos datos personales

SISTEMA DE FICHAJE

Debe ser obligatorio.

No se permitirá fichar si:

 no existe geolocalización

 el GPS está desactivado

 el navegador no concede permisos

 la precisión GPS es mala (configurable)

La aplicación debe solicitar permisos automáticamente.

Debe guardar:

Fecha

Hora exacta

Latitud

Longitud

Precisión

Dirección obtenida mediante geocodificación

Dispositivo utilizado

Sistema operativo

Navegador

IP

Mapa con Google Maps u OpenStreetMap.

Guardar todo en la base de datos.

CONTROL DE UBICACIÓN

El administrador podrá configurar:

Radio permitido

Ejemplo:

100 metros

150 metros

300 metros

Si el trabajador ficha fuera del radio:

mostrar aviso

guardar incidencia

permitir o bloquear según configuración.

HORARIO LABORAL

Cada trabajador tendrá:

Hora entrada

Hora salida

Descanso

Horas diarias

Por defecto:

8 horas.

Ejemplo

08:00

16:00

30 minutos comida

Todo configurable.

HORAS EXTRAS

Una vez superadas las horas diarias:

comenzar automáticamente el cálculo de horas extras.

Ejemplo

8 horas normales

8:15

15 minutos extras.

Todo debe calcularse automáticamente.

El administrador podrá configurar:

precio hora normal

precio hora extra

precio hora festiva

precio hora nocturna

precio hora domingo

precio hora sábado

ACUMULACIÓN

Las horas extras deben acumularse automáticamente.

Mostrar:

Diarias

Semanales

Quincenales

Mensuales

Anuales

Todo mediante gráficos.

PANEL DEL TRABAJADOR

Dashboard con:

Bienvenida

Hora actual

Botón Fichar Entrada

Botón Fichar Salida

Estado actual

Tiempo trabajado hoy

Horas extras hoy

Horas extras del mes

Últimos fichajes

Calendario

Estadísticas

Historial

Nóminas

Firma pendiente

PANEL ADMINISTRADOR

Dashboard completo con:

Número de empleados

Trabajando ahora

Ausentes

Vacaciones

Horas extras acumuladas

Nóminas pendientes

Firmas pendientes

Incidencias

Mapa con empleados fichados

Gráficas

Filtros

Buscador

GESTIÓN DE EMPLEADOS

Cada empleado tendrá:

Nombre

Apellidos

DNI

Teléfono

Email

Dirección

Cargo

Departamento

Fecha alta

Estado

Salario base

Precio hora normal

Precio hora extra

Foto

Firma digital

Radio permitido

Horario personalizado

FICHAJE MANUAL

El administrador podrá crear fichajes manualmente.

Debe registrar:

Motivo

Administrador responsable

Fecha

Hora

Observaciones

Quedará marcado como:

"Fichaje manual"

Nunca como fichaje normal.

INCIDENCIAS

Registrar automáticamente:

No fichó

Llegó tarde

Salida anticipada

Fuera del radio

GPS desactivado

Sin internet

Corrección manual

Todas con historial.

NÓMINAS

La aplicación debe generar automáticamente una nómina profesional.

Inspirarse en el diseño del documento adjunto.

Adaptarlo para un taller mecánico.

Debe contener:

Logo empresa

Nombre empresa

Dirección

CIF

Datos trabajador

Periodo

Tabla de días trabajados

Horas normales

Horas extras

Horas festivas

Horas nocturnas

Anticipos

Descuentos

Dietas

Combustible

Bonificaciones

Otros conceptos

Subtotal

Deducciones

Total a pagar

Firma empresa

Firma trabajador

Fecha

Código QR

Número de nómina

Debe tener un aspecto muy profesional.

FIRMA DIGITAL

El administrador podrá generar una solicitud de firma.

El trabajador recibirá un enlace.

Desde el móvil podrá:

abrir la nómina

leerla

firmarla con el dedo

aceptarla

La firma quedará incrustada dentro del PDF.

Guardar:

Fecha

Hora

IP

Dispositivo

Navegador

Geolocalización opcional

Estado

Firmado

Pendiente

Rechazado

SELLO Y FIRMA EMPRESA

En configuración deberá existir:

Subir logo

Subir sello

Subir firma del gerente

Estos elementos aparecerán automáticamente en todas las nóminas.

EXPORTACIONES

Generar:

PDF

Excel

CSV

Imprimir

Enviar por correo

Enviar por WhatsApp

INFORMES

Por trabajador

Por fechas

Por meses

Por años

Horas extras

Horas normales

Incidencias

Retrasos

Costes salariales

Ranking trabajadores

NOTIFICACIONES

Enviar avisos cuando:

Olvidó fichar

Va a comenzar horas extras

Nómina disponible

Nómina firmada

Firma pendiente

Incidencia registrada

CALENDARIO

Mostrar:

Vacaciones

Festivos

Ausencias

Permisos

Bajas

SEGURIDAD

Registro completo de auditoría.

Guardar todas las acciones:

Quién

Qué

Cuándo

Desde dónde

IP

Dispositivo

No permitir modificar registros sin dejar trazabilidad.

CONFIGURACIÓN GENERAL

El administrador podrá modificar:

Nombre empresa

Logo

Colores

Salario por defecto

Precio hora extra

Horario

Radio GPS

Formato PDF

Formato nómina

Firma empresa

Sello empresa

BASE DE DATOS

Diseñar una base de datos normalizada con tablas para:

 Usuarios

 Roles

 Trabajadores

 Fichajes

 Ubicaciones GPS

 Horarios

 Horas extras

 Incidencias

 Nóminas

 Conceptos salariales

 Firmas digitales

 Configuración

 Auditoría

 Vacaciones

 Festivos

 Permisos

 Notificaciones

Incluir todas las relaciones, claves primarias, claves foráneas e índices para garantizar rendimiento.

EXPERIENCIA DE USUARIO

La aplicación debe tener una apariencia de software empresarial de alta gama, similar a plataformas como Factorial, Sesame HR o Personio, pero adaptada a un taller mecánico. Debe priorizar la simplicidad, rapidez y facilidad de uso tanto para administradores como para empleados.

Extras recomendados para una versión profesional:

 Inicio de sesión con autenticación en dos pasos (2FA).

 Registro fotográfico opcional al fichar para evitar suplantaciones.

 Detección de intentos de manipulación de la ubicación (GPS falso/mock location).

 Modo sin conexión: permitir fichar sin internet y sincronizar automáticamente cuando vuelva la conexión.

 Portal del empleado para solicitar vacaciones, permisos o justificar incidencias.

 Sistema de permisos por roles (gerente, encargado, administración, empleado).

 API preparada para integrarse con software de nóminas o ERPs en el futuro.

 Panel con indicadores de productividad y costes laborales en tiempo real.

## Despliegue e Instalación Independiente

### 1. Backend (Supabase)
1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ejecuta la migración de base de datos en `drizzle/migrations/0000_create_taller_core.sql` desde el SQL Editor de Supabase.
3. Copia tus claves de API (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

### 2. Desarrollo Local
1. Clona este repositorio.
2. Copia `.env.example` o configura las variables de entorno en `.env`:
   ```env
   VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="tu-anon-key"
   SUPABASE_URL="https://tu-proyecto.supabase.co"
   SUPABASE_PUBLISHABLE_KEY="tu-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
   ```
3. Instala las dependencias y ejecuta el servidor de desarrollo:
   ```sh
   npm install
   npm run dev
   ```

### 3. Despliegue en Vercel
1. Importa este repositorio en Vercel.
2. Configura las variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. El comando de build es `npm run build`.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gear-up-time.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5d62b40e-7865-4353-8779-46fa76df570f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
