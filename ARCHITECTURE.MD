ManosRemotas – Architecture v1.2 (Auth Stabilized)
1. Propósito

ManosRemotas es un sistema multi-empresa (multi-tenant) para gestión de órdenes de trabajo, ejecución en campo y facturación básica, enfocado inicialmente en Canadá (Ontario) y Colombia.

El objetivo de v1.2 es:

Estabilidad operativa

Autenticación determinista

Seguridad backend-first

Arquitectura predecible

No complejidad innecesaria.

2. Principios Fundamentales
2.1 Tríada de Identidad

Login ≠ Jornada ≠ Orden ≠ Factura

Login: Identidad y sesión del usuario.

Jornada (Shift): Permiso operativo del técnico.

Orden (Work Order): Entidad operativa.

Factura (Invoice): Entidad financiera.

Nunca se mezclan responsabilidades.

3. Stack Tecnológico

Frontend: Next.js (App Router)

Backend: Supabase (Postgres + RLS)

Base de datos: PostgreSQL

Autenticación: Supabase Auth

Multi-tenant: Aislamiento por company_id

4. Modelo Multi-Tenant
4.1 Relaciones

Un usuario puede pertenecer a múltiples empresas.

Relación definida en company_members.

Todas las tablas críticas contienen company_id.

No existe cruce entre empresas.

4.2 Empresa Activa

La aplicación siempre opera sobre una activeCompanyId.

Resolución:

Se consultan memberships del usuario.

Se valida localStorage.activeCompanyId.

Si no existe o es inválida, se toma la primera membership válida.

Si no tiene membership → empresa no seleccionada.

No existe company switcher en v1.2.

5. Seguridad
5.1 RLS (Row Level Security)

Todas las tablas operativas incluyen company_id.

Las policies filtran por:

Membership válida

Rol dentro de la empresa

Jornada activa (cuando aplica)

La UI nunca es seguridad.

La base de datos manda.

5.2 Backend-first

Toda regla crítica debe existir en:

RLS

Triggers

Índices únicos

Constraints

Aunque el usuario use consola o API directa, la DB debe bloquear.

5.3 Regla Anti-Recursión

Nunca crear policies que consulten la misma tabla con lógica compleja.

Ejemplo prohibido:
company_members consultando company_members.

Puede generar:
infinite recursion detected.

Preferir policies simples y lógica compleja en funciones SQL si es necesario.

6. Arquitectura de Autenticación (Formalizada)
6.1 Rutas Oficiales
Ruta	Función
/auth	Login / Sign up
/work-orders	Operación principal
/control-center	Bootstrap de empresa
/invoices	Facturación
6.2 Flujo Determinista

Reglas oficiales:

Sin usuario → /auth

Usuario con membership válida → /work-orders

Usuario sin empresa → /control-center

Nunca redirigir a /control-center si no hay usuario.

6.3 CompanyGuard (Regla Oficial)

El guard:

Espera authLoading

Espera isLoadingCompany

Luego decide

Lógica:

if (!user) → /auth
if (user && !companyId) → /control-center
else → permitir acceso

Reglas:

Nunca usar redirecciones cruzadas.

Nunca depender de window.location.

Nunca envolver /auth con CompanyGuard.

6.4 Logout Estable

Logout debe ejecutarse así:

await supabase.auth.signOut();
router.replace("/auth");

No depender del guard para salir.

7. Capas del Código
7.1 app/

Páginas.

Ensamblaje de componentes.

Uso de hooks.

No contiene lógica pesada.

7.2 components/

UI pura.

Renderizado.

Props.

No hace queries directas.

7.3 hooks/

Orquestación de estado:

useAuthState

useActiveCompany

useOpenShift

Responsabilidad:

Loading

Error

Estado limpio para UI

7.4 lib/

Infraestructura:

Queries a Supabase

CRUD

Helpers

Sin JSX.

8. Work Orders
8.1 Estados Operativos

new

in_progress

resolved

closed

"Invoiced" es estado derivado (invoice_id no null).

8.2 Transiciones

Controladas por trigger en DB.

Ejemplo validado:
Tech no puede hacer resolved → in_progress.

9. Shift Gate (Bloqueo Operativo)

Sin jornada activa no se puede:

Cambiar status

Comentar

Generar factura

Editar items

Login ≠ Permiso de operar.

Shift manda.

10. Facturación (Modelo A+)

Relación bidireccional:

En invoices:

work_order_id

En work_orders:

invoice_id

invoiced_at

No se permite facturar dos veces la misma orden.

11. Multi-País

Cada empresa define:

country_code

currency_code

Defaults:

Ontario → 13% HST

Colombia → 19% IVA

Configurables vía tax_profiles.

12. Asignación de Órdenes

Regla v1.2:

Solo owner/admin pueden cambiar assigned_to.

Tech puede ver, pero no asignar.

Auto-assign queda pendiente para validación futura.

13. Candado de Shift

Solo puede existir:

1 shift abierto por (company_id, user_id).

Implementado con índice único parcial.

14. Estado Actual del Sistema

✔ Auth estable
✔ Routing sin loops
✔ Multi-tenant aislado
✔ Shift gate backend
✔ Asignación controlada
✔ Facturación base
✔ Logout determinista

15. Alcance v1.2

Incluye:

Auth formal /auth

CompanyGuard estabilizado

Work Orders

Control Center

Shift

Facturación básica

Multi-país base

No incluye:

Company switcher

Offline completo

PDF de factura

Pagos online

Reportes financieros avanzados

Notificaciones push

16. Filosofía

ManosRemotas v1.2 es:

Determinista

Seguro

Multi-tenant real

Backend-driven

Operativamente sólido

No improvisado.