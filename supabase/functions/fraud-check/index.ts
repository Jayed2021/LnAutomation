import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, apiKey, baseUrl, phoneNumber } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ status: false, message: "API key is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = {
      "Content-Type": "application/json",
      "api_key": apiKey,
    };

    if (action === "test-connection") {
      const url = `${baseUrl}/check-api-connection`;
      const res = await fetch(url, { method: "POST", headers });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check-courier-info") {
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ status: false, message: "phone_number is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const url = `${baseUrl}/check-courier-info`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ status: false, message: "Unknown action." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: false, message: "Internal error.", error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
