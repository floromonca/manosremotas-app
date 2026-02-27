# ManosRemotas – Architecture v1.0

## 1. Propósito

ManosRemotas es un sistema multi-empresa (multi-tenant) para gestión de órdenes de trabajo, ejecución en campo y facturación básica, enfocado inicialmente en Canadá (Ontario) y Colombia.

El objetivo de v1.0 es estabilidad operativa, no complejidad.

---

## 2. Principios Fundamentales

### 2.1 Tríada de Identidad

Login ≠ Jornada ≠ Orden ≠ Factura

- Login: Control de identidad y permisos.
- Jornada (Shift): Control de ingreso y salida del técnico.
- Orden (Work Order): Ejecución operativa del trabajo.
- Factura (Invoice): Documento financiero.

Estos conceptos nunca se mezclan.

---

## 3. Arquitectura General

### 3.1 Stack

- Frontend: Next.js (App Router)
- Backend: Supabase (Postgres + RLS)
- Base de datos: PostgreSQL
- Autenticación: Supabase Auth
- Multi-tenant: Aislamiento por company_id

---

## 4. Multi-Tenant

### 4.1 Modelo

- Un usuario puede pertenecer a múltiples empresas.
- La relación se define en `company_members`.
- Cada empresa tiene sus propios:
  - Work Orders
  - Invoices
  - Técnicos
  - Configuración fiscal

### 4.2 Empresa Activa

- La aplicación opera siempre sobre una `activeCompanyId`.
- Se obtiene desde:
  - localStorage (si existe)
  - o la primera membership del usuario
- No existe company switcher visible en v1.0.

---

## 5. Seguridad

### 5.1 Row Level Security (RLS)

- Todas las tablas principales contienen `company_id`.
- Las políticas RLS filtran por:
  - membership válida
  - rol dentro de la empresa
  - (cuando aplica) jornada activa
- No existe cruce de datos entre empresas.

### 5.2 Regla anti-recursión (lección aprendida)

- Evitar policies que se auto-consultan sobre la misma tabla (ej: `company_members` consultando `company_members`)
  porque puede causar error 500 por **infinite recursion detected**.
- Preferir policies simples (ej: “ver mi fila”) y mover lógica compleja a vistas seguras/funciones si hace falta.

### 5.3 Backend-first (DB manda)

- La UI nunca se considera un control de seguridad.
- Todas las reglas críticas deben estar enforced en DB (RLS + triggers).
- Aunque el usuario intente operar vía consola/Postman, la DB debe bloquearlo.

---

## 6. Capas del Código

### 6.1 app/

Contiene páginas.
Responsabilidad: ensamblaje de componentes y hooks.

No debe contener lógica pesada de negocio.

---

### 6.2 components/

Contiene componentes UI reutilizables.

Responsabilidad:
- Renderizado
- Props
- Mostrar errores

No debe:
- Hacer queries directas
- Manejar Supabase directamente

---

### 6.3 hooks/

Contiene lógica de estado y orquestación.

Responsabilidad:
- Llamar funciones de lib/
- Manejar loading y error
- Exponer estado limpio a componentes

---

### 6.4 lib/

Contiene acceso a datos y lógica de infraestructura.

Responsabilidad:
- Queries a Supabase
- CRUD
- Helpers

No debe contener JSX.

---

## 7. Work Orders (Estado + Operación)

### 7.1 Estados operativos

Estados operativos base:

- new
- in_progress
- resolved
- closed

Nota:
- "Invoiced" es un estado derivado en UI, no un estado operativo.
- Una orden se considera facturada cuando `invoice_id` no es null.

### 7.2 UI: Work Orders

Ruta:
- `/app/work-orders/page.tsx`

Capacidades:
- Lista con filtros por URL:
  - `all | mine | unassigned | delayed | ready_to_invoice`
- Muestra empresa activa y contexto de sesión.
- Selector de status por orden (UI), pero la DB es quien decide.

### 7.3 State Machine (reglas de transición)

- La DB controla transiciones válidas (trigger).
- Ejemplo ya validado:
  - Tech NO puede hacer `resolved -> in_progress` (no puede “devolver” una orden).

---

## 8. Facturación (Modelo A+)

Se mantiene relación bidireccional:

En `invoices`:
- work_order_id

En `work_orders`:
- invoice_id
- invoiced_at

No se permite facturar dos veces la misma orden.

---

## 9. Multi-País

Cada empresa define:

- country_code
- currency_code

Impuestos:
- Canadá (Ontario) default: 13% HST
- Colombia default: 19% IVA
- Personalizable vía tax_profiles

---

## 10. Alcance v1.0

Incluye:
- Work Orders
- Control Center
- Jornada (Shift)
- Facturación básica
- Multi-tenant estructural
- Multi-país base

No incluye:
- Company switcher
- Offline completo
- PDF de factura
- Pagos online
- Reportes financieros avanzados
- Notificaciones push

---

## 11. Filosofía

ManosRemotas v1.0 busca ser:

- Estable
- Predecible
- Seguro
- Operativamente sólido

No busca ser complejo.

---

## 12. Bloqueo Operativo (Shift Gate)

### 12.1 Regla de oro
Sin **jornada activa (shift abierto)** no se permite operar.

Operar = acciones que cambian estado o generan impacto operativo/financiero, por ejemplo:
- Cambiar status de una Work Order
- Agregar comentarios
- Generar factura (invoice)
- Agregar/editar/borrar items (work_order_items, invoice_items)

Esto aplica incluso si el usuario está autenticado (Login ≠ Jornada).

### 12.2 UX esperada
Cuando la jornada está **cerrada**:
- Debe mostrarse banner **⚠️ Jornada cerrada** con guía clara.
- Debe existir un CTA para ir a **Control Center → Check-in**.
- Se permite ver/listar, pero no operar.

Cuando la jornada está **activa**:
- Debe mostrarse banner **✅ Jornada activa**.
- Se permite operar normalmente.

### 12.3 Enforced en backend (no solo UI)
El bloqueo debe existir en el backend para que:
- No se pueda “bypassear” desde consola o llamadas directas a Supabase.
- La seguridad sea consistente.

### 12.4 Tests mínimos (manual)
Pruebas de referencia (Control Center + Work Orders + Invoices):

- Prueba 0: UI sin sesión muestra Sign in / Sign up.
- Prueba 1: Login ok → carga empresa activa.
- Prueba 2: Control Center KPIs + lists cargan.
- Prueba 3: Botones “View →” abren /work-orders con filtro correcto.
- Prueba 4: Filtros por URL funcionan (ej: ?filter=delayed).
- Prueba 5: Jornada (check-in / check-out) refleja estado.
- Prueba 6: Con jornada cerrada, intentar operar (status/comment/invoice/items) bloquea con RLS.

---

## 13. Asignación de órdenes (Assignment Control)

### 13.1 Regla (v1.0)
La asignación `assigned_to` es controlada por **owner/admin**.

- Un usuario con rol **tech** puede ver órdenes (según RLS), pero **no puede** cambiar `assigned_to`.
- Flujo operativo v1.0:
  “Tech ve la orden → solicita asignación → owner/admin asigna”.

### 13.2 UI v1.0 (implementado)
En Work Orders:

- Si la orden está `unassigned`:
  - Owner/Admin ve un dropdown “Asignar a técnico”.
  - Tech NO ve opciones de asignación (ni botón ni dropdown).
- La lista de técnicos sale desde `company_members` filtrando `role = tech`.

### 13.3 Razón de negocio
En empresas pequeñas, normalmente el administrador quiere controlar:
- prioridades,
- cargas de trabajo,
- y responsabilidades.

Esto reduce caos operativo en v1.0.

### 13.4 Mejora futura (pendiente de validación)
Posible feature: **auto-asignación** por tech (self-assign) bajo condiciones:
- solo si la orden está unassigned
- opcional por empresa (flag)
- con auditoría

**Estado:** NO implementar aún. Se valida con empresas reales primero.

---

## 14. Implementación actual (referencia)

### 14.1 Frontend (v1.0)
- `/app/work-orders/page.tsx`
  - Detecta `myRole` desde `company_members`.
  - Carga lista de miembros para asignación (owner/admin).
  - Usa `getOpenShift()` para mostrar estado de jornada.
  - Cambia status vía `setWorkOrderStatus()` (la DB valida).
  - Asigna vía `setWorkOrderAssignee()` solo desde UI owner/admin (la DB valida).

- `/app/invoices/[invoiceId]/page.tsx`
  - Carga invoice + items.
  - Importante: el SELECT de `invoices` debe incluir `company_id` para poder insertar items con RLS.
    Ejemplo: `select("invoice_id, company_id, ...")`
  - Inserta items con `company_id` SIEMPRE (no condicional):
    `insert({ company_id, invoice_id, ... })`

### 14.2 Backend (v1.0)
- DB gobierna:
  - Shift Gate (RLS) para operaciones
  - Control de asignación (RLS/triggers)
  - Auditoría (trigger)
  - Reglas de transición de status (trigger)

---

## 15. Reglas específicas de Items

### 15.1 work_order_items
- Se usan para definir el alcance/costos de la orden (materiales/servicios).
- Regla de operación:
  - Con jornada activa: se permite operar según rol y reglas del negocio.
  - Con jornada cerrada: bloqueado por RLS (shift gate).

### 15.2 invoice_items
- Se usan para facturación (líneas de factura).
- Regla de operación (validada):
  - Owner/Admin con jornada activa: puede INSERT/UPDATE/DELETE.
  - Owner/Admin con jornada cerrada: bloqueado por RLS.
  - Tech con jornada activa: permitido según policy actual (si el negocio decide restringirlo, se ajusta).
  - Tech con jornada cerrada: bloqueado por RLS.

### 15.3 Lección aprendida (clave)
- Tener una policy “admin insert” sin shift gate rompe la regla de oro.
- Se corrigió asegurando que las policies admin también exijan jornada activa.

---

## 16. Candado: 1 Shift abierto por usuario + compañía

Para evitar estados inconsistentes y pruebas “raras”:

- Regla: solo puede existir **1 shift abierto** por `(company_id, user_id)`.
- Implementación recomendada:
  - índice único parcial sobre `shifts` donde `check_out_at is null`.

Resultado esperado:
- Si ya hay jornada activa, UI deshabilita check-in (mejor UX).
- Si alguien intenta por API/DB: el índice bloquea.
