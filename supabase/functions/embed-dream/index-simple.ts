import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

    // For now, just update the dream without embedding
    // We'll implement embedding differently
    const { error: dreamError } = await supabase
      .from("dreams")
      .update({ 
        raw_transcript: transcript,
        updated_at: new Date().toISOString()
      })
      .eq("id", dream_id);

    if (dreamError) {
      throw new Error(`Failed to update dream: ${dreamError.message}`);
    }

    // TODO: Implement embedding generation using a different approach
    // Options:
    // 1. Use OpenAI API for embeddings
    // 2. Call your backend API to generate embeddings
    // 3. Use a simpler embedding approach

    return new Response(
      JSON.stringify({
        success: true,
        dream_id,
        message: "Dream updated successfully. Embedding generation pending implementation."
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