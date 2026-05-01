# 🔐 Production Auth Checklist — ManosRemotas

Este documento asegura que el flujo de autenticación y recuperación de contraseña funcione correctamente en producción.

---

## 1. Supabase — URL Configuration

Ir a:

Supabase → Authentication → URL Configuration

### Site URL

Cambiar a dominio real:

https://www.manosremotas.com

---

### Redirect URLs

Asegurarse de incluir:

https://www.manosremotas.com/auth/reset-password

Puedes dejar también:

http://localhost:3000/auth/reset-password

para desarrollo.

---

## 2. Supabase — Reset Password Template

Ir a:

Supabase → Authentication → Email Templates → Reset Password

### Template (producción)

```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your account:</p>

<p>
  <a href="{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery">
    Reset Password
  </a>
</p>