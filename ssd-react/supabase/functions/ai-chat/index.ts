// SSD AI Chat Assistant - Supabase Edge Function
// This function handles chat interactions using Groq AI API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            throw new Error('Messages are required');
        }

        // Call Groq API
        const groqResponse = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages: messages.map(m => ({
                    role: m.role === 'ai' ? 'assistant' : m.role,
                    content: m.content
                })),
                temperature: 0.7,
                max_tokens: 1000,
            }),
        });

        const groqData = await groqResponse.json();
        const reply = groqData.choices?.[0]?.message?.content || "I couldn't process that. Please try again.";

        return new Response(JSON.stringify({ reply }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('AI Chat Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
