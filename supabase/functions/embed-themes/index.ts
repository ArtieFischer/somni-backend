import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pipeline, env } from "https://esm.sh/@xenova/transformers@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Configure xenova/transformers
env.allowRemoteModels = true;
env.cacheDir = "/tmp";

// Initialize the embedding model
let extractor: any = null;

async function initializeModel() {
  if (!extractor) {
    console.log("Loading MiniLM model...");
    extractor = await pipeline(
      "feature-extraction", 
      "Xenova/all-MiniLM-L6-v2"
    );
    console.log("Model loaded successfully");
  }
  return extractor;
}

serve(async (req) => {
  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Parse request body
    const { themes } = await req.json();

    if (!themes || !Array.isArray(themes)) {
      return new Response(
        JSON.stringify({ error: "themes array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize model
    const model = await initializeModel();

    // Process each theme
    const results = [];
    for (const theme of themes) {
      if (!theme.code || !theme.label) {
        console.warn("Skipping theme without code or label:", theme);
        continue;
      }

      // Generate embedding from theme label and description
      const textToEmbed = theme.description 
        ? `${theme.label}. ${theme.description}`
        : theme.label;
      
      const output = await model(textToEmbed, { pooling: "mean", normalize: true });
      const embedding = Array.from(output.data);

      // Upsert theme with embedding
      const { error } = await supabase
        .from("themes")
        .upsert({
          code: theme.code,
          label: theme.label,
          description: theme.description || null,
          embedding
        }, { onConflict: "code" });

      if (error) {
        console.error(`Failed to upsert theme ${theme.code}:`, error);
        results.push({ code: theme.code, success: false, error: error.message });
      } else {
        results.push({ code: theme.code, success: true });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});