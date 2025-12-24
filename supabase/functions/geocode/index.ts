// Geocoding edge function using Mapbox Geocoding API
// Returns { lat, lng, place_name } for a given query string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

// Server-side input sanitization for search queries
function sanitizeSearchQuery(query: string, maxLength: number = 500): string {
  if (!query || typeof query !== 'string') return '';
  return query
    .replace(/[<>"'`]/g, '') // Remove potentially dangerous characters
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, maxLength)
    .trim();
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({ query: null }));
    const rawQuery = body.query;

    // Validate input type
    if (!rawQuery || typeof rawQuery !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid or missing "query"' }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    
    // Sanitize the query
    const query = sanitizeSearchQuery(rawQuery);
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is empty after sanitization' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const token = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    if (!token) {
      return new Response(JSON.stringify({ error: 'MAPBOX_PUBLIC_TOKEN not configured' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1`;

    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: 'Geocoding failed', details: text }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    const data = await resp.json();
    const feature = data?.features?.[0];

    if (!feature?.center || feature.center.length < 2) {
      return new Response(JSON.stringify({ error: 'No results found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const [lng, lat] = feature.center;
    const payload = { lat, lng, place_name: feature.place_name };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
