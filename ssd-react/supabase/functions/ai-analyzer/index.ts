// SSD AI Analyzer - Supabase Edge Function
// This function analyzes new events using Groq AI API
// and creates alerts for anomalies

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Analysis prompt for the AI
const ANALYSIS_PROMPT = `You are a construction site AI analyst. Analyze the following database event and determine if it's suspicious or anomalous.

Context: SSD Construction is a building company in Sri Lanka with workers, materials, projects, attendance, and finance management.

Analyze this event:
- Table: {table_name}
- Action: {action}
- New Data: {new_data}
- Old Data: {old_data}

Respond ONLY with valid JSON (no markdown, no explanation):
{{
  "severity": "low|medium|high|critical",
  "category": "attendance|finance|materials|safety|workers|general",
  "title": "Brief title (max 50 chars)",
  "message": "What happened (max 200 chars)",
  "recommendation": "What should be done (max 150 chars)"
}}

Normal examples:
- Normal attendance marking
- Regular material usage
- Approved payment
- Standard daily report

Suspicious examples to flag:
- Attendance marked for future dates
- Unusually high material usage
- Payment to new/unknown worker
- Multiple late attendance marks
- Worker added but no attendance`;

Deno.serve(async (req) => {
  try {
    // Get unprocessed events (events without alerts)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://eafcokgnyvkznjftupwg.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Fetch recent unprocessed events
    const eventsResponse = await fetch(
      `${supabaseUrl}/rest/v1/ai_events?select=*&order=created_at.desc&limit=10`,
      {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const events = await eventsResponse.json();

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: 'No events to process' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    // Process each event
    for (const event of events) {
      // Skip if already processed (no alert needed)
      // Check if this event has been analyzed recently
      const alertCheck = await fetch(
        `${supabaseUrl}/rest/v1/ai_alerts?event_id=eq.${event.id}&select=id`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      const existingAlerts = await alertCheck.json();
      if (existingAlerts && existingAlerts.length > 0) {
        continue;
      }

      // Build the prompt
      const prompt = ANALYSIS_PROMPT
        .replace('{table_name}', event.table_name || 'unknown')
        .replace('{action}', event.action || 'unknown')
        .replace('{new_data}', JSON.stringify(event.new_data || {}))
        .replace('{old_data}', JSON.stringify(event.old_data || {}));

      // Call Groq API
      const groqResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a construction site AI analyst.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      const groqData = await groqResponse.json();

      // Parse the AI response
      let analysis = {
        severity: 'low',
        category: 'general',
        title: 'Event logged',
        message: 'Event recorded',
        recommendation: 'No action needed'
      };

      try {
        const content = groqData.choices?.[0]?.message?.content || '';
        // Clean up the response (remove markdown if present)
        const cleanContent = content.replace(/```json|```/g, '').trim();
        analysis = JSON.parse(cleanContent);
      } catch (e) {
        console.log('Failed to parse AI response:', e);
      }

      // Only create alert if severity is medium or higher
      if (['medium', 'high', 'critical'].includes(analysis.severity)) {
        // Insert alert
        const insertResponse = await fetch(
          `${supabaseUrl}/rest/v1/ai_alerts`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              event_id: event.id,
              table_name: event.table_name,
              record_id: event.record_id,
              severity: analysis.severity,
              category: analysis.category,
              title: analysis.title.substring(0, 100),
              message: analysis.message.substring(0, 500),
              recommendation: analysis.recommendation?.substring(0, 300) || null,
            }),
          }
        );

        if (insertResponse.ok) {
          results.push({ event_id: event.id, alert: 'created', severity: analysis.severity });
        }
      }
    }

    return new Response(JSON.stringify({
      processed: results.length,
      alerts: results
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Analyzer Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
