import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { rateLimit, getClientIdentifier, createRateLimitHeaders } from '@/lib/rate-limit'

// We need dynamic for query params
export const dynamic = 'force-dynamic';

// Create Supabase client with validated environment variables
const supabase = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey
)

// Whitelist of allowed fields to prevent SQL injection
const ALLOWED_FIELDS = [
  'price_usd',
  'price_hex',
  'price_pls',
  'market_cap',
  'volume',
  'liquidity',
  'fdv'
] as const;

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(identifier, {
    limit: 60,
    windowSeconds: 60,
  });

  // If rate limit exceeded, return 429 Too Many Requests
  if (!rateLimitResult.success) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...createRateLimitHeaders(rateLimitResult),
          'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  const field = searchParams.get('field')

  if (!symbol || !field) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  // Validate field parameter against whitelist to prevent SQL injection
  if (!ALLOWED_FIELDS.includes(field as any)) {
    return NextResponse.json({ error: 'Invalid field parameter' }, { status: 400 })
  }

  try {
    
    // Fetch all data for this token, matching the original query
    // Field is now validated against whitelist
    const { data: rows, error } = await supabase
      .from('historic_prices')
      .select(`date, ${field}`)
      .not(field, 'is', null)
      .order('date', { ascending: true })

    if (error) {
      throw error
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: null })
    }

    // Parse dates and prices exactly as before
    const parsed = rows.map((row: any) => ({
      date: new Date(row.date),
      price: parseFloat(row[field]),
    })).filter((row: any) => !isNaN(row.price))

    if (parsed.length === 0) {
      return NextResponse.json({ data: null })
    }

    // Return response with caching and rate limit headers
    return new NextResponse(JSON.stringify({ data: rows }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate',
        ...createRateLimitHeaders(rateLimitResult),
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 