// ============================================
// STRUCTURED RESPONSE BUILDER
// Enforces output templates based on intent classification
// ============================================

import { confidenceEngine } from './ConfidenceEngine';

class StructuredResponseBuilder {
  constructor() {
    this.templates = {
      info: this.infoTemplate.bind(this),
      diagnostic: this.diagnosticTemplate.bind(this),
      simulation: this.simulationTemplate.bind(this),
      audit: this.auditTemplate.bind(this),
      general: this.generalTemplate.bind(this)
    };
  }

  buildResponse(intent, data, context) {
    const template = this.templates[intent] || this.templates.general;
    return template(data, context);
  }

  infoTemplate(data, context) {
    return {
      type: 'info',
      sections: [
        {
          title: 'Overview',
          content: data.summary || 'Here is the information you requested:'
        },
        {
          title: 'Key Metrics',
          content: this.formatMetrics(data.metrics || {})
        },
        {
          title: 'Details',
          content: this.formatList(data.details || [])
        }
      ],
      nextSteps: data.nextSteps || [],
      quickActions: data.quickActions || []
    };
  }

  diagnosticTemplate(data, context) {
    const risk = context?.risk || {};
    
    return {
      type: 'diagnostic',
      sections: [
        {
          title: 'Analysis Summary',
          content: data.analysis || 'Diagnostic analysis complete'
        },
        {
          title: `Risk Assessment: ${risk.level?.toUpperCase() || 'N/A'}`,
          content: this.formatRiskFactors(risk.factors || [])
        },
        {
          title: 'Root Causes',
          content: this.formatList(data.causes || [])
        }
      ],
      recommendations: data.recommendations || [],
      riskLevel: risk.level,
      riskScore: risk.totalScore
    };
  }

  simulationTemplate(data, context) {
    return {
      type: 'simulation',
      warning: '⚠️ SIMULATION MODE - These are hypothetical projections based on current data',
      sections: [
        {
          title: 'Scenario',
          content: data.description || 'What-if analysis'
        },
        {
          title: 'Calculations',
          content: this.formatCalculations(data.calculations || [])
        },
        {
          title: 'Projected Impact',
          content: this.formatProjection(data.projections || {})
        }
      ],
      recommendations: data.recommendations || [],
      confidence: context?.confidence
    };
  }

  auditTemplate(data, context) {
    return {
      type: 'audit',
      timestamp: new Date().toISOString(),
      sections: [
        {
          title: 'Audit Trail',
          content: this.formatAuditLog(data.events || [])
        },
        {
          title: 'Compliance Status',
          content: data.compliance || 'All checks passed'
        },
        {
          title: 'Historical Analysis',
          content: this.formatHistory(data.history || [])
        }
      ],
      metrics: data.auditMetrics || {}
    };
  }

  generalTemplate(data, context) {
    return {
      type: 'general',
      sections: [
        {
          title: 'Response',
          content: data.message || data.response || 'Processing your request...'
        }
      ],
      ...(data.suggestions && { suggestions: data.suggestions })
    };
  }

  formatMetrics(metrics) {
    return Object.entries(metrics).map(([key, value]) => ({
      label: this.formatLabel(key),
      value: typeof value === 'number' ? value.toLocaleString() : value
    }));
  }

  formatRiskFactors(factors) {
    return factors.map(f => ({
      label: f.label || f.type,
      value: `${Math.round((f.value || 0) * 100)}%`,
      severity: f.value > 0.6 ? 'high' : f.value > 0.3 ? 'medium' : 'low'
    }));
  }

  formatCalculations(calculations) {
    return calculations.map(c => ({
      label: c.label,
      value: c.value,
      detail: c.detail
    }));
  }

  formatProjection(projections) {
    if (Array.isArray(projections)) {
      return projections.map(p => ({
        period: p.months ? `${p.months} months` : p.period,
        value: `LKR ${(p.value || p.projectedBalance || 0).toLocaleString()}`
      }));
    }
    return Object.entries(projections).map(([key, value]) => ({
      label: this.formatLabel(key),
      value: typeof value === 'number' ? value.toLocaleString() : value
    }));
  }

  formatList(items) {
    return items.map(item => 
      typeof item === 'string' ? item : item.text || item.description || JSON.stringify(item)
    );
  }

  formatHistory(history) {
    return history.slice(-10).map(h => ({
      date: new Date(h.date || h.created_at).toLocaleDateString(),
      event: h.event || h.action,
      user: h.user || h.performed_by || 'System'
    }));
  }

  formatAuditLog(events) {
    return events.slice(-20).map(e => ({
      timestamp: new Date(e.timestamp || e.created_at).toLocaleString(),
      action: e.action || e.event_type,
      details: e.details || e.description,
      status: e.status || 'completed'
    }));
  }

  formatLabel(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  // ============================================
  // BATTLEFIELD RESPONSE TEMPLATE
  // Elite UX with emojis, deltas, and copy-paste ready
  // ============================================

  buildBattlefieldResponse(data, context) {
    const { metrics, risks, recommendations, simulation, confidence, delta, multiTopic, entityAnswers, availabilityNotes } = data;
    const timestamp = new Date().toLocaleString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const greeting = `👋 Executive Overview: Status confirmed as of ${timestamp}`;
    
    const formattedMetrics = this.formatBattlefieldMetrics(metrics, delta);
    const formattedRisks = this.formatBattlefieldRisks(risks);
    const formattedRecommendations = this.formatBattlefieldRecommendations(recommendations);
    const formattedSimulation = this.formatBattlefieldSimulation(simulation);
    const formattedMultiTopic = this.formatBattlefieldMultiTopic(multiTopic);
    const formattedEntityAnswers = this.formatEntityAnswers(entityAnswers);
    const formattedAvailability = this.formatAvailabilityNotes(availabilityNotes);
    const metadata = this.buildMetadata(context, confidence);

    return {
      greeting,
      metrics: formattedMetrics,
      topRisks: formattedRisks,
      recommendations: formattedRecommendations,
      simulationMode: formattedSimulation,
      multiTopicBreakdown: formattedMultiTopic,
      entityAnswers: formattedEntityAnswers,
      dataAvailability: formattedAvailability,
      metadata,
      cta: formattedRecommendations[0]?.action 
        ? `📌 Recommended Next Steps: ${formattedRecommendations[0].action}`
        : null
    };
  }

  formatEntityAnswers(entityAnswers) {
    if (!entityAnswers || entityAnswers.length === 0) return [];
    
    return entityAnswers.map(answer => ({
      type: answer.type,
      available: answer.available !== false,
      data: answer.data || answer,
      count: answer.count,
      note: answer.note || null
    }));
  }

  formatAvailabilityNotes(notes) {
    if (!notes || notes.length === 0) return [];
    
    return notes.map(n => ({
      entity: n.entity,
      note: n.note,
      severity: 'info'
    }));
  }

  formatBattlefieldMetrics(metrics, delta) {
    if (!metrics) return [];
    
    const metricMap = [
      { key: 'cashBalance', label: '💰 Cash Balance', emoji: '💰' },
      { key: 'activeWorkers', label: '👷 Active Workers', emoji: '👷' },
      { key: 'activeProjects', label: '🏗️ Active Projects', emoji: '🏗️' },
      { key: 'criticalAlerts', label: '⚠️ Critical Alerts', emoji: '⚠️' },
      { key: 'avgConfidence', label: '📊 Confidence Level', emoji: '📊' }
    ];

    return metricMap.map(m => {
      const value = metrics[m.key] ?? metrics[m.label] ?? 0;
      const deltaValue = delta?.[m.key];
      const status = this.getMetricStatus(m.key, value, deltaValue);
      
      return {
        label: m.label,
        value: this.formatValue(m.key, value),
        delta: deltaValue ? `${deltaValue > 0 ? '+' : ''}${deltaValue}%` : null,
        status: status.emoji,
        rawValue: value
      };
    });
  }

  getMetricStatus(key, value, delta) {
    if (key === 'criticalAlerts') {
      if (value >= 2) return { emoji: '🔴', level: 'critical' };
      if (value === 1) return { emoji: '🟠', level: 'warning' };
      return { emoji: '🟢', level: 'stable' };
    }
    if (key === 'cashBalance' || key === 'activeWorkers' || key === 'activeProjects') {
      if (delta < -10) return { emoji: '🟠', level: 'warning' };
      if (delta < -20) return { emoji: '🔴', level: 'critical' };
      return { emoji: '🟢', level: 'stable' };
    }
    if (key === 'avgConfidence') {
      if (value >= 80) return { emoji: '🟢', level: 'high' };
      if (value >= 60) return { emoji: '🟠', level: 'medium' };
      return { emoji: '🔴', level: 'low' };
    }
    return { emoji: '🟢', level: 'stable' };
  }

  formatValue(key, value) {
    if (key === 'cashBalance') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
      return value.toString();
    }
    return value?.toLocaleString() || '0';
  }

  formatBattlefieldRisks(risks) {
    if (!risks || risks.length === 0) return [];
    
    return risks.slice(0, 3).map(r => {
      const severity = r.level === 'critical' ? '🔴 Critical' 
        : r.level === 'high' ? '🟠 Watchlist' 
        : '🟢 Low';
      
      return {
        severity,
        title: r.projectName || r.title || 'Unknown Risk',
        description: r.description || this.getRiskDescription(r),
        impact: r.impact || this.getRiskImpact(r),
        recommendation: r.recommendation || r.action || 'Monitor closely',
        rawLevel: r.level
      };
    });
  }

  getRiskDescription(risk) {
    if (risk.alertSeverity > 0.7) return 'Multiple critical alerts active';
    if (risk.budgetVariance > 0.3) return 'Budget overrun detected';
    if (risk.daysOverdue > 7) return 'Project schedule delayed';
    if (risk.attendanceGap > 0.2) return 'Attendance issues detected';
    return 'Risk factor identified';
  }

  getRiskImpact(risk) {
    if (risk.financialImpact > 1000000) return `LKR ${(risk.financialImpact / 1000000).toFixed(1)}M at risk`;
    if (risk.financialImpact > 0) return `LKR ${(risk.financialImpact / 1000).toFixed(0)}K at risk`;
    return 'Operational impact expected';
  }

  formatBattlefieldRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) return [];
    
    return recommendations.slice(0, 5).map((r, i) => {
      const emoji = r.priorityScore >= 0.6 ? '🔴' 
        : r.priorityScore >= 0.4 ? '🟠' 
        : '🟢';
      
      return {
        priority: i + 1,
        emoji,
        action: r.action || r.text || 'No action specified',
        reason: r.reason || this.getRecommendationReason(r),
        timeframe: r.timeframe || this.getTimeframe(r)
      };
    });
  }

  getRecommendationReason(rec) {
    if (rec.type === 'budget') return 'Budget threshold approaching';
    if (rec.type === 'cash') return 'Cash reserves need attention';
    if (rec.type === 'staffing') return 'Staffing levels require review';
    if (rec.type === 'project') return 'Project milestone affected';
    return 'Operational recommendation';
  }

  getTimeframe(rec) {
    if (rec.urgent) return 'Immediate';
    if (rec.priorityScore >= 0.6) return 'This week';
    if (rec.priorityScore >= 0.4) return 'This month';
    return 'When convenient';
  }

  formatBattlefieldSimulation(simulation) {
    if (!simulation || !simulation.isSimulation) {
      return { active: false };
    }

    const scenarios = [];
    if (simulation.calculations) {
      simulation.calculations.forEach(calc => {
        scenarios.push({
          scenario: calc.label || 'Scenario',
          current: calc.detail || 'Current',
          impact: calc.value || 'N/A',
          projected: this.extractProjectedValue(calc),
          confidence: simulation.confidenceScore || 70
        });
      });
    }

    return {
      active: true,
      banner: '⚠️ SIMULATION MODE: Values are hypothetical, not committed',
      scenarios,
      warning: 'Simulation results are estimates based on current data'
    };
  }

  extractProjectedValue(calc) {
    if (calc.detail?.includes('×')) {
      return calc.detail;
    }
    return calc.value || 'N/A';
  }

  formatBattlefieldMultiTopic(multiTopic) {
    if (!multiTopic) return [];
    
    return multiTopic.map(topic => ({
      topic: topic.name || topic.topic,
      status: topic.status || 'Unknown',
      details: topic.details || topic.description || '',
      emoji: this.getTopicEmoji(topic.name || topic.topic)
    }));
  }

  getTopicEmoji(topicName) {
    const map = {
      'cash': '💰',
      'cash flow': '💰',
      'worker': '👷',
      'supervisor': '👷',
      'material': '🏗️',
      'payment': '📌',
      'project': '🏗️',
      'attendance': '📊'
    };
    const key = Object.keys(map).find(k => topicName.toLowerCase().includes(k));
    return map[key] || '📋';
  }

  buildMetadata(context, confidence) {
    return {
      snapshotId: context?.snapshotId || `snap-${Date.now()}`,
      snapshotVersion: context?.snapshotVersion || 1,
      confidenceLevel: confidence?.totalScore 
        ? `${Math.round(confidence.totalScore * 100)}%`
        : 'N/A',
      confidenceDelta: confidence?.simulationPenalty 
        ? `-${confidence.simulationPenalty}%` 
        : null,
      verifiedAt: new Date().toLocaleString(),
      dataSources: ['systemSnapshot', 'projectSnapshot', 'financeSnapshot', 'workerSnapshot', 'aiEvents']
    };
  }

  // Convert battlefield response to markdown for display
  battlefieldToMarkdown(response) {
    let md = '';
    
    md += `${response.greeting}\n\n`;
    
    md += `### 📊 Key Metrics\n`;
    response.metrics?.forEach(m => {
      md += `| ${m.status} ${m.label} | ${m.value}${m.delta ? ` (${m.delta})` : ''} |\n`;
    });
    md += '\n';

    if (response.topRisks?.length > 0) {
      md += `### ⚠️ Top Risks\n`;
      response.topRisks.forEach(r => {
        md += `**${r.severity}**\n`;
        md += `- **${r.title}**: ${r.description}\n`;
        md += `- Impact: ${r.impact}\n`;
        md += `- Recommendation: ${r.recommendation}\n\n`;
      });
    }

    if (response.recommendations?.length > 0) {
      md += `### 📌 Recommendations\n`;
      response.recommendations.forEach(r => {
        md += `${r.priority}. ${r.emoji} ${r.action}\n`;
        md += `   Reason: ${r.reason} | Timeframe: ${r.timeframe}\n\n`;
      });
    }

    if (response.simulationMode?.active) {
      md += `### ⚠️ ${response.simulationMode.banner}\n`;
      response.simulationMode.scenarios?.forEach(s => {
        md += `- **${s.scenario}**: ${s.current} → ${s.projected} (${s.confidence}% confidence)\n`;
      });
      md += '\n';
    }

    if (response.cta) {
      md += `### ${response.cta}\n`;
    }

    md += `---\n`;
    md += `*Data sources: ${response.metadata.dataSources.join(', ')}* | `;
    md += `*Confidence: ${response.metadata.confidenceLevel}*`;

    return md;
  }

  addTone(response, tone = 'professional') {
    const tones = {
      professional: {
        prefix: '',
        suffix: '\n\nLet me know if you need any clarification.'
      },
      executive: {
        prefix: 'EXECUTIVE SUMMARY:\n',
        suffix: '\n\nReady for board presentation.'
      },
      urgent: {
        prefix: '⚡ ACTION REQUIRED:\n',
        suffix: '\n\nPlease address immediately.'
      },
      friendly: {
        prefix: '',
        suffix: '\n\nHappy to help with anything else!'
      }
    };

    const toneConfig = tones[tone] || tones.professional;
    return {
      ...response,
      tone,
      toneConfig
    };
  }

  toMarkdown(response) {
    let md = '';
    
    if (response.warning) {
      md += `> ⚠️ **${response.warning}**\n\n`;
    }
    
    if (response.type === 'diagnostic' && response.riskLevel) {
      md += `### Risk Level: ${response.riskLevel.toUpperCase()} (${Math.round((response.riskScore || 0) * 100)}%)\n\n`;
    }

    response.sections?.forEach(section => {
      md += `### ${section.title}\n\n`;
      md += `${section.content}\n\n`;
    });

    if (response.recommendations?.length > 0) {
      md += '### Recommendations\n\n';
      response.recommendations.forEach((rec, i) => {
        md += `${i + 1}. ${rec.text || rec}\n`;
      });
      md += '\n';
    }

    if (response.toneConfig?.suffix) {
      md += response.toneConfig.suffix;
    }

    return md;
  }
}

export const structuredResponseBuilder = new StructuredResponseBuilder();
export default StructuredResponseBuilder;
