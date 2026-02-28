// ============================================
// SIMULATION ENGINE
// Handles hypothetical scenarios with real calculations
// ============================================

import { supabase } from '../data/supabase';

class SimulationEngine {
  
  constructor() {
    this.scenarios = {
      hire_worker: {
        name: 'Hire Workers',
        calculate: this.calculateWorkerHire.bind(this)
      },
      hire_supervisor: {
        name: 'Hire Supervisors',
        calculate: this.calculateSupervisorHire.bind(this)
      },
      new_project: {
        name: 'New Project',
        calculate: this.calculateNewProject.bind(this)
      },
      cash_projection: {
        name: 'Cash Flow Projection',
        calculate: this.calculateCashProjection.bind(this)
      }
    };
  }
  
  // Detect if input is a simulation request
  detectSimulation(userInput) {
    const keywords = ['if we', 'assume', 'what if', 'suppose', 'hypothetically', 'could we', 'should we'];
    const input = userInput.toLowerCase();
    
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        const scenarios = this.identifyAllScenarios(input);
        return {
          isSimulation: true,
          scenarios,
          isCompound: scenarios.length > 1,
          primaryScenario: scenarios[0]
        };
      }
    }
    
    return { isSimulation: false, scenarios: [], isCompound: false, primaryScenario: null };
  }

  identifyAllScenarios(input) {
    const detected = [];
    
    if (input.includes('hire') && (input.includes('worker') || input.includes('staff') || input.includes('labour'))) {
      detected.push('hire_worker');
    }
    if (input.includes('hire') && (input.includes('supervisor') || input.includes('manager') || input.includes('foreman'))) {
      detected.push('hire_supervisor');
    }
    if (input.includes('new project') || input.includes('add project') || input.includes('start project')) {
      detected.push('new_project');
    }
    if (input.includes('cash flow') || input.includes('cash projection') || input.includes('runway') || input.includes('cash shortage')) {
      detected.push('cash_projection');
    }
    if (input.includes('material') && (input.includes('overuse') || input.includes('waste') || input.includes('shortage'))) {
      detected.push('material_overuse');
    }
    if ((input.includes('pay') || input.includes('payment')) && (input.includes('overdue') || input.includes('late') || input.includes('delayed'))) {
      detected.push('overdue_payment');
    }
    if (input.includes('delay') || input.includes('late') || input.includes('behind schedule')) {
      detected.push('project_delay');
    }
    
    return detected.length > 0 ? detected : ['general'];
  }
  
  identifyScenario(input) {
    const scenarios = this.identifyAllScenarios(input);
    return scenarios[0] || 'general';
  }
  
  // Extract parameters from user input
  extractParameters(userInput, scenario) {
    const params = {};
    const input = userInput.toLowerCase();
    
    // Extract number of units
    const numberMatch = input.match(/(\d+)\s*(?:new|more|additional|extra)?/);
    if (numberMatch) {
      params.count = parseInt(numberMatch[1]);
    }
    
    // Extract time period
    if (input.includes('month')) params.period = 'month';
    if (input.includes('year')) params.period = 'year';
    
    // Extract specific role or type
    if (scenario === 'hire_worker') {
      if (input.includes('mason')) params.role = 'Mason';
      else if (input.includes('carpenter')) params.role = 'Carpenter';
      else if (input.includes('labour')) params.role = 'Labour';
      else params.role = 'General';
    }
    
    return params;
  }
  
  async calculateWorkerHire(params) {
    const result = {
      scenario: 'hire_worker',
      description: `${params.count || 1} additional workers`,
      calculations: [],
      monthlyImpact: 0,
      annualImpact: 0,
      recommendations: []
    };
    
    // Get average worker cost from DB
    const { data: worker } = await supabase
      .from('workers')
      .select('dailyRate')
      .limit(1)
      .single();
    
    const dailyRate = worker?.dailyRate || 3500;
    const monthlyCost = dailyRate * 26; // 26 working days
    const annualCost = monthlyCost * 12;
    
    result.calculations.push({
      label: 'Average Daily Rate',
      value: `LKR ${dailyRate.toLocaleString()}`,
      detail: 'per worker'
    });
    
    const count = params.count || 1;
    result.monthlyImpact = monthlyCost * count;
    result.annualImpact = annualCost * count;
    
    result.calculations.push({
      label: 'Monthly Cost Impact',
      value: `LKR ${result.monthlyImpact.toLocaleString()}`,
      detail: `${count} workers × ${dailyRate}/day × 26 days`
    });
    
    result.calculations.push({
      label: 'Annual Cost Impact',
      value: `LKR ${result.annualImpact.toLocaleString()}`,
      detail: '12 months × monthly impact'
    });
    
    // Productivity impact
    const productivityGain = count * 1.0; // 1% productivity per worker
    result.calculations.push({
      label: 'Productivity Gain',
      value: `+${productivityGain.toFixed(1)}%`,
      detail: 'Estimated efficiency improvement'
    });
    
    // Get current cash position
    const { data: finance } = await supabase
      .from('finance_snapshot_daily')
      .select('cash_balance')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();
    
    const cashBalance = finance?.cash_balance || 0;
    const runwayMonths = cashBalance / (result.monthlyImpact || 1);
    
    result.calculations.push({
      label: 'Cash Runway Impact',
      value: `${runwayMonths.toFixed(1)} months`,
      detail: 'Current runway with new hires'
    });
    
    if (runwayMonths < 3) {
      result.recommendations.push({
        priority: 'high',
        text: 'Cash runway drops below 3 months with new hires'
      });
    }
    
    return result;
  }
  
  async calculateSupervisorHire(params) {
    const result = {
      scenario: 'hire_supervisor',
      description: `${params.count || 1} additional supervisors`,
      calculations: [],
      monthlyImpact: 0,
      annualImpact: 0,
      recommendations: []
    };
    
    // Supervisor salary (estimated)
    const monthlySalary = 150000;
    const annualCost = monthlySalary * 12;
    
    const count = params.count || 1;
    result.monthlyImpact = monthlySalary * count;
    result.annualImpact = annualCost * count;
    
    result.calculations.push({
      label: 'Monthly Salary',
      value: `LKR ${monthlySalary.toLocaleString()}`,
      detail: 'per supervisor'
    });
    
    result.calculations.push({
      label: 'Annual Cost Impact',
      value: `LKR ${result.annualImpact.toLocaleString()}`,
      detail: `${count} supervisors × LKR ${monthlySalary}/month × 12`
    });
    
    // Efficiency multiplier (5 workers per supervisor)
    const efficiencyGain = count * 5;
    result.calculations.push({
      label: 'Worker Capacity Gain',
      value: `+${efficiencyGain} workers`,
      detail: 'Can manage 5 additional workers per supervisor'
    });
    
    // Ratio check
    const { data: workers } = await supabase.from('workers').select('id', { count: 'exact', head: true });
    const { data: supervisors } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'Site Supervisor');
    
    const currentWorkers = workers?.count || 0;
    const currentSupervisors = supervisors?.count || 0;
    const newSupervisors = currentSupervisors + count;
    const ratio = currentWorkers / (newSupervisors || 1);
    
    result.calculations.push({
      label: 'Supervisor Ratio',
      value: `${ratio.toFixed(1)}:1`,
      detail: `${currentWorkers} workers / ${newSupervisors} supervisors`
    });
    
    if (ratio > 15) {
      result.recommendations.push({
        priority: 'medium',
        text: 'Consider more supervisors if ratio exceeds 15:1'
      });
    }
    
    return result;
  }
  
  async calculateNewProject(params) {
    const result = {
      scenario: 'new_project',
      description: 'New construction project',
      calculations: [],
      upfrontCost: 0,
      monthlyImpact: 0,
      recommendations: []
    };
    
    // Estimate based on average project cost
    const { data: projects } = await supabase
      .from('projects')
      .select('estimatedCost')
      .eq('status', 'Ongoing');
    
    const avgCost = projects?.reduce((sum, p) => sum + (p.estimatedCost || 0), 0) / (projects?.length || 1) || 1000000;
    const upfrontCost = avgCost * 0.3; // 30% upfront
    const monthlyCost = avgCost / 12; // Spread over a year
    
    result.upfrontCost = upfrontCost;
    result.monthlyImpact = monthlyCost;
    
    result.calculations.push({
      label: 'Estimated Upfront Cost',
      value: `LKR ${upfrontCost.toLocaleString()}`,
      detail: '30% of estimated project cost'
    });
    
    result.calculations.push({
      label: 'Monthly Cash Requirement',
      value: `LKR ${monthlyCost.toLocaleString()}`,
      detail: 'Spread over 12 months'
    });
    
    // Check cash impact
    const { data: finance } = await supabase
      .from('finance_snapshot_daily')
      .select('cash_balance')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();
    
    const cashBalance = finance?.cash_balance || 0;
    
    if (upfrontCost > cashBalance * 0.5) {
      result.recommendations.push({
        priority: 'high',
        text: 'Upfront cost exceeds 50% of current cash - review financing options'
      });
    }
    
    return result;
  }
  
  async calculateCashProjection(params) {
    const result = {
      scenario: 'cash_projection',
      description: 'Cash flow projection',
      calculations: [],
      recommendations: []
    };
    
    // Get current financial data
    const { data: finance } = await supabase
      .from('finance_snapshot_daily')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(30)
      .order('snapshot_date', { ascending: true });
    
    if (!finance || finance.length === 0) {
      return {
        ...result,
        error: 'No financial data available'
      };
    }
    
    // Calculate burn rate
    const recentData = finance.slice(-14); // Last 14 days
    const totalExpenses = recentData.reduce((sum, d) => sum + (d.total_expenses || 0), 0);
    const avgDailyBurn = totalExpenses / recentData.length;
    
    const { data: current } = await supabase
      .from('finance_snapshot_daily')
      .select('cash_balance')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();
    
    const cashBalance = current?.cash_balance || 0;
    const runwayDays = cashBalance / (avgDailyBurn || 1);
    const runwayMonths = runwayDays / 30;
    
    result.calculations.push({
      label: 'Current Cash Balance',
      value: `LKR ${cashBalance.toLocaleString()}`,
      detail: 'As of latest snapshot'
    });
    
    result.calculations.push({
      label: 'Average Daily Burn Rate',
      value: `LKR ${avgDailyBurn.toLocaleString()}`,
      detail: 'Last 14 days average'
    });
    
    result.calculations.push({
      label: 'Cash Runway',
      value: `${runwayDays.toFixed(0)} days (${runwayMonths.toFixed(1)} months)`,
      detail: 'Days until cash depleted at current burn rate'
    });
    
    if (runwayMonths < 3) {
      result.recommendations.push({
        priority: 'critical',
        text: 'Cash runway below 3 months - immediate action required'
      });
    } else if (runwayMonths < 6) {
      result.recommendations.push({
        priority: 'high',
        text: 'Cash runway below 6 months - consider cost optimization'
      });
    }
    
    // Project forward
    const projections = [1, 3, 6].map(months => ({
      months,
      projectedBalance: cashBalance - (avgDailyBurn * 30 * months)
    }));
    
    result.calculations.push({
      label: 'Projected Balances',
      projections,
      detail: 'Based on current burn rate'
    });
    
    return result;
  }
  
  // Main execution
  async execute(userInput) {
    const detection = this.detectSimulation(userInput);
    
    if (!detection.isSimulation) {
      return { isSimulation: false };
    }

    const params = this.extractParameters(userInput, detection.primaryScenario);
    
    // Handle compound scenarios
    if (detection.isCompound && detection.scenarios.length > 1) {
      const compoundResults = [];
      let combinedImpact = 0;
      
      for (const scenarioType of detection.scenarios) {
        const calculator = this.scenarios[scenarioType];
        if (calculator) {
          const result = await calculator.calculate(params);
          compoundResults.push({
            scenario: scenarioType,
            ...result
          });
          combinedImpact += result.monthlyImpact || result.upfrontCost || 0;
        }
      }
      
      return {
        isSimulation: true,
        isCompound: true,
        scenarios: detection.scenarios,
        compoundResults,
        combinedMonthlyImpact: combinedImpact,
        description: `Compound simulation: ${detection.scenarios.join(' + ')}`,
        calculations: compoundResults.flatMap(r => r.calculations || []),
        recommendations: compoundResults.flatMap(r => r.recommendations || []),
        confidencePenalty: true,
        warning: '⚠️ COMPOUND SIMULATION - Multiple scenarios combined. Results have higher uncertainty.',
        compoundNote: 'Confidence reduced due to compound scenario complexity'
      };
    }
    
    const calculator = this.scenarios[detection.primaryScenario];
    
    if (!calculator) {
      return {
        isSimulation: true,
        error: 'Scenario not supported for simulation'
      };
    }
    
    const result = await calculator.calculate(params);
    
    return {
      isSimulation: true,
      ...result,
      isCompound: false,
      warning: '⚠️ SIMULATION MODE - Not committed to system records'
    };
  }
}

export const simulationEngine = new SimulationEngine();
export default SimulationEngine;
