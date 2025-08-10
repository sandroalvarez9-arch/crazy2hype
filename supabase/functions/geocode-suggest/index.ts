import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing MAPBOX_PUBLIC_TOKEN" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
    url.searchParams.set("limit", "5");
    url.searchParams.set("types", "place,postcode,locality,region,address,poi");
    url.searchParams.set("access_token", token);

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Mapbox error", resp.status, text);
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const payload = await resp.json();
    const suggestions = Array.isArray(payload.features)
      ? payload.features.map((f: any) => ({
          id: String(f.id),
          place_name: String(f.place_name || f.text || ""),
          lat: Array.isArray(f.center) ? Number(f.center[1]) : NaN,
          lng: Array.isArray(f.center) ? Number(f.center[0]) : NaN,
        }))
      : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Unexpected error in geocode-suggest:", e);
    return new Response(JSON.stringify({ suggestions: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
