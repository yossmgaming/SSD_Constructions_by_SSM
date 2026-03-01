// ============================================
// INTENT CLASSIFIER
// Lightweight classification before routing to business AI
// ============================================

class IntentClassifier {
  constructor() {
    this.groqKey = null;
    this.intents = [
      'greeting',
      'casual_chat', 
      'business_query',
      'operational_query',
      'diagnostic',
      'simulation',
      'unknown'
    ];
  }

  getApiKey() {
    if (!this.groqKey) {
      this.groqKey = import.meta.env.VITE_OPENROUTER_FREE_API_KEY;
    }
    return this.groqKey;
  }

  async classify(input) {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      return this.classifyByKeywords(input);
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ssdconstructions.com',
          'X-Title': 'SSD Constructions'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'system',
              content: `Classify this input into ONE of these categories only:
- greeting: saying hi, hello, howdy, namaste
- casual_chat: small talk, general conversation, opinions
- business_query: asking about projects, finances, workers, metrics, status
- operational_query: daily operations, attendance, tasks, schedules
- diagnostic: asking why, root cause, problems, issues
- simulation: what-if, hypothetical scenarios

Rules:
- Only respond with ONE word - the category name
- No explanations, no punctuation, just the word
- Examples:
  "hi" → greeting
  "kohomada" → greeting
  "how are you" → greeting
  "how's it going" → greeting
  "what's up" → greeting
  "tell me about weather" → casual_chat
  "cash balance" → business_query
  "project status" → business_query
  "how many workers" → operational_query
  "who came today" → operational_query
  "why is project late" → diagnostic
  "what if we hire" → simulation`
            },
            {
              role: 'user',
              content: input
            }
          ],
          temperature: 0.1,
          max_tokens: 10
        })
      });

      if (!response.ok) {
        throw new Error('Classification API error');
      }

      const data = await response.json();
      const classification = data.choices[0].message.content.trim().toLowerCase();
      
      // Validate it's a known intent
      if (this.intents.includes(classification)) {
        return {
          intent: classification,
          confidence: 0.9,
          source: 'groq'
        };
      }
      
      // Fallback if unknown response
      return this.classifyByKeywords(input);
      
    } catch (error) {
      console.warn('Intent classification failed:', error);
      // Fallback to keyword-based
      return this.classifyByKeywords(input);
    }
  }

  classifyByKeywords(input) {
    const lower = input.toLowerCase().trim();
    
    // Greeting patterns
    const greetingPatterns = [
      'hi', 'hello', 'hey', 'namaste', 'assalamu alaikum',
      'kohomada', 'kohom', 'oyaa', 'morning', 'evening',
      'how are', "how's", 'what up', 'wassup', 'good morning',
      'good evening', 'good night', 'greetings', 'sltd'
    ];
    
    // Casual chat patterns
    const casualPatterns = [
      'tell me about', 'what do you think', 'opinion',
      'weather', 'news', 'weekend', 'holiday', '休息'
    ];
    
    // Business query patterns
    const businessPatterns = [
      'cash', 'money', 'balance', 'income', 'expense',
      'project', 'budget', 'cost', 'revenue', 'profit',
      'financial', 'payment', 'invoice', ' quotation'
    ];
    
    // Operational patterns
    const operationalPatterns = [
      'attendance', 'present', 'absent', 'leave',
      'worker', 'staff', 'team', 'shift', 'schedule',
      'material', 'request', 'daily report'
    ];
    
    // Diagnostic patterns
    const diagnosticPatterns = [
      'why', 'reason', 'cause', 'problem', 'issue',
      'delayed', 'late', 'overdue', 'failed', 'error'
    ];
    
    // Simulation patterns
    const simulationPatterns = [
      'what if', 'if we', 'suppose', 'assume',
      'hypothetical', 'could we', 'should we', 'forecast'
    ];

    // Check greeting first
    for (const pattern of greetingPatterns) {
      if (lower.includes(pattern)) {
        return { intent: 'greeting', confidence: 0.8, source: 'keyword' };
      }
    }

    // Check simulation
    for (const pattern of simulationPatterns) {
      if (lower.includes(pattern)) {
        return { intent: 'simulation', confidence: 0.9, source: 'keyword' };
      }
    }

    // Check diagnostic
    for (const pattern of diagnosticPatterns) {
      if (lower.includes(pattern)) {
        return { intent: 'diagnostic', confidence: 0.8, source: 'keyword' };
      }
    }

    // Check business
    for (const pattern of businessPatterns) {
      if (lower.includes(pattern)) {
        return { intent: 'business_query', confidence: 0.7, source: 'keyword' };
      }
    }

    // Check operational
    for (const pattern of operationalPatterns) {
      if (lower.includes(pattern)) {
        return { intent: 'operational_query', confidence: 0.7, source: 'keyword' };
      }
    }

    // Check casual
    for (const pattern of casualPatterns) {
      if (lower.includes(pattern)) {
        return { intent: 'casual_chat', confidence: 0.6, source: 'keyword' };
      }
    }

    // Default to business_query for unknown (safer)
    return { intent: 'business_query', confidence: 0.5, source: 'keyword' };
  }

  isConversational(intent) {
    return ['greeting', 'casual_chat'].includes(intent);
  }

  isBusiness(intent) {
    return ['business_query', 'operational_query', 'diagnostic', 'simulation'].includes(intent);
  }
}

export const intentClassifier = new IntentClassifier();
export default IntentClassifier;
