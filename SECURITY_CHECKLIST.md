# Security Code Review Checklist

This document outlines security requirements and best practices for code changes in this application. Review this checklist before submitting any code changes that involve authentication, authorization, data access, or external API integrations.

---

## 🔒 Authentication & Authorization

### Required Checks
- [ ] **Never check admin status from client-side storage** (localStorage, sessionStorage)
- [ ] **Always verify roles server-side** using `has_role()` RPC function
- [ ] **Store roles in separate `user_roles` table**, never on `profiles` or `auth.users`
- [ ] **All admin operations must call `verifyAdminAccess()`** before execution
- [ ] **Edge functions must authenticate users** before processing sensitive operations
- [ ] **Use JWT authentication for manual operations**, webhook secrets for automated cron jobs
- [ ] **Disable DevMode in production** builds (already implemented)

### Anti-Patterns to Avoid
```typescript
// ❌ WRONG - Client-side auth check
if (localStorage.getItem('isAdmin') === 'true') {
  // Admin operations
}

// ✅ CORRECT - Server-side verification
const { data: hasRole } = await supabase.rpc('has_role', {
  _user_id: user.id,
  _role: 'admin'
});
if (!hasRole) {
  throw new Error('Insufficient permissions');
}
```

---

## 🛡️ Row-Level Security (RLS)

### Required Checks
- [ ] **All tables with user data MUST have RLS enabled**
- [ ] **RLS policies must use `auth.uid()`** for user isolation
- [ ] **Admin operations must check `has_role(auth.uid(), 'admin')`**
- [ ] **Public read-only tables** can allow SELECT for all authenticated users
- [ ] **System tables** (sync_history, user_activity_logs) require admin role for all operations
- [ ] **Test RLS policies** by attempting unauthorized access

### Example RLS Policies
```sql
-- User can only see their own ratings
CREATE POLICY "Users can view own ratings"
ON user_ratings FOR SELECT
USING (auth.uid() = user_id);

-- Admins can see all ratings
CREATE POLICY "Admins can view all ratings"
ON user_ratings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

---

## 🔐 Edge Function Security

### Required Checks
- [ ] **Return generic error messages** to clients (use `[INTERNAL]` prefix in logs)
- [ ] **Never expose API keys, secrets, or internal state** in error responses
- [ ] **Log detailed errors to console** with `[INTERNAL]` prefix for debugging
- [ ] **Validate all input parameters** with type checking and range validation
- [ ] **Use webhook secrets** for cron job authentication (`x-cron-secret` header)
- [ ] **Use JWT tokens** for manual user-initiated operations
- [ ] **Implement dual authentication** for functions called by both cron and users
- [ ] **Set appropriate HTTP status codes** (503 for service errors, 401 for auth, 403 for permissions)

### Error Message Guidelines
```typescript
// ❌ WRONG - Exposes internal details
if (!TMDB_API_KEY) {
  return new Response(JSON.stringify({ 
    error: "TMDB API key not configured" 
  }));
}

// ✅ CORRECT - Generic message, detailed log
if (!TMDB_API_KEY) {
  console.error("[INTERNAL] TMDB_API_KEY not configured");
  return new Response(JSON.stringify({ 
    error: "Service temporarily unavailable",
    code: "SERVICE_ERROR" 
  }), { status: 503 });
}
```

---

## 🔑 Secrets Management

### Required Checks
- [ ] **Never hardcode secrets** in code or configuration files
- [ ] **Use environment variables** for all API keys and secrets
- [ ] **Store secrets in Lovable Cloud** secrets manager
- [ ] **Verify secrets exist** before using them in edge functions
- [ ] **Use generic error messages** if secrets are missing
- [ ] **Rotate secrets regularly** (monthly for high-security, quarterly for others)

### Secrets Inventory
| Secret Name | Purpose | Rotation Schedule |
|-------------|---------|-------------------|
| `TMDB_API_KEY` | Movie data fetching | Quarterly |
| `OMDB_API_KEY` | Movie enrichment | Quarterly |
| `CRON_SECRET` | Webhook authentication | Monthly |
| `LOVABLE_API_KEY` | System integration | Managed by system |

---

## 🗄️ Database Security

### Required Checks
- [ ] **Use Supabase client methods**, never raw SQL in edge functions
- [ ] **Validate foreign key relationships** before insertion
- [ ] **Use SECURITY DEFINER functions** sparingly and with `SET search_path = public`
- [ ] **Prevent SQL injection** by using parameterized queries (Supabase client handles this)
- [ ] **Never expose `auth.users` table** to clients
- [ ] **Use `profiles` table** for additional user information
- [ ] **Implement triggers** for validation instead of CHECK constraints with time-based logic

### Database Function Guidelines
```sql
-- ✅ CORRECT - Properly secured function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public  -- Prevents search_path hijacking
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

---

## 🚨 Input Validation

### Required Checks
- [ ] **Validate all user inputs** for type, format, and range
- [ ] **Set maximum lengths** for string fields (prevent DoS)
- [ ] **Validate numeric ranges** (ratings 0-10, years 1900-current, etc.)
- [ ] **Sanitize file uploads** and check MIME types
- [ ] **Validate JSON structures** before parsing
- [ ] **Use TypeScript types** for compile-time validation
- [ ] **Reject invalid inputs early** with clear error messages

### Validation Example
```typescript
// ✅ CORRECT - Comprehensive validation
const minRating = typeof body.minRating === 'number' && 
                  body.minRating >= 0 && 
                  body.minRating <= 10 ? 
                  body.minRating : 0;

const yearRange = Array.isArray(body.yearRange) && 
                  body.yearRange.length === 2 && 
                  typeof body.yearRange[0] === 'number' && 
                  typeof body.yearRange[1] === 'number' ? 
                  body.yearRange : [2025, 2025];
```

---

## 🌐 API Security

### Required Checks
- [ ] **Implement rate limiting** for API endpoints (use Supabase built-in or custom)
- [ ] **Use CORS headers appropriately** (whitelist specific origins in production)
- [ ] **Handle OPTIONS preflight requests** for CORS
- [ ] **Implement request timeouts** to prevent hanging requests
- [ ] **Use exponential backoff** for retries with external APIs
- [ ] **Log all API calls** with timestamps, user IDs, and IP addresses
- [ ] **Monitor for suspicious patterns** (multiple failed logins, IP address changes)

---

## 📊 Logging & Monitoring

### Required Checks
- [ ] **Log all security events** (login, logout, permission changes)
- [ ] **Log admin operations** with user ID, timestamp, and action details
- [ ] **Include IP addresses** in security logs
- [ ] **Use `[INTERNAL]` prefix** for logs not meant for clients
- [ ] **Monitor logs regularly** for suspicious activity
- [ ] **Set up alerts** for critical security events
- [ ] **Retain logs** for at least 90 days

### What to Log
- ✅ Authentication attempts (success and failure)
- ✅ Authorization checks (granted and denied)
- ✅ Admin operations (CRUD on sensitive data)
- ✅ API calls to external services
- ✅ Database errors
- ✅ Cron job executions
- ❌ Do NOT log passwords, tokens, or sensitive user data

---

## 🧪 Testing Security

### Required Tests
- [ ] **Test RLS policies** by attempting unauthorized access
- [ ] **Verify admin operations reject non-admin users**
- [ ] **Test edge function authentication** with invalid tokens
- [ ] **Verify webhook secret validation** for cron jobs
- [ ] **Test input validation** with edge cases and malicious inputs
- [ ] **Verify error messages are generic** (no information leakage)
- [ ] **Test rate limiting** by making excessive requests

### Example Test Cases
```typescript
// Test: Non-admin cannot delete movies
test('Non-admin user cannot delete movies', async () => {
  const response = await supabase.functions.invoke('delete-movie', {
    body: { movieId: 'test-id' }
  });
  expect(response.error?.message).toBe('Insufficient permissions');
});

// Test: Missing webhook secret is rejected
test('Cron job without secret is rejected', async () => {
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
    // Missing x-cron-secret header
  });
  expect(response.status).toBe(401);
});
```

---

## 🚀 Deployment Security

### Pre-Deployment Checklist
- [ ] **Run Supabase linter** to check for security issues
- [ ] **Review all RLS policies** for correctness
- [ ] **Verify all secrets are configured** in production
- [ ] **Test authentication flows** end-to-end
- [ ] **Verify DevMode is disabled** in production builds
- [ ] **Check edge function logs** for errors or warnings
- [ ] **Review database migrations** for security implications
- [ ] **Update this checklist** if new security requirements are added

---

## 🆘 Security Incident Response

### If You Discover a Security Vulnerability

1. **DO NOT commit the vulnerability** if it's not already in production
2. **Document the vulnerability** with reproduction steps
3. **Assess the severity**: Critical, High, Medium, Low, Info
4. **Create a fix** following this checklist
5. **Test the fix thoroughly** with security tests
6. **Deploy immediately** if it's a critical vulnerability
7. **Update this checklist** with lessons learned

### Severity Definitions
- **Critical**: Service role key exposed, authentication bypass, privilege escalation
- **High**: Data exposure, insecure direct object reference, missing RLS
- **Medium**: Information disclosure, verbose error messages
- **Low**: Minor configuration issues, missing logging
- **Info**: Best practice recommendations, no immediate risk

---

## 📚 Additional Resources

- [Lovable Security Documentation](https://docs.lovable.dev/features/security)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

## 📝 Review Sign-Off

Before merging code changes, confirm:

- [ ] I have reviewed this checklist and verified all applicable items
- [ ] I have tested authentication and authorization flows
- [ ] I have verified RLS policies protect user data
- [ ] I have checked error messages are generic
- [ ] I have run the Supabase linter and addressed all issues
- [ ] I have added appropriate logging for security events

**Reviewer Name:** _____________________  
**Date:** _____________________  
**Security Risk Level:** ☐ Low  ☐ Medium  ☐ High  ☐ Critical

---

*Last Updated: 2025-11-08*  
*Version: 1.0*
