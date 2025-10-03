import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// We need dynamic for query params
export const dynamic = 'force-dynamic';

// Only create Supabase client if environment variables are available
let supabase: any = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  const field = searchParams.get('field')

  if (!symbol || !field) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  // Check if Supabase is available
  if (!supabase) {
    return NextResponse.json({ data: null })
  }

  try {
    
    // Fetch all data for this token, matching the original query
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

    // Return response with caching headers
    return new NextResponse(JSON.stringify({ data: rows }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 