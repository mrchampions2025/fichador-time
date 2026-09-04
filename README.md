# Fichador Time - Control Horario y Nóminas para Talleres

Aplicación web independiente construida con **Vite + React + TypeScript + Tailwind CSS**, desplegada en **Vercel** y conectada a **Supabase** (Database + Auth).

## 🚀 Características
- **Control de Fichajes**: Entrada, salida, pausas y geolocalización opcional.
- **Gestión de Plantilla**: Registro de empleados, cálculo de horas normales y extras.
- **Generación de Nóminas**: Cálculo automático de nóminas mensuales descargables en CSV.
- **Seguridad**: Autenticación nativa con Supabase Auth y políticas de acceso Row Level Security (RLS).

## 🛠️ Variables de Entorno

En Vercel (o en tu archivo `.env.local`), añade las credenciales de tu proyecto Supabase:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## 💻 Desarrollo Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Construir la aplicación para producción:
   ```bash
   npm run build
   ```

## 🗄️ Base de Datos (Supabase)

Para inicializar la base de datos en Supabase, ejecuta las migraciones SQL contenidas en `drizzle/migrations/0000_create_taller_core.sql` dentro del **SQL Editor** de tu proyecto Supabase.
