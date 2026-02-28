// ============================================
// AI COMMAND ORCHESTRATOR
// Master pipeline: Intent → Sim → Validate → Topics → Risk → Priority → Response → Tone → Confidence → Log
// ============================================

import { supabase } from '../data/supabase';
import { simulationEngine } from './SimulationEngine';
import { riskEngine } from './RiskEngine';
import { priorityEngine } from './PriorityEngine';
import { confidenceEngine } from './ConfidenceEngine';
import { structuredResponseBuilder } from './StructuredResponseBuilder';

class AICommandOrchestrator {
  constructor() {
    this.intentPatterns = {
      diagnostic: ['why', 'why is', 'reason', 'cause', 'problem', 'issue', 'analyze', 'analysis', 'diagnosis', 'check', 'find'],
      simulation: ['if we', 'assume', 'what if', 'suppose', 'hypothetically', 'could we', 'should we', 'predict', 'forecast'],
      audit: ['audit', 'history', 'log', 'track', 'timeline', 'when did', 'who did', 'records', 'compliance'],
      info: ['show', 'list', 'what is', 'how many', 'total', 'summary', 'report', 'status', 'dashboard']
    };
  }

  async process(userInput, userId, userRole) {
    const pipeline = {
      input: userInput,
      normalizedInput: this.normalizeInput(userInput),
      userId,
      userRole,
      timestamp: new Date().toISOString(),
      stages: {}
    };

    try {
      // Stage 0: Pre-flight Conflict Detection (parallel)
      pipeline.stages.conflictDetection = await this.detectConflicts(userInput, pipeline.normalizedInput);
      
      // Stage 1: Intent Classification
      pipeline.stages.intent = this.classifyIntent(userInput);
      
      // Stage 2: Derived Metrics Detection
      pipeline.stages.derivedMetrics = this.extractDerivedMetrics(userInput, pipeline.normalizedInput);
      
      // Stage 3: Simulation Detection
      pipeline.stages.simulation = await simulationEngine.execute(userInput);
      
      // Stage 4: Context Building
      pipeline.stages.context = await this.buildContext(pipeline.stages.intent, userRole);
      
      // Stage 5: Cross-validation (if conflicts detected)
      if (pipeline.stages.conflictDetection?.conflicts?.length > 0) {
        pipeline.stages.crossCheck = this.performCrossValidation(pipeline.stages.context);
      }
      
      // Stage 6: Reality Validation (skip for simulations)
      if (!pipeline.stages.simulation.isSimulation) {
        pipeline.stages.validation = await this.runValidation(userInput, pipeline.stages.context);
      } else {
        pipeline.stages.validation = { validated: true, claims: [], score: 1 };
      }
      
      // Stage 7: Risk Assessment
      pipeline.stages.risk = await riskEngine.calculateRiskScore(
        pipeline.stages.context?.activeProjectId,
        { forceLevel: pipeline.stages.context?.forcedRiskLevel }
      );
      
      // Stage 8: Priority Sorting
      const recommendations = pipeline.stages.context?.recommendations || [];
      pipeline.stages.priority = priorityEngine.enrichWithFinancialImpact(
        recommendations,
        pipeline.stages.context
      );
      pipeline.stages.priority = priorityEngine.sortRecommendations(pipeline.stages.priority);
      
      // Stage 9: Confidence Scoring
      const dataAge = this.getDataAge(pipeline.stages.context);
      pipeline.stages.confidence = confidenceEngine.calculateConfidence(null, {
        dataAge,
        completeness: pipeline.stages.context?.completeness || 0.5,
        validationScore: pipeline.stages.validation?.score || 0.5,
        matchingPatterns: pipeline.stages.validation?.claims?.length || 0,
        crossCheck: pipeline.stages.crossCheck || {},
        anomalyCount: pipeline.stages.conflictDetection?.conflicts?.length || 0
      });
      
      const isCompound = pipeline.stages.simulation?.isCompound || false;
      pipeline.stages.confidence = confidenceEngine.adjustForSimulation(
        pipeline.stages.simulation.isSimulation,
        pipeline.stages.confidence,
        isCompound
      );
      
      // Stage 10: Response Building
      pipeline.stages.response = this.buildResponse(
        pipeline.stages.intent,
        pipeline.stages.simulation,
        pipeline.stages.context,
        pipeline.stages.risk,
        pipeline.stages.priority,
        pipeline.stages.confidence
      );
      
      // Stage 11: Tone Adjustment
      pipeline.stages.response = structuredResponseBuilder.addTone(
        pipeline.stages.response,
        this.determineTone(pipeline.stages.risk, pipeline.stages.intent)
      );
      
      // Stage 12: Audit Logging
      await this.logInteraction(pipeline);
      
      pipeline.success = true;
      return pipeline;
      
    } catch (error) {
      pipeline.error = error.message;
      pipeline.success = false;
      return pipeline;
    }
  }

  normalizeInput(input) {
    return input
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async detectConflicts(input, normalizedInput) {
    const conflicts = [];
    
    const conflictPatterns = [
      { 
        pattern: /cash.*(low|short|run out).*expense|expense.*high.*cash/i,
        type: 'cash_vs_expenses',
        severity: 'high',
        message: 'Potential contradiction: cash concern vs expense level'
      },
      {
        pattern: /cash.*(high|plenty|good).*payment.*overdue/i,
        type: 'cash_vs_payments',
        severity: 'medium',
        message: 'Potential contradiction: healthy cash vs overdue payments'
      },
      {
        pattern: /worker.*(short|staff).*project.*delay/i,
        type: 'staffing_vs_timeline',
        severity: 'medium',
        message: 'Potential contradiction: staffing issue vs project timeline'
      }
    ];

    for (const pattern of conflictPatterns) {
      if (pattern.pattern.test(normalizedInput)) {
        conflicts.push({
          type: pattern.type,
          severity: pattern.severity,
          message: pattern.message,
          detectedIn: 'input'
        });
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      conflictCount: conflicts.length
    };
  }

  extractDerivedMetrics(input, normalizedInput) {
    const derived = [];
    
    const derivedPatterns = [
      {
        pattern: /finish\s+(\d+)\s*project/i,
        type: 'project_completion',
        extract: (match) => ({
          value: parseInt(match[1]),
          unit: 'projects',
          action: 'early_completion'
        })
      },
      {
        pattern: /(\d+)\s*%\s*(increase|decrease|growth|reduction)/i,
        type: 'percentage_change',
        extract: (match) => ({
          value: parseInt(match[1]),
          unit: 'percent',
          action: match[2]
        })
      },
      {
        pattern: /(early|late|ahead|behind)\s*schedule/i,
        type: 'schedule_variance',
        extract: (match) => ({
          value: match[1],
          unit: 'schedule_status'
        })
      }
    ];

    for (const pattern of derivedPatterns) {
      const match = normalizedInput.match(pattern.pattern);
      if (match) {
        derived.push({
          type: pattern.type,
          original: match[0],
          extracted: pattern.extract(match)
        });
      }
    }

    return {
      hasDerived: derived.length > 0,
      metrics: derived,
      count: derived.length
    };
  }

  performCrossValidation(context) {
    const crossCheck = {};
    
    if (context?.finance && context?.projects) {
      const cashBalance = context.finance.cash_balance || 0;
      const totalExpenses = context.finance.total_expenses || 0;
      
      crossCheck.cashVsExpenses = {
        cashBalance,
        totalExpenses,
        isConsistent: totalExpenses < cashBalance * 3,
        ratio: cashBalance > 0 ? totalExpenses / cashBalance : 0
      };
    }

    if (context?.finance && context?.workers) {
      const cashBalance = context.finance.cash_balance || 0;
      const totalDailyRate = (context.workers || []).reduce((sum, w) => sum + (w.dailyRate || 0), 0);
      const monthlyBurn = totalDailyRate * 26;
      
      crossCheck.cashVsPayroll = {
        cashBalance,
        monthlyBurn,
        isConsistent: cashBalance > monthlyBurn * 2,
        runwayMonths: monthlyBurn > 0 ? cashBalance / monthlyBurn : 0
      };
    }

    return crossCheck;
  }

  classifyIntent(input) {
    const normalized = input.toLowerCase();
    let intent = 'general';
    let confidence = 0;
    
    for (const [type, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (normalized.includes(pattern)) {
          intent = type;
          confidence = Math.max(confidence, pattern.length / normalized.length);
          break;
        }
      }
    }
    
    return { intent, confidence: Math.min(confidence + 0.5, 1) };
  }

  async buildContext(intent, userRole) {
    const context = {
      userRole,
      recommendations: [],
      metrics: {},
      completeness: 0.5
    };

    // Fetch role-appropriate data
    const fetches = [
      this.fetchProjects(),
      this.fetchFinance(),
      this.fetchWorkers()
    ];

    const [projects, finance, workers] = await Promise.all(fetches);
    
    context.projects = projects;
    context.finance = finance;
    context.workers = workers;

    // Generate recommendations based on data
    context.recommendations = this.generateRecommendations(
      projects,
      finance,
      workers,
      userRole
    );

    // Calculate data completeness
    const fields = [projects, finance, workers].filter(Boolean).length;
    context.completeness = fields / 3;

    // Identify active project
    const activeProject = projects?.find(p => p.status === 'Ongoing');
    context.activeProjectId = activeProject?.id;

    return context;
  }

  async fetchProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, status, estimatedCost, totalSpent, deadline, progress')
      .order('created_at', { ascending: false })
      .limit(10);
    return data;
  }

  async fetchFinance() {
    const { data } = await supabase
      .from('finance_snapshot_daily')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();
    return data;
  }

  async fetchWorkers() {
    const { data } = await supabase
      .from('workers')
      .select('id, name, role, attendanceRate, dailyRate, status')
      .order('created_at', { ascending: false })
      .limit(20);
    return data;
  }

  generateRecommendations(projects, finance, workers) {
    const recommendations = [];

    // Check budget overruns
    projects?.forEach(p => {
      const spent = p.totalSpent || 0;
      const budget = p.estimatedCost || 1;
      if (spent / budget > 0.9) {
        recommendations.push({
          type: 'budget',
          action: `Review budget for ${p.name} - approaching limit`,
          riskScore: 0.8,
          financialImpact: spent - budget,
          projectId: p.id
        });
      }
    });

    // Check cash flow
    if (finance?.cash_balance < 500000) {
      recommendations.push({
        type: 'cash',
        action: 'Cash reserves critically low',
        riskScore: 0.9,
        financialImpact: 500000 - (finance?.cash_balance || 0),
        urgent: true
      });
    }

    // Check attendance issues
    workers?.forEach(w => {
      if ((w.attendanceRate || 0) < 80) {
        recommendations.push({
          type: 'staffing',
          action: `Low attendance: ${w.name}`,
          riskScore: 0.6,
          financialImpact: (100 - (w.attendanceRate || 0)) * (w.dailyRate || 0),
          workerId: w.id
        });
      }
    });

    return recommendations;
  }

  async runValidation(input, context) {
    // Simple validation: check for specific claims
    const claims = [];
    const validated = { validated: true, claims: [], score: 1 };

    // Check for numeric claims
    const numberPattern = /(?:LKR|Rs\.?)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)|(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|lakh|thousand)/gi;
    const numbers = input.match(numberPattern);
    
    if (numbers) {
      numbers.forEach(n => {
        claims.push({
          claim: n,
          validated: true, // Would validate against DB in production
          source: 'user_input'
        });
      });
    }

    validated.claims = claims;
    validated.score = claims.length > 0 ? 0.8 : 1;

    return validated;
  }

  getDataAge(context) {
    if (!context?.finance?.snapshot_date) return 168;
    const age = Date.now() - new Date(context.finance.snapshot_date).getTime();
    return age / (1000 * 60 * 60);
  }

  buildResponse(intent, simulation, context, risk, priority, confidence) {
    const metrics = this.extractMetrics(context);
    const delta = this.calculateDelta(context);
    const risks = context?.recommendations?.slice(0, 3) || [];
    
    // Extract multi-topic breakdown
    const multiTopic = this.extractMultiTopic(metrics, context);

    // Build battlefield response
    const battlefieldData = {
      metrics,
      delta,
      risks,
      recommendations: priority.slice(0, 5),
      simulation: simulation.isSimulation ? simulation : null,
      confidence,
      multiTopic
    };

    const battlefieldResponse = structuredResponseBuilder.buildBattlefieldResponse(battlefieldData, {
      snapshotId: `snap-${Date.now()}`,
      snapshotVersion: 1
    });

    // Also keep legacy format for backward compatibility
    const legacyData = {
      summary: this.generateSummary(intent, context),
      details: this.extractDetails(context),
      recommendations: priority.slice(0, 5),
      simulation: simulation.isSimulation ? simulation : null
    };

    return {
      ...battlefieldResponse,
      legacy: structuredResponseBuilder.buildResponse(intent.intent, legacyData, {
        risk,
        confidence,
        simulation: simulation.isSimulation
      })
    };
  }

  calculateDelta(context) {
    const delta = {};
    
    // For now, return empty delta - would need previous snapshot comparison
    // This can be enhanced with historical data
    if (context?.finance) {
      delta.cashBalance = 0; // Would compare with previous snapshot
    }
    if (context?.workers) {
      delta.activeWorkers = 0;
    }
    if (context?.projects) {
      delta.activeProjects = 0;
    }
    
    return delta;
  }

  extractMultiTopic(metrics, context) {
    const topics = [];
    
    if (context?.finance) {
      topics.push({
        name: 'Cash Flow',
        status: (context.finance.cash_balance || 0) > 1000000 ? 'Healthy' : 'Needs Attention',
        details: `Cash balance: LKR ${(context.finance.cash_balance || 0).toLocaleString()}`
      });
    }
    
    if (context?.workers?.length > 0) {
      const avgAttendance = context.workers.reduce((sum, w) => sum + (w.attendanceRate || 0), 0) / context.workers.length;
      topics.push({
        name: 'Supervisor Load',
        status: avgAttendance >= 80 ? 'Stable' : 'Attention Needed',
        details: `${context.workers.length} workers, ${avgAttendance.toFixed(0)}% avg attendance`
      });
    }
    
    if (context?.projects) {
      const ongoing = context.projects.filter(p => p.status === 'Ongoing').length;
      topics.push({
        name: 'Project Status',
        status: ongoing > 0 ? 'Active' : 'No Active Projects',
        details: `${ongoing} ongoing projects`
      });
    }
    
    return topics;
  }

  generateSummary(intent, context) {
    if (intent.intent === 'diagnostic') {
      return `Analysis complete. Found ${context?.recommendations?.length || 0} items requiring attention.`;
    }
    if (intent.intent === 'simulation') {
      return 'Simulation complete. Results are estimates based on current data.';
    }
    return 'Here is your requested information:';
  }

  extractMetrics(context) {
    const metrics = {};
    if (context?.finance) {
      metrics.cashBalance = context.finance.cash_balance || 0;
      metrics.totalExpenses = context.finance.total_expenses || 0;
    }
    if (context?.projects) {
      metrics.activeProjects = context.projects.filter(p => p.status === 'Ongoing').length;
    }
    if (context?.workers) {
      metrics.totalWorkers = context.workers.length;
    }
    return metrics;
  }

  extractDetails(context) {
    const details = [];
    context?.projects?.forEach(p => {
      details.push(`${p.name}: ${p.progress || 0}% complete`);
    });
    return details;
  }

  determineTone(risk, intent) {
    if (risk?.level === 'critical' || risk?.level === 'high') {
      return 'urgent';
    }
    if (intent?.intent === 'audit') {
      return 'professional';
    }
    return 'professional';
  }

  async logInteraction(pipeline) {
    try {
      await supabase.from('ai_interaction_logs').insert({
        user_id: pipeline.userId,
        user_role: pipeline.userRole,
        input_text: pipeline.input,
        input_normalized: pipeline.normalizedInput,
        intent_type: pipeline.stages.intent?.intent,
        is_simulation: pipeline.stages.simulation?.isSimulation || false,
        simulation_params: pipeline.stages.simulation?.isCompound 
          ? { scenarios: pipeline.stages.simulation.scenarios }
          : null,
        confidence_level: Math.round((pipeline.stages.confidence?.totalScore || 0) * 100),
        confidence_factors: pipeline.stages.confidence?.factors,
        confidence_delta: pipeline.stages.confidence?.simulationPenalty || null,
        risk_score: Math.round((pipeline.stages.risk?.totalScore || 0) * 100),
        claims_extracted: pipeline.stages.validation?.claims,
        validation_result: pipeline.stages.validation,
        conflict_detected: pipeline.stages.conflictDetection?.hasConflicts || false,
        conflict_details: pipeline.stages.conflictDetection?.conflicts,
        derived_metrics: pipeline.stages.derivedMetrics?.metrics,
        created_at: pipeline.timestamp
      });
    } catch (e) {
      console.error('Failed to log interaction:', e);
    }
  }

  async getCommandOverview() {
    const [risks, recentLogs, stats] = await Promise.all([
      riskEngine.getProjectRisks(),
      this.getRecentLogs(),
      this.getStats()
    ]);

    return {
      overview: {
        activeRisks: risks.filter(r => r.level !== 'low').length,
        criticalAlerts: risks.filter(r => r.level === 'critical').length,
        aiInteractionsToday: stats?.todayCount || 0,
        avgConfidence: stats?.avgConfidence || 0
      },
      topRisks: risks.slice(0, 5),
      recentActivity: recentLogs.slice(0, 10)
    };
  }

  async getRecentLogs() {
    const { data } = await supabase
      .from('ai_interaction_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    return data || [];
  }

  async getStats() {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('ai_interaction_logs')
      .select('confidence_score')
      .gte('created_at', today);

    const todayCount = data?.length || 0;
    const avgConfidence = data?.length > 0
      ? data.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / data.length
      : 0;

    return { todayCount, avgConfidence };
  }
}

export const aiCommandOrchestrator = new AICommandOrchestrator();
export default AICommandOrchestrator;
