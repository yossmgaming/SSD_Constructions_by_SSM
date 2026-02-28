// ============================================
// PRIORITY ENGINE
// Sorts recommendations by riskScore × financialImpact × urgencyWeight
// urgencyWeight = 1 + (30 - daysToImpact) / 30
// ============================================

class PriorityEngine {
  constructor() {
    this.financialImpactMultipliers = {
      critical: 1.0,
      high: 0.75,
      medium: 0.5,
      low: 0.25
    };
    
    this.defaultDaysToImpact = 30;
  }

  calculateUrgencyWeight(daysToImpact) {
    if (!daysToImpact || daysToImpact <= 0) return 1.5;
    if (daysToImpact >= 30) return 1.0;
    return 1 + ((30 - daysToImpact) / 30);
  }

  calculatePriorityScore(recommendation) {
    const riskScore = recommendation.riskScore || 0.5;
    const financialImpact = recommendation.financialImpact || this.financialImpactMultipliers.medium;
    const daysToImpact = recommendation.daysToImpact || this.defaultDaysToImpact;
    const urgencyMultiplier = this.calculateUrgencyWeight(daysToImpact);
    const explicitUrgency = recommendation.urgent ? 1.5 : 1.0;
    
    return riskScore * financialImpact * urgencyMultiplier * explicitUrgency;
  }

  sortRecommendations(recommendations) {
    return recommendations
      .map(rec => ({
        ...rec,
        priorityScore: this.calculatePriorityScore(rec),
        urgencyWeight: this.calculateUrgencyWeight(rec.daysToImpact)
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  categorizeByPriority(recommendations) {
    const sorted = this.sortRecommendations(recommendations);
    
    return {
      immediate: sorted.filter(r => r.priorityScore >= 0.6),
      thisWeek: sorted.filter(r => r.priorityScore >= 0.4 && r.priorityScore < 0.6),
      thisMonth: sorted.filter(r => r.priorityScore >= 0.2 && r.priorityScore < 0.4),
      backlog: sorted.filter(r => r.priorityScore < 0.2)
    };
  }

  enrichWithFinancialImpact(recommendations, context) {
    const costData = context?.costData || {};
    
    return recommendations.map(rec => {
      let estimatedImpact = 0;
      let daysToImpact = this.defaultDaysToImpact;
      
      switch (rec.type) {
        case 'budget':
          estimatedImpact = rec.potentialLoss || rec.potentialSavings || 0;
          daysToImpact = rec.daysUntilOverrun || 14;
          break;
        case 'cash':
          estimatedImpact = rec.cashImpact || 0;
          daysToImpact = rec.daysUntilShortage || 7;
          break;
        case 'staffing':
          estimatedImpact = (rec.openPositions || 0) * (rec.avgSalary || 100000) / 12;
          daysToImpact = rec.daysUntilImpact || 21;
          break;
        case 'project':
          estimatedImpact = rec.projectValue ? rec.projectValue * 0.1 : 0;
          daysToImpact = rec.daysUntilDelay || 10;
          break;
        case 'material':
          estimatedImpact = rec.wasteCost || rec.savingsPotential || 0;
          daysToImpact = rec.daysUntilShortage || 14;
          break;
        default:
          estimatedImpact = costData[rec.type] || 0;
      }
      
      return {
        ...rec,
        financialImpact: estimatedImpact,
        daysToImpact,
        impactLabel: this.formatCurrency(estimatedImpact)
      };
    });
  }

  formatCurrency(amount) {
    if (amount >= 1000000) {
      return `LKR ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `LKR ${(amount / 1000).toFixed(0)}K`;
    }
    return `LKR ${amount.toFixed(0)}`;
  }

  generateActionPlan(recommendations) {
    const categorized = this.categorizeByPriority(recommendations);
    
    return {
      immediate: categorized.immediate.map(r => ({
        action: r.action,
        owner: r.owner || 'TBD',
        deadline: '24 hours',
        impact: r.impactLabel
      })),
      thisWeek: categorized.thisWeek.map(r => ({
        action: r.action,
        owner: r.owner || 'TBD',
        deadline: '7 days',
        impact: r.impactLabel
      })),
      thisMonth: categorized.thisMonth.map(r => ({
        action: r.action,
        owner: r.owner || 'TBD',
        deadline: '30 days',
        impact: r.impactLabel
      }))
    };
  }
}

export const priorityEngine = new PriorityEngine();
export default PriorityEngine;
