const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const rawQuery = body.query;

    // Validate input type
    if (!rawQuery || typeof rawQuery !== "string") {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Sanitize the query
    const query = sanitizeSearchQuery(rawQuery);
    if (query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      console.error("GOOGLE_MAPS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured", suggestions: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Google Places Autocomplete API - query is already sanitized
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", query);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("types", "geocode|establishment");
    
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: data.error_message || "API request failed", suggestions: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Google Places predictions to our format
    const suggestions = (data.predictions || []).map((prediction: any) => ({
      id: prediction.place_id,
      place_name: prediction.description,
      // Note: Google Places Autocomplete doesn't return coordinates directly
      // We'll need to do a separate Place Details call if we need exact coordinates
      lat: null,
      lng: null,
    }));

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in google-places-autocomplete:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
