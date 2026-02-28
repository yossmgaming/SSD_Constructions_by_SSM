// ============================================
// CONFIDENCE ENGINE
// Formula-based confidence scoring for AI responses
// With cross-validation and confidence delta support
// ============================================

class ConfidenceEngine {
  constructor() {
    this.baseFactors = {
      dataFreshness: 0.20,
      dataCompleteness: 0.20,
      validationScore: 0.20,
      patternStrength: 0.15,
      crossValidation: 0.15,
      anomalyPenalty: 0.10
    };
    
    this.simulationPenalty = 0.30;
    this.compoundPenalty = 0.15;
  }

  calculateConfidence(response, context) {
    const scores = {
      dataFreshness: 0,
      dataCompleteness: 0,
      validationScore: 0,
      patternStrength: 0,
      crossValidation: 0,
      anomalyPenalty: 0,
      totalScore: 0,
      level: 'low',
      factors: [],
      crossCheckDetails: {}
    };

    // Data freshness (0-1)
    const dataAge = context?.dataAge || 0;
    scores.dataFreshness = this.getFreshnessScore(dataAge);
    scores.factors.push({
      factor: 'dataFreshness',
      value: scores.dataFreshness,
      label: `Data age: ${dataAge}h`
    });

    // Data completeness (0-1)
    const completeness = context?.completeness || 0;
    scores.dataCompleteness = completeness;
    scores.factors.push({
      factor: 'dataCompleteness',
      value: scores.dataCompleteness,
      label: `Fields available: ${Math.round(completeness * 100)}%`
    });

    // Validation score (from Reality Validation)
    const validation = context?.validationScore || 0;
    scores.validationScore = validation;
    scores.factors.push({
      factor: 'validationScore',
      value: scores.validationScore,
      label: validation > 0.8 ? 'Verified' : 'Unverified'
    });

    // Pattern strength (0-1)
    const patternCount = context?.matchingPatterns || 0;
    scores.patternStrength = Math.min(patternCount / 5, 1);
    scores.factors.push({
      factor: 'patternStrength',
      value: scores.patternStrength,
      label: `${patternCount} matching patterns`
    });

    // Cross-validation score
    const crossCheck = context?.crossCheck || {};
    scores.crossValidation = this.calculateCrossValidation(crossCheck);
    scores.crossCheckDetails = crossCheck;
    scores.factors.push({
      factor: 'crossValidation',
      value: scores.crossValidation,
      label: scores.crossValidation > 0.8 ? 'Cross-checked OK' : 'Inconsistent data'
    });

    // Anomaly penalty
    const anomalyCount = context?.anomalyCount || 0;
    scores.anomalyPenalty = Math.min(anomalyCount * 0.1, 0.5);
    if (anomalyCount > 0) {
      scores.factors.push({
        factor: 'anomalyPenalty',
        value: 1 - scores.anomalyPenalty,
        label: `${anomalyCount} anomalies detected`
      });
    }

    // Calculate total weighted score
    scores.totalScore = 
      (scores.dataFreshness * this.baseFactors.dataFreshness) +
      (scores.dataCompleteness * this.baseFactors.dataCompleteness) +
      (scores.validationScore * this.baseFactors.validationScore) +
      (scores.patternStrength * this.baseFactors.patternStrength) +
      (scores.crossValidation * this.baseFactors.crossValidation) +
      ((1 - scores.anomalyPenalty) * this.baseFactors.anomalyPenalty);

    // Determine confidence level
    if (scores.totalScore >= 0.8) {
      scores.level = 'high';
    } else if (scores.totalScore >= 0.6) {
      scores.level = 'medium';
    } else if (scores.totalScore >= 0.4) {
      scores.level = 'low';
    } else {
      scores.level = 'uncertain';
    }

    return scores;
  }

  calculateCrossValidation(crossCheck) {
    if (!crossCheck || Object.keys(crossCheck).length === 0) return 0.5;
    
    let consistent = 0;
    let total = 0;
    
    for (const [key, check] of Object.entries(crossCheck)) {
      total++;
      if (check.isConsistent !== false) {
        consistent++;
      }
    }
    
    return total > 0 ? consistent / total : 0.5;
  }

  // Detect conflicts between related metrics
  detectConflicts(metrics) {
    const conflicts = [];
    
    if (!metrics) return conflicts;
    
    const { cashBalance, totalExpenses, pendingPayments } = metrics;
    
    if (cashBalance && totalExpenses) {
      const expenseRatio = totalExpenses / cashBalance;
      if (expenseRatio > 2) {
        conflicts.push({
          type: 'cash_vs_expenses',
          severity: 'high',
          message: 'Expenses significantly exceed cash balance',
          metrics: { cashBalance, totalExpenses }
        });
      }
    }
    
    if (cashBalance && pendingPayments) {
      if (pendingPayments > cashBalance * 0.5) {
        conflicts.push({
          type: 'cash_vs_pending',
          severity: 'medium',
          message: 'Pending payments exceed 50% of cash',
          metrics: { cashBalance, pendingPayments }
        });
      }
    }
    
    return conflicts;
  }

  getFreshnessScore(hours) {
    if (hours <= 1) return 1.0;
    if (hours <= 6) return 0.9;
    if (hours <= 24) return 0.75;
    if (hours <= 72) return 0.5;
    if (hours <= 168) return 0.25;
    return 0.1;
  }

  getConfidenceLabel(level) {
    const labels = {
      high: 'HIGH CONFIDENCE',
      medium: 'MEDIUM CONFIDENCE',
      low: 'LOW CONFIDENCE',
      uncertain: 'UNCERTAIN - Verify with data'
    };
    return labels[level] || 'UNKNOWN';
  }

  getConfidenceColor(level) {
    const colors = {
      high: '#16a34a',
      medium: '#ca8a04',
      low: '#ea580c',
      uncertain: '#dc2626'
    };
    return colors[level] || '#6b7280';
  }

  formatConfidenceResponse(confidence) {
    const emoji = {
      high: '✓',
      medium: '◐',
      low: '⚠',
      uncertain: '✗'
    };

    return {
      icon: emoji[confidence.level] || '?',
      label: this.getConfidenceLabel(confidence.level),
      color: this.getConfidenceColor(confidence.level),
      score: Math.round(confidence.totalScore * 100),
      details: confidence.factors
    };
  }

  adjustForSimulation(isSimulation, baseConfidence, isCompound = false) {
    let penalty = 0;
    let note = '';
    
    if (isSimulation) {
      penalty = this.simulationPenalty;
      note = 'Simulation results are estimates - actual outcomes may vary';
    }
    
    if (isCompound) {
      penalty += this.compoundPenalty;
      note = note ? note + '; Compound uncertainty applied' : 'Compound scenario uncertainty applied';
    }
    
    if (penalty > 0) {
      const newScore = baseConfidence.totalScore * (1 - penalty);
      return {
        ...baseConfidence,
        totalScore: newScore,
        originalScore: baseConfidence.totalScore,
        simulationPenalty: Math.round(penalty * 100),
        level: newScore >= 0.6 ? 'medium' : 'low',
        simulationNote: note
      };
    }
    return baseConfidence;
  }

  calculateConfidenceDelta(original, adjusted) {
    if (!original || !adjusted) return 0;
    return Math.round((original - adjusted.totalScore) * 100);
  }
}

export const confidenceEngine = new ConfidenceEngine();
export default ConfidenceEngine;
