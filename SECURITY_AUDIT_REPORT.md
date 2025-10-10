### 8. Supabase Anonymous Key Exposure

**File:** `app/api/prices/historic/route.ts:13`
**Severity:** LOW
**Issue:** `SUPABASE_ANON_KEY` is used on server-side route.

**Note:** This is acceptable if:

- RLS (Row Level Security) policies are properly configured in Supabase
- The key only grants read access to public data
- Should verify RLS policies are enabled in Supabase dashboard