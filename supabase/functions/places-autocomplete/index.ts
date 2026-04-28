// =========================================================
// All4You Service München
// Supabase Edge Function: places-autocomplete
// Liefert Google Places Adressvorschläge für den Roller-Assistenten
// DBG: ALL4YOU-ROUTER-V5.4.0-GOOGLE-ADDRESS-ROUTE
// =========================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405);
  }

  try {
    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!googleApiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY fehlt als Supabase Secret.");
    }

    const body = await req.json().catch(() => null);
    const input = cleanText(body?.input);
    const sessionToken = cleanText(body?.sessionToken);

    if (input.length < 3) {
      return jsonResponse({ success: true, suggestions: [] });
    }

    const autocompleteResponse = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": [
          "suggestions.placePrediction.placeId",
          "suggestions.placePrediction.text",
          "suggestions.placePrediction.structuredFormat",
        ].join(","),
      },
      body: JSON.stringify({
        input,
        sessionToken: sessionToken || undefined,
        languageCode: "de",
        regionCode: "de",
        includedRegionCodes: ["de"],
        includeQueryPredictions: false,
        locationBias: {
          circle: {
            center: {
              latitude: 48.137154,
              longitude: 11.576124,
            },
            radius: 80000,
          },
        },
      }),
    });

    const data = await autocompleteResponse.json().catch(() => null);

    if (!autocompleteResponse.ok) {
      throw new Error(data?.error?.message || "Google Places Autocomplete konnte nicht geladen werden.");
    }

    const suggestions = Array.isArray(data?.suggestions)
      ? data.suggestions
          .map((item: Record<string, unknown>) => {
            const prediction = item?.placePrediction as Record<string, unknown> | undefined;
            if (!prediction) return null;

            const structured = prediction.structuredFormat as Record<string, unknown> | undefined;
            const mainTextObj = structured?.mainText as Record<string, unknown> | undefined;
            const secondaryTextObj = structured?.secondaryText as Record<string, unknown> | undefined;
            const textObj = prediction.text as Record<string, unknown> | undefined;

            const placeId = cleanText(prediction.placeId);
            const text = cleanText(textObj?.text);
            const mainText = cleanText(mainTextObj?.text) || text;
            const secondaryText = cleanText(secondaryTextObj?.text);

            if (!placeId || !text) return null;

            return {
              placeId,
              text,
              address: text,
              mainText,
              secondaryText,
            };
          })
          .filter(Boolean)
      : [];

    return jsonResponse({
      success: true,
      provider: "Google Places API",
      suggestions,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error instanceof Error ? error.message : "Adressvorschläge konnten nicht geladen werden.",
    }, 400);
  }
});
