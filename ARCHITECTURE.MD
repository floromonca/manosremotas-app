cat > ARCHITECTURE.MD <<'EOF'
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
- No existe cruce de datos entre empresas.

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

## 7. Estados de Work Order

Estados operativos:

- new
- in_progress
- resolved
- closed

Una orden se considera facturada cuando:
- `invoice_id` no es null.

"Invoiced" es un estado derivado en UI, no un estado operativo.

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
Sin **jornada activa (shift abierto)** no se permite operar órdenes.

Operar = acciones que cambian estado o generan impacto operativo/financiero, por ejemplo:
- Cambiar status de una Work Order
- Agregar comentarios
- Generar factura (invoice)

Esto aplica incluso si el usuario está autenticado (Login ≠ Jornada).

### 12.2 UX esperada
Cuando la jornada está **cerrada**:
- Work Orders muestra banner **⚠️ Jornada cerrada** con guía clara.
- Debe existir un CTA para ir a **Control Center → Check-in**.
- Se permite ver/listar órdenes, pero no operarlas.

Cuando la jornada está **activa**:
- Work Orders muestra banner **✅ Jornada activa**.
- Se permite operar órdenes normalmente.

### 12.3 Enforced en backend (no solo UI)
El bloqueo debe existir en el backend para que:
- No se pueda “bypassear” desde consola o llamadas directas a Supabase.
- La seguridad sea consistente.

### 12.4 Tests mínimos (manual)
Pruebas de referencia (Control Center + Work Orders):

- Prueba 0: UI sin sesión muestra Sign in / Sign up.
- Prueba 1: Login ok → carga empresa activa.
- Prueba 2: Control Center KPIs + lists cargan.
- Prueba 3: Botones “View →” abren /work-orders con filtro correcto.
- Prueba 4: Filtros por URL funcionan (ej: ?filter=delayed).
- Prueba 5: Jornada (check-in / check-out) refleja estado.
- Prueba 6: Con jornada cerrada, intentar operar (status/comment/invoice) bloquea con error tipo:
  “No puedes operar sin check-in”.
EOF