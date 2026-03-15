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

## 12. Estado de Implementación y Pruebas (v1.0)

### 12.1 Implementado ✅
- Control Center operativo en `/control-center` con KPIs y “Attention Today”.
- Multi-tenant por `activeCompanyId` (localStorage) funcionando.
- Work Orders operativo en `/work-orders` con filtros por URL.
- Jornada (Shift) implementada como dominio separado:
  - UI de Check-in / Check-out en Control Center
  - Carga de jornada abierta al entrar (getOpenShift)
- KPI “Technicians Working” basado en `shifts` abiertos (REAL, no proxy por work_orders).
- Navegación Control Center → Work Orders por filtros:
  - `/work-orders?filter=unassigned`
  - `/work-orders?filter=delayed`
  - `/work-orders?filter=ready_to_invoice`

### 12.2 Pruebas ejecutadas ✅
- Prueba 0: Boot limpio sin `activeCompanyId` → OK
- Prueba 1: Jornada end-to-end (check-in / check-out + DB) → OK
- Prueba 2: KPI real (shifts abiertos) + SQL validación → OK
- Prueba 3: “View →” filtra correctamente → OK
- Prueba 4: Persistencia de empresa activa (refresh) → OK
- Prueba 5: Regresión auth (sin pedir Sign in al navegar) → OK

### 12.3 Siguiente paso ⏭️
- Bloqueo operativo: en `/work-orders` impedir acciones si NO hay jornada activa.
  - Cambiar status
  - Comentar
  - Facturar

  