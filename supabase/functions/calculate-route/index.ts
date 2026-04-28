// =========================================================
// All4You Service München
// Supabase Edge Function: calculate-route
// Berechnet Distanz/Fahrzeit über Google Routes API
// DBG: ALL4YOU-ROUTER-V5.4.1-PLACES-RADIUS-FIX
// =========================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RoutePlace = {
  placeId?: string;
  address?: string;
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

function buildWaypoint(place: RoutePlace) {
  const placeId = cleanText(place?.placeId);
  const address = cleanText(place?.address);

  if (placeId) return { placeId };
  if (address) return { address };

  throw new Error("Adresse oder Place-ID fehlt.");
}

function parseGoogleDurationSeconds(value: unknown): number | null {
  const text = cleanText(value);
  const match = text.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return null;
  return Math.round(Number(match[1]));
}

function formatDistance(meters: number | null): string {
  if (!meters || !Number.isFinite(meters) || meters <= 0) return "nicht berechnet";
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "nicht berechnet";
  const minutes = Math.round(seconds / 60);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} Std. ${rest} Min.` : `${hours} Std.`;
  }

  return `${minutes} Min.`;
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
    const pickup = body?.pickup as RoutePlace | undefined;
    const dropoff = body?.dropoff as RoutePlace | undefined;

    if (!pickup || !dropoff) {
      throw new Error("Abholort oder Zielort fehlt.");
    }

    const routeResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: buildWaypoint(pickup),
        destination: buildWaypoint(dropoff),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        languageCode: "de-DE",
        units: "METRIC",
      }),
    });

    const data = await routeResponse.json().catch(() => null);

    if (!routeResponse.ok) {
      throw new Error(data?.error?.message || "Google Routes API konnte die Strecke nicht berechnen.");
    }

    const route = Array.isArray(data?.routes) ? data.routes[0] : null;
    if (!route) {
      throw new Error("Für diese Adressen wurde keine Route gefunden.");
    }

    const distanceMeters = Number(route.distanceMeters || 0);
    const durationSeconds = parseGoogleDurationSeconds(route.duration);

    return jsonResponse({
      success: true,
      provider: "Google Routes API",
      pickupAddress: cleanText(pickup.address),
      dropoffAddress: cleanText(dropoff.address),
      pickupPlaceId: cleanText(pickup.placeId),
      dropoffPlaceId: cleanText(dropoff.placeId),
      distanceMeters: Number.isFinite(distanceMeters) && distanceMeters > 0 ? Math.round(distanceMeters) : null,
      durationSeconds,
      distanceText: formatDistance(distanceMeters),
      durationText: formatDuration(durationSeconds),
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error instanceof Error ? error.message : "Strecke konnte nicht berechnet werden.",
    }, 400);
  }
});
