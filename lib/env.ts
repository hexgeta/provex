/**
 * Environment Variable Validation
 * Validates required environment variables at application startup
 * Note: Only validates server-side variables on the server
 */

// Server-side only variables (only validate on server)
const serverEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
] as const;

// Client-side variables (prefixed with NEXT_PUBLIC_)
const clientEnvVars = [
  "NEXT_PUBLIC_PROJECT_ID",
] as const;

// Only validate server variables on the server side
if (typeof window === 'undefined') {
  // Server-side validation
  for (const envVar of serverEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(
        `❌ Missing required environment variable: ${envVar}\n` +
        `Please add it to your .env.local file.`
      );
    }
  }
  
  // Also validate client vars on server
  for (const envVar of clientEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(
        `❌ Missing required environment variable: ${envVar}\n` +
        `Please add it to your .env.local file.`
      );
    }
  }
}

// Export validated environment variables with type safety
// On client side, NEXT_PUBLIC_ vars will be available at runtime
export const env = {
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
} as const;

// Export type for use in other files
export type Env = typeof env;

