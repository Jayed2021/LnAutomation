import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const batchSize = parseInt(url.searchParams.get("batch") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const dryRun = url.searchParams.get("dry_run") === "true";

    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, sku, image_url")
      .not("image_url", "is", null)
      .not("image_url", "like", "%supabase%")
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ message: "No more products to migrate", migrated: 0, offset }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: { id: string; sku: string; status: string; new_url?: string; error?: string }[] = [];

    for (const product of products) {
      if (!product.image_url) continue;

      try {
        const imgRes = await fetch(product.image_url, {
          headers: { "User-Agent": "Mozilla/5.0 ERP-Image-Migrator/1.0" },
        });

        if (!imgRes.ok) {
          results.push({ id: product.id, sku: product.sku, status: "skip", error: `HTTP ${imgRes.status}` });
          continue;
        }

        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : contentType.includes("gif") ? "gif" : contentType.includes("webp") ? "webp" : "jpg";

        const imageBuffer = await imgRes.arrayBuffer();

        if (!dryRun) {
          const filePath = `products/${product.sku}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(filePath, imageBuffer, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            results.push({ id: product.id, sku: product.sku, status: "error", error: uploadError.message });
            continue;
          }

          const { data: publicUrlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(filePath);

          const newUrl = publicUrlData.publicUrl;

          await supabase
            .from("products")
            .update({ image_url: newUrl })
            .eq("id", product.id);

          results.push({ id: product.id, sku: product.sku, status: "migrated", new_url: newUrl });
        } else {
          results.push({ id: product.id, sku: product.sku, status: "dry_run_ok" });
        }
      } catch (err) {
        results.push({ id: product.id, sku: product.sku, status: "error", error: String(err) });
      }
    }

    const migrated = results.filter((r) => r.status === "migrated" || r.status === "dry_run_ok").length;
    const errors = results.filter((r) => r.status === "error").length;
    const skipped = results.filter((r) => r.status === "skip").length;

    return new Response(
      JSON.stringify({
        batch_size: products.length,
        offset,
        next_offset: offset + batchSize,
        migrated,
        errors,
        skipped,
        dry_run: dryRun,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
