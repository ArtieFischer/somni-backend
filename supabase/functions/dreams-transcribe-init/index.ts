import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranscribeRequest {
  dreamId: string;
  audioBase64: string;
  duration: number;
  language?: string;
}

serve(async (req) => {
  console.log('Function called:', req.method, req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    // Get auth token from header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Authenticated user:', user.id);

    // Parse request body
    const body = await req.json();
    const { dreamId, audioBase64, duration, language }: TranscribeRequest = body;
    
    console.log('Request data:', { 
      dreamId, 
      audioSize: audioBase64?.length || 0,
      duration,
      language 
    });

    // Validate required fields
    if (!dreamId || !audioBase64 || !duration) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify dream ownership and update status
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .update({ 
        transcription_status: 'processing',
        duration: duration
      })
      .eq('id', dreamId)
      .eq('user_id', user.id)
      .select('id, raw_transcript')
      .single()

    if (dreamError) {
      console.error('Dream update error:', dreamError);
      return new Response(
        JSON.stringify({ error: 'Dream not found or unauthorized' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Dream found and updated:', dream.id);

    // REAL BACKEND INTEGRATION:
    try {
      const backendUrl = `${Deno.env.get('SOMNI_BACKEND_URL')}/api/v1/transcription/transcribe`;
      const backendPayload = {
        dreamId,
        audioBase64,
        duration,
        options: {
          languageCode: language || null,
          tagAudioEvents: true,
          diarize: false,
        },
      };

      console.log('📤 Calling Somni Backend for transcription:', {
        url: backendUrl,
        dreamId,
        duration,
        language: language || 'auto-detect',
        audioSize: audioBase64.length,
        hasApiSecret: !!Deno.env.get('SOMNI_BACKEND_API_SECRET'),
        hasBackendUrl: !!Deno.env.get('SOMNI_BACKEND_URL')
      });
      
      console.log('📦 Backend request payload:', {
        dreamId: backendPayload.dreamId,
        audioSize: backendPayload.audioBase64.length,
        duration: backendPayload.duration,
        options: backendPayload.options
      });
      
      const backendResponse = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Secret': Deno.env.get('SOMNI_BACKEND_API_SECRET')!,
          'X-Supabase-Token': authHeader.replace('Bearer ', ''),
        },
        body: JSON.stringify(backendPayload),
      });

      console.log('📥 Backend response received:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: Object.fromEntries(backendResponse.headers.entries())
      });

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error('❌ Backend transcription failed:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText,
          dreamId,
        });
        
        // Update dream with error status
        await supabase
          .from('dreams')
          .update({
            transcription_status: 'failed',
            transcription_metadata: {
              error: `Backend error: ${backendResponse.status}`,
              failed_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', dreamId)
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ error: 'Transcription service unavailable' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const transcriptionResult = await backendResponse.json();
      console.log('📥 Backend response data:', {
        success: transcriptionResult.success,
        hasTranscription: !!transcriptionResult.transcription,
        textLength: transcriptionResult.transcription?.text?.length,
        error: transcriptionResult.error
      });
      
      if (!transcriptionResult.success) {
        console.error('❌ Backend returned error:', {
          error: transcriptionResult.error,
          fullResponse: transcriptionResult
        });
        return new Response(
          JSON.stringify({ error: transcriptionResult.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Transcription completed successfully:', {
        dreamId,
        textLength: transcriptionResult.transcription?.text?.length,
        wordCount: transcriptionResult.transcription?.wordCount,
        language: transcriptionResult.transcription?.languageCode,
      });

      // Save transcription to database
      console.log('💾 Saving transcription to database...', {
        dreamId,
        userId: user.id,
        transcriptLength: transcriptionResult.transcription.text?.length
      });

      const { error: saveError } = await supabase
        .from('dreams')
        .update({
          raw_transcript: transcriptionResult.transcription.text,
          transcription_status: 'completed',
          transcription_metadata: {
            characterCount: transcriptionResult.transcription.characterCount,
            wordCount: transcriptionResult.transcription.wordCount,
            language: transcriptionResult.transcription.languageCode || null,
            completed_at: new Date().toISOString(),
            backend_response: transcriptionResult.transcription,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', dreamId)
        .eq('user_id', user.id);

      if (saveError) {
        console.error('❌ Failed to save transcription to database:', {
          error: saveError,
          dreamId,
          userId: user.id
        });
        return new Response(
          JSON.stringify({ error: 'Failed to save transcription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Dream updated with transcription:', {
        dreamId,
        status: 'completed'
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          dreamId,
          transcription: transcriptionResult.transcription 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('❌ Unexpected transcription error:', {
        error: error.message || error,
        stack: error.stack,
        dreamId,
        type: error.constructor.name
      });
      
      await supabase
        .from('dreams')
        .update({
          transcription_status: 'failed',
          transcription_metadata: {
            error: error.message || 'Unexpected error during transcription',
            errorType: error.constructor.name,
            failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', dreamId)
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ error: 'Internal server error during transcription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})