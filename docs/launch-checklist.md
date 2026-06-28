# Promptoteca GIANT - Launch Checklist

## Antes del piloto cerrado

- Crear proyecto Supabase en region UE cuando este disponible.
- Aplicar `supabase/migrations/001_initial_schema.sql`.
- Cargar `supabase/seed.sql` y completar los 10-15 prompts curados.
- Configurar variables de entorno de `.env.example`.
- Confirmar que `SUPABASE_SERVICE_ROLE_KEY` solo existe en servidor.
- Generar embeddings server-side para prompts visibles con `text-embedding-3-small`.
- Probar RLS con usuario anonimo, usuario registrado, moderador y admin.
- Revisar textos legales con asesoria juridica.

## Antes del piloto abierto

- Activar email verification y recuperacion de contrasena en Supabase Auth.
- Definir SMTP transaccional y plantillas de correo.
- Configurar rate limits para registro, subida de prompts, reportes y busqueda semantica.
- Activar logs administrativos y alertas de abuso.
- Validar exportacion y eliminacion de cuenta.
- Revisar politica de datos de OpenAI, region configurada y consentimiento informado.

## Criterios de aceptacion

- Un visitante abre un primer prompt y queda bloqueado al segundo.
- Un usuario registrado copia, usa plantilla, guarda favorito y crea una version privada.
- Un prompt subido queda visible como pendiente y aparece en moderacion.
- Moderacion puede aprobar, pedir cambios, ocultar o archivar.
- Busqueda textual funciona sin claves externas.
- Busqueda semantica usa OpenAI/Supabase si hay credenciales y cae a texto si no las hay.
