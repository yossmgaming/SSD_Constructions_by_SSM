// ============================================
// RISK ENGINE
// Calculates risk scores using weighted formula
// Formula: alertSeverity * 0.30 + budgetVariance * 0.30 + daysOverdue * 0.20 + attendanceGap * 0.20
// Features: Alert decay (7-day), dynamic thresholds per project type
// ============================================

import { supabase } from '../data/supabase';

class RiskEngine {
  constructor() {
    this.weights = {
      alertSeverity: 0.30,
      budgetVariance: 0.30,
      daysOverdue: 0.20,
      attendanceGap: 0.20
    };
    
    this.thresholds = {
      critical: 0.8,
      high: 0.6,
      medium: 0.4,
      low: 0.2
    };

    this.projectTypeThresholds = {
      large: { critical: 0.7, high: 0.5, medium: 0.3 },
      medium: { critical: 0.8, high: 0.6, medium: 0.4 },
      small: { critical: 0.9, high: 0.7, medium: 0.5 }
    };

    this.alertDecayDays = 7;
    this.alertDecayFactor = 0.2;
  }

  normalizeScore(value, max, inverse = false) {
    const normalized = Math.min(value / max, 1);
    return inverse ? 1 - normalized : normalized;
  }

  getProjectTypeThresholds(projectCost) {
    if (projectCost >= 10000000) return this.projectTypeThresholds.large;
    if (projectCost >= 1000000) return this.projectTypeThresholds.medium;
    return this.projectTypeThresholds.small;
  }

  calculateAlertDecay(alertAgeDays) {
    if (alertAgeDays <= 0) return 1;
    if (alertAgeDays >= this.alertDecayDays) return 1 - this.alertDecayFactor;
    return 1 - (this.alertDecayFactor * (alertAgeDays / this.alertDecayDays));
  }

  async calculateRiskScore(projectId = null, context = {}) {
    const scores = {
      alertSeverity: 0,
      budgetVariance: 0,
      daysOverdue: 0,
      attendanceGap: 0,
      totalScore: 0,
      level: 'low',
      factors: [],
      alertDecayApplied: false,
      projectType: 'standard'
    };

    const customThresholds = context?.projectType 
      ? this.projectTypeThresholds[context.projectType] 
      : null;

    const activeThresholds = customThresholds || this.thresholds;

    // Fetch active alerts with age tracking
    const { data: alerts } = await supabase
      .from('ai_events')
      .select('severity, event_type, created_at')
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    if (alerts && alerts.length > 0) {
      const severityMap = { critical: 1, high: 0.75, medium: 0.5, low: 0.25 };
      let maxScore = 0;
      let hasDecayedAlert = false;

      for (const alert of alerts) {
        const ageDays = (Date.now() - new Date(alert.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const decayFactor = this.calculateAlertDecay(ageDays);
        const rawScore = severityMap[alert.severity] || 0;
        const decayedScore = rawScore * decayFactor;
        
        if (decayFactor < 1) hasDecayedAlert = true;
        maxScore = Math.max(maxScore, decayedScore);
      }

      scores.alertSeverity = maxScore;
      scores.alertDecayApplied = hasDecayedAlert;
      scores.factors.push({ 
        type: 'alert', 
        value: maxScore, 
        label: hasDecayedAlert ? 'Active Alerts (decayed)' : 'Active Alerts' 
      });
    }

    // Budget variance calculation
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('estimatedCost, totalSpent, startDate, deadline')
        .eq('id', projectId)
        .single();

      if (project) {
        const budgetUsed = project.totalSpent / project.estimatedCost;
        const variance = Math.abs(budgetUsed - 1);
        scores.budgetVariance = this.normalizeScore(variance, 0.5);
        scores.factors.push({ type: 'budget', value: scores.budgetVariance, label: 'Budget Variance' });

        // Days overdue
        if (new Date(project.deadline) < new Date()) {
          const daysOverdue = Math.floor((new Date() - new Date(project.deadline)) / (1000 * 60 * 60 * 24));
          scores.daysOverdue = this.normalizeScore(daysOverdue, 30);
          scores.factors.push({ type: 'schedule', value: scores.daysOverdue, label: 'Days Overdue' });
        }
      }
    }

    // Attendance gap
    const { data: workers } = await supabase
      .from('workers')
      .select('attendanceRate')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (workers && workers.length > 0) {
      const avgAttendance = workers.reduce((sum, w) => sum + (w.attendanceRate || 0), 0) / workers.length;
      scores.attendanceGap = this.normalizeScore(100 - avgAttendance, 30, true);
      scores.factors.push({ type: 'attendance', value: scores.attendanceGap, label: 'Attendance Gap' });
    }

    // Calculate total weighted score
    scores.totalScore = 
      (scores.alertSeverity * this.weights.alertSeverity) +
      (scores.budgetVariance * this.weights.budgetVariance) +
      (scores.daysOverdue * this.weights.daysOverdue) +
      (scores.attendanceGap * this.weights.attendanceGap);

    // Determine level using dynamic thresholds
    const riskThresholds = context?.customThresholds || this.thresholds;
    if (scores.totalScore >= riskThresholds.critical) {
      scores.level = 'critical';
    } else if (scores.totalScore >= riskThresholds.high) {
      scores.level = 'high';
    } else if (scores.totalScore >= riskThresholds.medium) {
      scores.level = 'medium';
    } else {
      scores.level = 'low';
    }

    // Add context overrides
    if (context.forceLevel) {
      scores.level = context.forceLevel;
    }

    return scores;
  }

  async getProjectRisks() {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status, estimatedCost')
      .eq('status', 'Ongoing');

    if (!projects) return [];

    const risks = await Promise.all(
      projects.map(async (p) => {
        const projectType = p.estimatedCost >= 10000000 ? 'large' 
          : p.estimatedCost >= 1000000 ? 'medium' 
          : 'small';
        
        const customThresholds = this.getProjectTypeThresholds(p.estimatedCost);
        const scores = await this.calculateRiskScore(p.id, { 
          projectType,
          customThresholds 
        });
        return {
          projectId: p.id,
          projectName: p.name,
          ...scores
        };
      })
    );

    return risks.sort((a, b) => b.totalScore - a.totalScore);
  }

  getSeverityColor(level) {
    const colors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#16a34a'
    };
    return colors[level] || colors.low;
  }

  getSeverityLabel(level) {
    const labels = {
      critical: 'CRITICAL',
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW'
    };
    return labels[level] || 'UNKNOWN';
  }
}

export const riskEngine = new RiskEngine();
export default RiskEngine;
