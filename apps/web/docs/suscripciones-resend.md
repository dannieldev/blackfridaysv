# Suscripciones y alertas con Resend

## Estado de esta entrega

Implementación preparada en el repositorio local. **No está publicada ni activada.** `SUBSCRIPTIONS_ENABLED` sigue en `false` y no se han enviado correos reales.

La migración `supabase/migrations/20261020000000_email_subscriptions.sql` se ejecutó y probó en PostgreSQL local mediante PGlite. **No se aplicó a Supabase remoto:** el acceso administrativo disponible devolvió HTTP 403 por falta de privilegios. La clave de servicio que usa el catálogo no sustituye el acceso administrativo necesario para crear tablas. Hace falta aplicar la migración desde una cuenta con acceso a ese proyecto, por SQL Editor o mediante una conexión administrativa autorizada.

## Experiencia del comprador

- «Elegir mis avisos», al final del catálogo: correo, categorías y presupuesto opcional. Sin categorías seleccionadas, incluye todas.
- «Avisarme de una bajada», en la ficha: precio objetivo para ese producto y tienda; hasta 20 productos. El resumen general es una opción separada, inicialmente desmarcada.
- Consentimiento explícito sin casilla preseleccionada. Se envía una confirmación con vigencia de 24 horas; abrir el enlace no activa nada hasta pulsar el botón de confirmación.
- Como máximo un resumen de precios por día de El Salvador, con hasta diez coincidencias. Las confirmaciones de nuevas solicitudes son mensajes separados.
- Cada resumen incluye baja de todos los avisos, sin contraseña. Las visitas automáticas al enlace no dan de baja al usuario; el POST del botón o del mecanismo de baja del proveedor sí lo hace.

Sin configuración, el formulario explica que los avisos todavía no están disponibles y no permite enviar ni guardar el correo. Un fallo del proveedor se muestra como fallo: no aparece una suscripción activa ficticia.

## Qué se guarda

| Tabla privada | Contenido |
| --- | --- |
| `email_opt_ins` | Solicitud pendiente, correo, intereses, origen, versión del consentimiento y hash del token; nunca el token de confirmación en texto claro. |
| `email_subscribers` | Correo confirmado, estado, categorías, presupuesto, fecha y versión del consentimiento, últimos precios incluidos en resúmenes. |
| `email_price_alerts` | Producto, precio objetivo, activación y último precio notificado. |
| `email_deliveries` | Mensaje preparado, fecha diaria, estado, intentos e identificador de Resend. |
| `email_rate_limits` | Contadores temporales con identificadores derivados mediante hash; no almacena la IP en texto claro. |

Las cinco tablas tienen RLS. `anon` y `authenticated` no tienen acceso a ellas ni a sus funciones. Sólo el servidor usa `service_role`; el frontend recibe únicamente la disponibilidad del servicio y respuestas del formulario. No se añaden correos ni preferencias al snapshot público.

Las solicitudes de confirmación con más de siete días y los registros de envío con más de noventa días se eliminan al ejecutar la limpieza del proceso de avisos. Al pausar los envíos, ejecutar periódicamente `select public.bf_email_cleanup();` desde una sesión administrativa para mantener esa limpieza. La baja conserva el registro del suscriptor; una solicitud de eliminación completa debe atenderse desde administración, eliminando el suscriptor y sus solicitudes pendientes asociadas.

## Activación pendiente

1. Aplicar **únicamente** la migración nueva en el proyecto Supabase que ya usa BlackFridaySV. No ejecutar de nuevo la migración inicial del catálogo. Comprobar RLS y ausencia de permisos públicos antes de activar el formulario.
2. Crear o conectar la cuenta de Resend y verificar un dominio propio siguiendo su [guía de dominios](https://resend.com/docs/dashboard/domains/introduction). Elegir el remitente real bajo ese dominio. No se ha supuesto ni verificado ninguna dirección nueva.
3. Cargar en los secretos del Worker `blackfridaysv` las variables de la tabla siguiente. Se pueden cargar desde Cloudflare o con `npx wrangler secret put NOMBRE`, ejecutado en `apps/web`; el valor se introduce en el prompt privado, no en el comando ni en el chat.
4. Mantener las mismas variables privadas en GitHub Actions. Cambiar `vars.SUBSCRIPTIONS_ENABLED` a `true` en `apps/web/wrangler.jsonc` y establecer la variable del repositorio `SUBSCRIPTIONS_ENABLED=true` sólo al activar el sistema. El archivo de Wrangler debe conservar ese valor en futuros despliegues; cambiarlo únicamente en el panel remoto sería sobrescrito.
5. Ejecutar las pruebas y publicar el Worker. Verificar que `/api/subscriptions/config` devuelve `{"enabled":true}`. Hacer una suscripción de prueba con un correo propio autorizado, comprobar recepción, confirmación, selección de precios y baja antes de invitar compradores.

| Variable | Cloudflare Worker | GitHub Actions |
| --- | --- | --- |
| `SUPABASE_URL` | Secreto | Secreto existente |
| `SUPABASE_SERVICE_ROLE_KEY` | Secreto | Secreto existente |
| `RESEND_API_KEY` | Secreto | Secreto |
| `EMAIL_TOKEN_SECRET` | Secreto | El mismo secreto |
| `EMAIL_FROM` | Secreto con el remitente verificado | Variable de repositorio |
| `SITE_URL` | Variable ya configurada con el dominio del sitio | Configurada en el workflow |
| `SUBSCRIPTIONS_ENABLED` | Variable de Wrangler; inicialmente `false` | Variable de repositorio; inicialmente ausente/desactivada |
| `EMAIL_BATCH_LIMIT` | No aplica | Variable opcional; por defecto 50, máximo 1.000 |

Generar `EMAIL_TOKEN_SECRET` con al menos 32 bytes aleatorios y conservarlo en el gestor de secretos. No rotarlo sin planificar qué ocurrirá con los enlaces de baja ya enviados: la firma depende de este valor. Ninguna de las variables privadas debe llevar prefijo `VITE_`.

## Operación y límites

El workflow existente actualiza el catálogo dos veces al día. Tras un despliegue exitoso, si las variables de correo están activadas y el endpoint publicado confirma disponibilidad, ejecuta `npm run notifications:send`. No envía durante `dry-run`, si falla el despliegue o si falta configuración. Para la entrega inicial hay un máximo de 50 intentos por ejecución; ajustar el límite conforme crezca la lista y revisar la cuota real de Resend. Los costes y límites dependen de la cuenta del proveedor; no se presupone un plan suficiente.

Las alertas sólo usan capturas de hasta 24 horas, no conservadas por fallos y sin un estado explícito de agotado. Un objetivo avisa al alcanzarse y vuelve a avisar si el precio baja por debajo del último notificado. El resumen general exige una bajada entre las dos últimas capturas, respeta categoría y presupuesto, y no repite el mismo precio. No afirma mínimos históricos ni disponibilidad garantizada.

La cola tiene una clave única por suscriptor y día de El Salvador. Cada mensaje se conserva para reintentar exactamente el mismo contenido con la misma [clave de idempotencia de Resend](https://resend.com/docs/dashboard/emails/idempotency-keys). Los trabajos caducan al cambiar de día, al cumplir 20 horas o al vencer la vigencia de la captura; así se evita reintentar fuera de las 24 horas que cubre el proveedor. El bloqueo de trabajo vence tras diez minutos y hay un máximo de cinco intentos. La baja cancela trabajos pendientes; un correo que ya está saliendo podría llegar.

`acceptedByProvider` significa que Resend aceptó la solicitud, no que llegó a la bandeja del comprador. Revisar entregas, rebotes, quejas y supresiones en Resend. Esta versión no sincroniza esos eventos mediante webhooks a la base de datos.

Los informes `.reports/notifications.json` contienen sólo contadores, sin direcciones, tokens ni cuerpos de correo. En GitHub quedan como artefacto de la ejecución. El catálogo conserva su caché y snapshot existentes; las rutas `/api/` usan `no-store` y el service worker no las intercepta.

## Desarrollo y verificación

```bash
npm test
npm run build
npm run notifications:preview
```

`notifications:preview` requiere la migración aplicada y la conexión privada a Supabase. Sólo lee suscriptores activos y calcula coincidencias: no escribe ni envía. Hasta aplicar la migración remota, ese comando no puede completar la consulta.

Para desarrollo del formulario, copiar `apps/web/.dev.vars.example` a `apps/web/.dev.vars`, mantener inicialmente los avisos desactivados y ejecutar en terminales separadas `npm run dev` y `npm run dev:api`. Vite reenvía `/api` al Worker local en el puerto 8787. `SITE_URL` debe coincidir exactamente con el origen usado en el navegador; el ejemplo utiliza `http://127.0.0.1:3030`.

Las pruebas automatizadas usan Resend simulado y PostgreSQL local. Cubren consentimiento, expiración, aislamiento de datos, preferencias, límites, bajas, reintentos, exclusión de precios antiguos, errores del proveedor y renderizado inicial del formulario. El empaquetado de Cloudflare se comprobó mediante `wrangler deploy --dry-run`, que no publica.

La comprobación visual del sitio local permanece pendiente: la herramienta de navegador bloqueó esa URL por su política de acceso. No se sustituyó por otra herramienta para eludir el bloqueo.
