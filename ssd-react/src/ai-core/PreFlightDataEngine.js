import { supabase } from '../data/supabase';

class PreFlightDataEngine {
  constructor() {}

  async fetchAllLiveData(query = '') {
    const [workers, projects, materials, suppliers, clients, finance, system, 
            attendance, leaveRequests, incidents, dailyReports, holidays] = await Promise.all([
      this.fetchWorkers(),
      this.fetchProjects(),
      this.fetchMaterials(),
      this.fetchSuppliers(),
      this.fetchClients(),
      this.fetchFinance(),
      this.fetchSystemSnapshot(),
      this.fetchAttendance(),
      this.fetchLeaveRequests(),
      this.fetchIncidents(),
      this.fetchDailyReports(),
      this.fetchHolidays()
    ]);

    const attendanceByDate = this.summarizeAttendance(attendance);
    const financeComputed = this.computeFinance(finance, system);

    return {
      workers,
      projects,
      materials,
      suppliers,
      clients,
      finance: financeComputed,
      system,
      attendance,
      attendanceByDate,
      leaveRequests,
      incidents,
      dailyReports,
      holidays,
      metadata: {
        fetchedAt: new Date().toISOString(),
        query,
        stats: {
          totalWorkers: workers?.length || 0,
          totalProjects: projects?.length || 0,
          totalMaterials: materials?.length || 0,
          totalSuppliers: suppliers?.length || 0,
          totalClients: clients?.length || 0,
          totalAttendance: attendance?.length || 0
        }
      }
    };
  }

  summarizeAttendance(attendance) {
    if (!attendance || attendance.length === 0) {
      return { total: 0, present: 0, absent: 0, noRecord: 0, byDate: {} };
    }

    const byDate = {};
    const allDates = [...new Set(attendance.map(a => a.date))].sort().reverse().slice(0, 7);

    for (const date of allDates) {
      const dayAttendance = attendance.filter(a => a.date === date);
      byDate[date] = {
        total: dayAttendance.length,
        present: dayAttendance.filter(a => a.isPresent || a.status === 'Present').length,
        absent: dayAttendance.filter(a => !a.isPresent || a.status === 'Absent').length
      };
    }

    const latestDate = allDates[0];
    const todayRecord = attendance.filter(a => a.date === latestDate);

    return {
      total: attendance.length,
      present: todayRecord.filter(a => a.isPresent || a.status === 'Present').length,
      absent: todayRecord.filter(a => !a.isPresent || a.status === 'Absent').length,
      noRecord: 0,
      latestDate,
      byDate
    };
  }

  computeFinance(finance, system) {
    const cashBalance = system?.cash_balance || finance?.cash_balance || 0;
    const totalIncome = system?.total_money_in || finance?.total_income || 0;
    const totalExpenses = system?.total_money_out || finance?.total_expenses || 0;
    const profit = totalIncome - totalExpenses;

    return {
      cash_balance: cashBalance,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      profit,
      loss: profit < 0 ? Math.abs(profit) : 0,
      net_flow: profit,
      pending_payments: system?.pending_payments || finance?.pending_payments_value || 0
    };
  }

  async fetchWorkers() {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.warn('Workers fetch error:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('Workers fetch failed:', e);
      return [];
    }
  }

  async fetchAttendance() {
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('*, worker:workers(id, fullName, role)')
        .order('date', { ascending: false })
        .limit(500);
      
      if (error) {
        console.warn('Attendance fetch error:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('Attendance fetch failed:', e);
      return [];
    }
  }

  async fetchProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Projects fetch error:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('Projects fetch failed:', e);
      return [];
    }
  }

  async fetchMaterials() {
    try {
      const { data } = await supabase
        .from('materials')
        .select('*')
        .limit(100);
      return data || [];
    } catch (e) {
      console.warn('Materials fetch failed:', e);
      return [];
    }
  }

  async fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(50);
      if (error) console.warn('Suppliers fetch error:', error);
      return data || [];
    } catch (e) {
      console.warn('Suppliers fetch failed:', e);
      return [];
    }
  }

  async fetchClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) console.warn('Clients fetch error:', error);
      return data || [];
    } catch (e) {
      console.warn('Clients fetch failed:', e);
      return [];
    }
  }

  async fetchFinance() {
    try {
      let { data } = await supabase
        .from('finance_snapshot_daily')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();
      return data || null;
    } catch (e) {
      return null;
    }
  }

  async fetchSystemSnapshot() {
    try {
      const { data } = await supabase
        .from('system_snapshot_daily')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();
      return data;
    } catch (e) {
      return null;
    }
  }

  async fetchLeaveRequests() {
    try {
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    } catch (e) {
      return [];
    }
  }

  async fetchIncidents() {
    try {
      const { data } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    } catch (e) {
      return [];
    }
  }

  async fetchDailyReports() {
    try {
      const { data } = await supabase
        .from('daily_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    } catch (e) {
      return [];
    }
  }

  async fetchHolidays() {
    try {
      const { data } = await supabase
        .from('holidays')
        .select('*')
        .order('holiday_date', { ascending: true });
      return data || [];
    } catch (e) {
      console.warn('Holidays fetch failed:', e);
      return [];
    }
  }

  // ===== CEO-LEVEL ANALYSIS ENGINE =====

  async getCachedAnalysis() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('ai_daily_snapshots')
        .select('*')
        .eq('analysis_date', today)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if snapshot is less than 1 hour old
      const generatedAt = new Date(data.generated_at);
      const now = new Date();
      const hoursDiff = (now - generatedAt) / (1000 * 60 * 60);

      if (hoursDiff > 1) {
        return null; // Snapshot is stale
      }

      return data;
    } catch (e) {
      console.warn('Get cached analysis failed:', e);
      return null;
    }
  }

  async generateHourlyAnalysis() {
    try {
      console.log('[PreFlight] Generating new CEO-level analysis...');
      
      // Fetch all live data
      const liveData = await this.fetchAllLiveData();
      
      // Get previous snapshot for trend comparison
      const previousSnapshot = await this.getPreviousSnapshot();

      // Generate comprehensive CEO-level analysis
      const analysis = this.computeCEOAnalysis(liveData, previousSnapshot);

      // Save to database
      await this.saveAnalysis(analysis);

      console.log('[PreFlight] CEO analysis generated successfully');
      return analysis;
    } catch (e) {
      console.error('[PreFlight] Generate analysis failed:', e);
      return null;
    }
  }

  async getPreviousSnapshot() {
    try {
      const { data } = await supabase
        .from('ai_daily_snapshots')
        .select('snapshot_data, analysis_date')
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single();
      return data?.snapshot_data || null;
    } catch (e) {
      return null;
    }
  }

  computeCEOAnalysis(liveData, previousData) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Compute attendance metrics
    const att = liveData.attendanceByDate || {};
    const todayPresent = att.present || 0;
    const todayAbsent = att.absent || 0;
    const totalWorkers = liveData.workers?.length || 0;
    const attendanceRate = totalWorkers > 0 ? Math.round((todayPresent / totalWorkers) * 100) : 0;

    // Compute finance metrics
    const fin = liveData.finance || {};
    const cashBalance = fin.cash_balance || 0;
    const profit = fin.profit || 0;
    const income = fin.total_income || 0;
    const expenses = fin.total_expenses || 0;

    // Compute project health
    const projects = liveData.projects || [];
    const onTrackProjects = projects.filter(p => p.progress >= 80).length;
    const delayedProjects = projects.filter(p => p.progress < 50 && p.status !== 'Completed').length;
    const criticalProjects = projects.filter(p => p.status === 'On Hold' || p.status === 'Cancelled').length;

    // Compute trends (compare with previous snapshot)
    const trends = this.computeTrends(liveData, previousData);

    // Generate AI predictions
    const predictions = this.generatePredictions(liveData, trends);

    // Generate CEO insights
    const insights = this.generateInsights(liveData, trends, {
      attendanceRate,
      onTrackProjects,
      delayedProjects,
      profit
    });

    // Generate action items
    const actionItems = this.generateActionItems(liveData, {
      attendanceRate,
      delayedProjects,
      cashBalance,
      profit
    });

    // Identify alerts
    const alerts = this.identifyAlerts(liveData, {
      attendanceRate,
      cashBalance,
      delayedProjects,
      profit
    });

    // Build key metrics for quick display
    const keyMetrics = {
      workers: {
        total: totalWorkers,
        present: todayPresent,
        absent: todayAbsent,
        attendanceRate
      },
      projects: {
        total: projects.length,
        onTrack: onTrackProjects,
        delayed: delayedProjects,
        critical: criticalProjects
      },
      finance: {
        cashBalance,
        profit,
        income,
        expenses,
        profitMargin: income > 0 ? Math.round((profit / income) * 100) : 0
      }
    };

    return {
      analysis_date: today,
      generated_at: now.toISOString(),
      snapshot_data: {
        workers: liveData.workers,
        projects: liveData.projects,
        materials: liveData.materials,
        suppliers: liveData.suppliers,
        clients: liveData.clients,
        attendance: liveData.attendance,
        attendanceByDate: att,
        leaveRequests: liveData.leaveRequests,
        incidents: liveData.incidents,
        dailyReports: liveData.dailyReports,
        holidays: liveData.holidays,
        finance: fin
      },
      key_metrics: keyMetrics,
      trends,
      predictions,
      insights,
      action_items: actionItems,
      alerts,
      metadata: {
        totalWorkers,
        totalProjects: projects.length,
        totalAttendance: liveData.attendance?.length || 0,
        generatedAt: now.toISOString()
      }
    };
  }

  computeTrends(liveData, previousData) {
    const trends = {};

    // Attendance trend
    const currentAtt = liveData.attendanceByDate || {};
    const prevAtt = previousData?.key_metrics?.workers || {};
    
    if (prevAtt.attendanceRate) {
      const diff = currentAtt.present - prevAtt.present;
      if (diff > 2) trends.attendance = 'improving';
      else if (diff < -2) trends.attendance = 'declining';
      else trends.attendance = 'stable';
    }

    // Finance trend
    const currentFin = liveData.finance || {};
    const prevFin = previousData?.key_metrics?.finance || {};
    
    if (prevFin.profit) {
      const diff = currentFin.profit - prevFin.profit;
      if (diff > 10000) trends.finance = 'improving';
      else if (diff < -10000) trends.finance = 'declining';
      else trends.finance = 'stable';
    }

    // Project trend
    const currentProjects = liveData.projects?.length || 0;
    const prevProjects = previousData?.key_metrics?.projects?.total || 0;
    trends.projects = currentProjects >= prevProjects ? 'stable' : 'declining';

    return trends;
  }

  generatePredictions(liveData, trends) {
    const predictions = [];

    // Predict attendance issues
    const attByDate = liveData.attendanceByDate?.byDate || {};
    const dates = Object.keys(attByDate).sort().reverse().slice(0, 3);
    let consecutiveAbsent = 0;
    
    for (const date of dates) {
      if (attByDate[date].absent > attByDate[date].present * 0.2) {
        consecutiveAbsent++;
      }
    }

    if (consecutiveAbsent >= 2) {
      predictions.push({
        type: 'attendance',
        message: 'High absence rate detected for 2+ days - may indicate morale issues or site problems',
        severity: 'medium'
      });
    }

    // Predict cash flow issues
    const fin = liveData.finance || {};
    if (fin.profit < 0) {
      predictions.push({
        type: 'finance',
        message: 'Current month showing loss - expect cash flow pressure in next 2 weeks',
        severity: 'high'
      });
    }

    // Predict project delays
    const delayed = liveData.projects?.filter(p => p.progress < 50 && p.status !== 'Completed') || [];
    if (delayed.length > 0) {
      predictions.push({
        type: 'projects',
        message: `${delayed.length} project(s) behind schedule - may impact client satisfaction and payments`,
        severity: 'medium'
      });
    }

    return predictions;
  }

  generateInsights(liveData, trends, metrics) {
    const insights = [];

    // Attendance insight
    if (metrics.attendanceRate >= 90) {
      insights.push('Excellent attendance this week - team engagement is strong');
    } else if (metrics.attendanceRate < 75) {
      insights.push('Attendance below target - recommend supervisor review and worker interviews');
    }

    // Finance insight
    if (metrics.profit > 0) {
      insights.push(`Profitable month so far with LKR ${metrics.profit.toLocaleString()} net profit`);
    } else {
      insights.push('Operating at a loss this month - review expense categories for cost reduction');
    }

    // Project insight
    if (metrics.delayedProjects === 0) {
      insights.push('All projects are on track - great execution by teams');
    } else {
      insights.push(`${metrics.delayedProjects} project(s) need attention - schedule review with project managers`);
    }

    // Trend-based insight
    if (trends.attendance === 'declining') {
      insights.push('Attendance trending downward - investigate root causes immediately');
    }
    if (trends.finance === 'improving') {
      insights.push('Financial performance improving - continue current cost management practices');
    }

    return insights;
  }

  generateActionItems(liveData, metrics) {
    const actionItems = [];

    // High priority: Attendance issues
    if (metrics.attendanceRate < 80) {
      actionItems.push({
        priority: 'high',
        task: 'Address low attendance - schedule meeting with site supervisors',
        category: 'attendance'
      });
    }

    // High priority: Finance issues
    if (metrics.cashBalance < 500000) {
      actionItems.push({
        priority: 'high',
        task: 'Low cash balance - expedite pending payments from clients',
        category: 'finance'
      });
    }

    if (metrics.profit < 0) {
      actionItems.push({
        priority: 'high',
        task: 'Review and reduce non-essential expenses immediately',
        category: 'finance'
      });
    }

    // Medium priority: Delayed projects
    if (metrics.delayedProjects > 0) {
      actionItems.push({
        priority: 'medium',
        task: `Review ${metrics.delayedProjects} delayed project(s) timeline and resources`,
        category: 'projects'
      });
    }

    // Medium priority: Leave requests
    const pendingLeave = liveData.leaveRequests?.filter(l => l.status === 'Pending') || [];
    if (pendingLeave.length > 0) {
      actionItems.push({
        priority: 'medium',
        task: `Review ${pendingLeave.length} pending leave request(s)`,
        category: 'hr'
      });
    }

    return actionItems;
  }

  identifyAlerts(liveData, metrics) {
    const alerts = [];

    // Critical: Very low attendance
    if (metrics.attendanceRate < 60) {
      alerts.push({
        severity: 'critical',
        category: 'attendance',
        title: 'Critical Attendance Low',
        message: `Only ${metrics.attendanceRate}% attendance - immediate investigation required`
      });
    }

    // Critical: Negative cash balance
    if (metrics.cashBalance < 0) {
      alerts.push({
        severity: 'critical',
        category: 'finance',
        title: 'Negative Cash Balance',
        message: 'Company is in debt - urgent financial review needed'
      });
    }

    // High: Many delayed projects
    if (metrics.delayedProjects > 3) {
      alerts.push({
        severity: 'high',
        category: 'projects',
        title: 'Multiple Delayed Projects',
        message: `${metrics.delayedProjects} projects behind schedule - client satisfaction at risk`
      });
    }

    return alerts;
  }

  async saveAnalysis(analysis) {
    try {
      const today = analysis.analysis_date;

      // Upsert: update if exists for today, insert if not
      const { error } = await supabase
        .from('ai_daily_snapshots')
        .upsert({
          analysis_date: today,
          snapshot_data: analysis.snapshot_data,
          key_metrics: analysis.key_metrics,
          alerts: analysis.alerts,
          generated_at: new Date().toISOString()
        }, {
          onConflict: 'analysis_date'
        });

      if (error) {
        console.warn('[PreFlight] Save analysis error:', error);
      }
    } catch (e) {
      console.error('[PreFlight] Save analysis failed:', e);
    }
  }

  // Public method: Get analysis (cached or generate new)
  async getCEOAnalysis(forceRefresh = false) {
    // Try to get cached analysis
    if (!forceRefresh) {
      const cached = await this.getCachedAnalysis();
      if (cached) {
        console.log('[PreFlight] Using cached CEO analysis');
        return {
          ...cached.snapshot_data,
          key_metrics: cached.key_metrics,
          alerts: cached.alerts,
          generated_at: cached.generated_at,
          isCached: true
        };
      }
    }

    // Generate new analysis
    const analysis = await this.generateHourlyAnalysis();
    if (analysis) {
      return {
        ...analysis.snapshot_data,
        key_metrics: analysis.key_metrics,
        trends: analysis.trends,
        predictions: analysis.predictions,
        insights: analysis.insights,
        action_items: analysis.action_items,
        alerts: analysis.alerts,
        generated_at: analysis.generated_at,
        isCached: false
      };
    }

    // Fallback to live data
    return await this.fetchAllLiveData();
  }
}

export const preFlightDataEngine = new PreFlightDataEngine();
export default PreFlightDataEngine;
