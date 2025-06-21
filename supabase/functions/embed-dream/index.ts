import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pipeline, env } from "https://esm.sh/@xenova/transformers@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Configure xenova/transformers
env.allowRemoteModels = true;   // Download models from HuggingFace
env.cacheDir = "/tmp";          // Cache models in /tmp

// Initialize the embedding model (all-MiniLM-L6-v2 for 384-dim vectors)
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
    const { dream_id, transcript, extract_themes = true } = await req.json();

    if (!dream_id || !transcript) {
      return new Response(
        JSON.stringify({ error: "dream_id and transcript are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize model if needed
    const model = await initializeModel();

    // Generate embedding from transcript
    const output = await model(transcript, { pooling: "mean", normalize: true });
    const embedding = Array.from(output.data); // Convert Float32Array to regular array

    // Update dream with embedding
    const { error: dreamError } = await supabase
      .from("dreams")
      .update({ embedding })
      .eq("id", dream_id);

    if (dreamError) {
      throw new Error(`Failed to update dream embedding: ${dreamError.message}`);
    }

    // Extract themes if requested
    let themes = [];
    if (extract_themes) {
      // Search for matching themes using cosine similarity
      const { data: matchedThemes, error: themeError } = await supabase
        .rpc("search_themes", {
          query_embedding: embedding,
          similarity_threshold: 0.15,
          max_results: 10
        });

      if (themeError) {
        console.error("Theme search error:", themeError);
      } else if (matchedThemes && matchedThemes.length > 0) {
        // Insert dream-theme associations
        const dreamThemes = matchedThemes.map((theme: any, index: number) => ({
          dream_id,
          theme_code: theme.code,
          rank: index + 1,
          score: theme.score
        }));

        const { error: insertError } = await supabase
          .from("dream_themes")
          .upsert(dreamThemes, { onConflict: "dream_id,theme_code" });

        if (insertError) {
          console.error("Failed to insert dream themes:", insertError);
        } else {
          themes = matchedThemes;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dream_id,
        embedding_size: embedding.length,
        themes_found: themes.length,
        themes
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