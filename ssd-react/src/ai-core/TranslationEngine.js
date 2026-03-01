// ============================================
// TRANSLATION ENGINE
// Uses Groq API for English ↔ Sinhala translation
// ============================================

class TranslationEngine {
  constructor() {
    this.groqKey = null;
  }

  getApiKey() {
    if (!this.groqKey) {
      this.groqKey = import.meta.env.VITE_GROQ_API_KEY;
    }
    return this.groqKey;
  }

  async translateToEnglish(sinhalaInput) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.warn('No Groq API key - returning original text');
      return sinhalaInput;
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a translator. Translate Sinhala or Singlish text to English. 
Rules:
- Keep numbers unchanged
- Keep currency (LKR, Rs) unchanged  
- Keep dates unchanged
- Keep proper nouns (names, places) unchanged
- Keep technical terms unchanged
- Output ONLY the translation, nothing else.`
            },
            {
              role: 'user',
              content: sinhalaInput
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Translation API error');
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Translation error:', error);
      return sinhalaInput; // Return original on error
    }
  }

  async translateToSinhala(englishInput, isGreeting = false) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.warn('No Groq API key - returning original text');
      return englishInput;
    }

    try {
      const systemPrompt = isGreeting 
        ? `You are a Sinhala translator. Translate to natural, conversational Sri Lankan Sinhala.
Rules:
- Use native Sinhala script (අ-�.hl)
- Keep greeting words in Sinhala like හොඳයි, ඔයාට, කොහොමද
- DO NOT use transliterated English like "oya", "kohomada" - use pure Sinhala
- Keep names and technical terms in original form
- Output ONLY the translation, nothing else.`
        : `You are a translator. Translate English to natural native Sinhala.
Rules:
- Keep numbers unchanged (123, 456)
- Keep currency LKR, Rs unchanged  
- Keep dates unchanged
- Keep project names, worker names, place names unchanged
- Keep technical terms unchanged
- Translate to pure Sinhala script (අ-�.hl)
- DO NOT transliterate English words to Singlish
- Output ONLY the translation, nothing else.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: englishInput
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error('Translation API error');
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Translation error:', error);
      return englishInput; // Return original on error
    }
  }
}

export const translationEngine = new TranslationEngine();
export default TranslationEngine;
