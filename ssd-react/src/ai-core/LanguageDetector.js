// ============================================
// LANGUAGE DETECTOR
// Auto-detect English, Sinhala, or Singlish
// ============================================

class LanguageDetector {
  constructor() {
    this.sinhalaUnicodeRange = /[\u0D80-\u0DFF]/;
    
    this.singlishKeywords = [
      // Pronouns
      'oya', 'oyaa', 'oy', 'mama', 'mam', 'amma', 'akka', 'thaththa', 'appa',
      // Question words
      'kohomada', 'kohom', 'kiyada', 'kiy', 'makan', 'wada', 'eka', 'ekata', 'kara', 'kawda',
      // Common words
      'hodge', 'dawasa', 'prashna', 'awashya', 'hodata', 'naha', 'horu', 'huru',
      // Actions
      'elaw', 'yanna', 'kanna', 'denna', 'menna', 'wela', 'ganna', 'karan', 'kare',
      // Time
      'ewela', 'pavachena', 'aane', 'hinda', 'kal',
      // Response
      'ow', 'oya', 'hba', 'n', 'yes', 'no',
      // Other common
      'thiyenawa', 'ne', 'hdn', 'hdna', 'puluwan', 'pawula', 'gaman'
    ];

    this.sinhaleseMap = {
      // Common Sinhala words
      'කොහොමද': 'how',
      'කියයි': 'what',
      'කවි': 'who',
      'කාට': 'when',
      'කොයිතැනකට': 'where',
      'කියැද': 'how much',
      'ඔව්': 'yes',
      'නැ': 'no',
      'හොඳයි': 'good',
      'නැහැ': 'bad',
      'අද': 'today',
      'කුමක් කියයි': 'what',
      'මොකක් ද': 'what',
      'වැඩ': 'work',
      'මුදල්': 'money',
      'ව්‍යාපෘතිය': 'project',
      'කම්කරු': 'worker',
      'ඉඩම': 'land'
    };
  }

  detect(input) {
    if (!input || input.trim() === '') {
      return { language: 'en', confidence: 0 };
    }

    const normalized = input.trim();
    
    // Check for Sinhala Unicode
    const hasSinhalaScript = this.sinhalaUnicodeRange.test(normalized);
    
    // Check for Sinhala mapping matches
    let sinhalaWordMatches = 0;
    for (const [sinhala] of Object.entries(this.sinhaleseMap)) {
      if (normalized.includes(sinhala)) {
        sinhalaWordMatches++;
      }
    }

    // Check for Singlish keywords
    const lowerInput = normalized.toLowerCase();
    let singlishMatches = 0;
    for (const keyword of this.singlishKeywords) {
      if (lowerInput.includes(keyword)) {
        singlishMatches++;
      }
    }

    // Decision logic
    if (hasSinhalaScript || sinhalaWordMatches >= 2) {
      return { 
        language: 'sl', 
        confidence: hasSinhalaScript ? 0.95 : 0.7,
        type: 'sinhala'
      };
    }
    
    if (singlishMatches >= 2) {
      return { 
        language: 'sl', 
        confidence: 0.8,
        type: 'singlish'
      };
    }

    // Check for mixed (English + Singlish)
    if (singlishMatches === 1 && /[a-zA-Z]/.test(normalized)) {
      return { 
        language: 'sl', 
        confidence: 0.6,
        type: 'mixed'
      };
    }

    return { 
      language: 'en', 
      confidence: 0.9,
      type: 'english'
    };
  }

  isSriLankan(input) {
    const detection = this.detect(input);
    return detection.language === 'sl';
  }
}

export const languageDetector = new LanguageDetector();
export default LanguageDetector;
