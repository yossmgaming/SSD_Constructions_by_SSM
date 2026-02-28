-- ============================================
-- SUPABASE EDGE FUNCTION DEPLOYMENT INSTRUCTIONS
-- ============================================

-- Step 1: Set the Groq API Key as a Supabase secret
-- Run this in your terminal:

/*
supabase secrets set GROQ_API_KEY=YOUR_GROQ_API_KEY
*/

-- Step 2: Deploy the Edge Function
-- Run this in your terminal:

/*
supabase functions deploy ai-analyzer
*/

-- Step 3: Test the function
-- You can test it by calling the function or by creating a database webhook

-- ============================================
-- ALTERNATIVE: Set up auto-trigger via Database Webhook
-- ============================================

-- Create a database webhook that calls the Edge Function
-- when new ai_events are inserted

/*
CREATE OR REPLACE FUNCTION notify_ai_analysis()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM net.http_post(
        'https://eafcokgnyvkznjftupwg.supabase.co/functions/v1/ai-analyzer',
        jsonb_build_object(
            'event_id', NEW.id,
            'table_name', NEW.table_name,
            'action', NEW.action
        )::text,
        'Content-Type', 'application/json'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to ai_events
CREATE TRIGGER ai_notify_analysis
AFTER INSERT ON ai_events
FOR EACH ROW
EXECUTE FUNCTION notify_ai_analysis();
*/

-- ============================================
-- MANUAL TRIGGER (for testing)
-- ============================================

-- Call the function manually:
/*
SELECT trigger_ai_analysis();
*/

-- Or via HTTP:
/*
curl -X POST "https://eafcokgnyvkznjftupwg.supabase.co/functions/v1/ai-analyzer" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
*/
