// ============================================
// REALITY VALIDATION ENGINE
// Extracts claims from user input and validates against live DB
// ============================================

import { supabase } from '../data/supabase';

class RealityValidationEngine {
  
  // Layered claim extraction
  async extractClaims(userInput) {
    const claims = [];
    const input = userInput.toLowerCase();
    
    // 1. Financial claims (LKR, numbers with currency)
    const financialPatterns = [
      /(?:lkr|rs|rs\.?)\s*([\d,]+(?:\.\d{2})?)(?:\s*(?:million|m|thousand|k))?/gi,
      /([\d,]+(?:\.\d{2})?)\s*(?:lkr|rs)/gi,
      /([\d]+(?:\.\d{2})?)\s*m(?:\s|$|[.,])/gi,
      /([\d]+(?:\.\d{2})?)\s*k(?:\s|$|[.,])/gi
    ];
    
    financialPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        let value = this.parseNumber(match[1]);
        if (input.includes('million') || input.includes(' m')) value *= 1000000;
        if (input.includes('thousand') || input.includes(' k')) value *= 1000;
        
        claims.push({
          type: 'financial',
          value: value,
          original: match[0],
          context: this.detectFinancialContext(input),
          confidence: 0.85
        });
      }
    });
    
    // 2. Count claims (workers, projects, etc)
    const countPatterns = [
      /(\d+)\s*(?:workers?|staff|employees?|labors?)/gi,
      /(\d+)\s*(?:projects?|sites?)/gi,
      /(\d+)\s*(?:supervisors?|managers?)/gi,
      /(\d+)\s*(?:teams?)/gi
    ];
    
    countPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        claims.push({
          type: 'count',
          value: parseInt(match[1]),
          original: match[0],
          context: this.detectCountContext(match[0]),
          confidence: 0.80
        });
      }
    });
    
    // 3. Assumption/simulation detection
    const simulationKeywords = ['if we', 'assume', 'what if', 'suppose', 'hypothetically', 'could we', 'should we'];
    const hasSimulation = simulationKeywords.some(kw => input.includes(kw));
    
    if (hasSimulation) {
      const simContext = simulationKeywords.find(kw => input.includes(kw));
      claims.push({
        type: 'assumption',
        value: true,
        original: simContext,
        context: 'simulation',
        confidence: 1.0
      });
    }
    
    // 4. Date/time claims
    const datePatterns = [
      /(?:last|next|past)\s*(?:week|month|year|day)/gi,
      /(\d+)\s*(?:days?|weeks?|months?|years?)\s*(?:ago|before|from now)/gi
    ];
    
    datePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        claims.push({
          type: 'date',
          value: match[0],
          original: match[0],
          context: 'temporal',
          confidence: 0.75
        });
      }
    });
    
    return claims;
  }
  
  parseNumber(str) {
    return parseFloat(str.replace(/,/g, ''));
  }
  
  detectFinancialContext(input) {
    if (input.includes('cash') || input.includes('balance')) return 'cash_balance';
    if (input.includes('income') || input.includes('revenue') || input.includes('earning')) return 'income';
    if (input.includes('expense') || input.includes('cost') || input.includes('spending')) return 'expense';
    if (input.includes('profit') || input.includes('net')) return 'net_profit';
    if (input.includes('payment')) return 'payment';
    return 'general_financial';
  }
  
  detectCountContext(input) {
    if (input.includes('worker') || input.includes('staff') || input.includes('employee')) return 'workers';
    if (input.includes('project') || input.includes('site')) return 'projects';
    if (input.includes('supervisor') || input.includes('manager')) return 'supervisors';
    return 'general_count';
  }
  
  // Validate claims against live database
  async validateClaims(claims, isSimulation = false) {
    // If simulation mode, skip value validation
    if (isSimulation) {
      return {
        isValid: true,
        mode: 'simulation',
        validatedClaims: claims,
        warnings: ['Simulation mode - values not validated against live DB']
      };
    }
    
    const validatedClaims = [];
    const warnings = [];
    const errors = [];
    
    for (const claim of claims) {
      if (claim.type === 'assumption') {
        validatedClaims.push({ ...claim, validated: true });
        continue;
      }
      
      // Get live value from DB for comparison
      const liveValue = await this.getLiveValue(claim.context);
      
      if (liveValue !== null) {
        const variance = this.calculateVariance(claim.value, liveValue);
        
        // If variance > 50%, flag as potential override
        if (variance > 50 && claim.type === 'financial') {
          warnings.push({
            claim: claim.original,
            claimed: claim.value,
            actual: liveValue,
            variance: variance.toFixed(1) + '%'
          });
        }
        
        validatedClaims.push({
          ...claim,
          validated: true,
          liveValue: liveValue,
          variance: variance
        });
      } else {
        validatedClaims.push({ ...claim, validated: false, reason: 'No live value found' });
      }
    }
    
    return {
      isValid: warnings.length === 0,
      mode: warnings.length > 0 ? 'warning' : 'real',
      validatedClaims,
      warnings,
      errors
    };
  }
  
  async getLiveValue(context) {
    try {
      switch (context) {
        case 'cash_balance': {
          const { data } = await supabase
            .from('system_snapshot_daily')
            .select('cash_balance')
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .single();
          return data?.cash_balance || null;
        }
        case 'workers': {
          const { count } = await supabase
            .from('workers')
            .select('*', { count: 'exact', head: true });
          return count;
        }
        case 'projects': {
          const { data } = await supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'Ongoing');
          return data?.length || 0;
        }
        case 'supervisors': {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'Site Supervisor');
          return count;
        }
        case 'income': {
          const { data } = await supabase
            .from('finance_snapshot_daily')
            .select('total_income')
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .single();
          return data?.total_income || null;
        }
        case 'expense': {
          const { data } = await supabase
            .from('finance_snapshot_daily')
            .select('total_expenses')
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .single();
          return data?.total_expenses || null;
        }
        default:
          return null;
      }
    } catch (e) {
      console.error('Validation error:', e);
      return null;
    }
  }
  
  calculateVariance(claimed, actual) {
    if (!actual || actual === 0) return 100;
    return Math.abs((claimed - actual) / actual) * 100;
  }
  
  // Detect intent type
  detectIntent(userInput) {
    const input = userInput.toLowerCase();
    
    const intentPatterns = {
      simulation: ['if we', 'assume', 'what if', 'suppose', 'hypothetically', 'could we', 'should we'],
      audit: ['who', 'approved', 'authorized', 'permission', 'who approved', 'who authorized'],
      diagnostic: ['why', 'reason', 'caused by', 'explain', 'what happened', 'why is', 'why did'],
      info: ['what is', 'show me', 'how much', 'current', 'total', 'balance', 'give me']
    };
    
    for (const [intent, keywords] of Object.entries(intentPatterns)) {
      for (const keyword of keywords) {
        if (input.includes(keyword)) {
          return intent;
        }
      }
    }
    
    return 'info'; // default
  }
}

export const realityValidationEngine = new RealityValidationEngine();
export default RealityValidationEngine;
