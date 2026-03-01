// ============================================
// ENTITY RESOLVER ENGINE
// Breaks natural queries into atomic entities + attributes + time
// Now with Sinhala/Singlish support - ON-DEMAND LOADING
// ============================================

class EntityResolverEngine {
  constructor() {
    this.entityPatterns = {
      worker: {
        keywords: [
          // English
          'worker', 'staff', 'employee', 'mason', 'carpenter', 'labour', 'labourer', 'supervisor', 'foreman', 'labourer',
          // Sinhala/Singlish
          'worker', 'workers', 'mason', 'mesan', 'labour', 'labourer', 'kamaru', 'kam karana', 
          'supervisor', 'supa wisar', 'foreman', 'furi man', 'කම්කරු', 'මේසන්', 'සුපවිසර්', 'ෆෝර්මන්', 
          'hba', 'oyaa', 'akka', 'thaththa', 'amma', 'mama', 'kam karana', 'nokay'
        ],
        tables: ['workers', 'worker_snapshot_daily', 'attendances'],
        attributes: ['name', 'attendance', 'present', 'absent', 'role', 'dailyRate', 'attendanceRate', 'project']
      },
      project: {
        keywords: [
          // English
          'project', 'construction', 'site', 'building', 'projects',
          // Sinhala/Singlish
          'project', 'site', 'construction', 'wala', 'land', 'idama', 'bim', 'ඉඩම', 'ව්‍යාපෘතිය', 
          'kandy', 'nuwara', 'jaffna', 'colombo', 'galle', 'anuradhapura', 'villa', 'bangalow'
        ],
        tables: ['projects', 'project_snapshot_daily', 'projectWorkers'],
        attributes: ['name', 'status', 'progress', 'budget', 'cost', 'deadline', 'supervisor', 'manager']
      },
      finance: {
        keywords: [
          // English
          'cash', 'money', 'balance', 'income', 'expense', 'payment', 'cost', 'budget', 'profit', 'loss',
          // Sinhala/Singlish
          'cash', 'money', 'salli', 'salih', 'balance', 'income', 'expense', 'payment', 'budget', 
          'profit', 'laba', 'loss', 'lss', 'lkr', 'rupees', 'rpees', 'මුදල්', 'ලාභය', 'අලාභය',
          'low', 'high', 'hadana', 'komu', 'thawal', 'labai'
        ],
        tables: ['finance_snapshot_daily'],
        attributes: ['cash_balance', 'total_income', 'total_expenses', 'net_flow', 'pending_payments']
      },
      material: {
        keywords: [
          // English
          'material', 'cement', 'steel', 'sand', 'aggregate', 'brick', 'tile', 'materials',
          // Sinhala/Singlish
          'material', 'cement', 'steel', 'sand', 'brick', 'tile', 'semen', 'thoppi', 'garani', 'thoppi'
        ],
        tables: ['material_requests', 'projectMaterials'],
        attributes: ['status', 'quantity', 'approved', 'pending', 'used', 'variance']
      },
      attendance: {
        keywords: [
          // English
          'attendance', 'present', 'absent', 'leave', 'present today', 'absent today', 'came', 'not came',
          // Sinhala/Singlish
          'attendance', 'present', 'absent', 'leave', 'innwda', 'innada', 'nahwda', 'nadda', 'ki denek',
          'yawana', 'yanne', 'na yan', 'Present', 'Absent', 'present today', 'absent today',
          'ඉන්න', 'නැතිනම්', 'යන', 'නොයන', 'යන එක', 'wada', 'wadama', 'march', '12', 'ekata',
          'awoth', 'nwda', 'kiyana'
        ],
        tables: ['worker_snapshot_daily', 'attendances'],
        attributes: ['is_present', 'attendance_rate', 'check_in', 'check_out']
      },
      alert: {
        keywords: [
          // English
          'alert', 'warning', 'issue', 'problem', 'risk', 'alerts',
          // Sinhala/Singlish
          'alert', 'warning', 'issue', 'problem', 'risk', 'prashna', 'problem', 'galpa', 'roga', '_warning'
        ],
        tables: ['ai_alerts', 'ai_events'],
        attributes: ['severity', 'category', 'status', 'created_at']
      },
      // NEW ENTITIES FOR GOD AI
      leave: {
        keywords: [
          // English
          'leave', 'holiday', 'vacation', 'day off', 'sick leave', 'annual leave', 'leave request',
          // Sinhala/Singlish
          'leave', 'niday', 'niwada', 'noday', 'holiday', 'nivadana', 'leave eka', 'niva',
          'නිවාඩු', 'නිවාඩුව', 'holiday', 'nivadana', 'ah菩萨ni'
        ],
        tables: ['leave_requests', 'worker_requests'],
        attributes: ['status', 'type', 'start_date', 'end_date', 'reason', 'approved']
      },
      advance: {
        keywords: [
          // English
          'advance', 'salary advance', 'loan', 'payment advance', 'request money',
          // Sinhala/Singlish
          'advance', 'kredi', 'loan', ' advance eka', 'salary advance', 'pauta', 'badu',
          'අදාර', 'ක්‍රෙඩිට්', 'loan', 'advance eka', 'salary'
        ],
        tables: ['advanceApplications', 'worker_requests'],
        attributes: ['amount', 'status', 'requested_date', 'reason', 'approved']
      },
      order: {
        keywords: [
          // English
          'order', 'orders', 'purchase', 'supplier order', 'material order', 'buy',
          // Sinhala/Singlish
          'order', 'orders', 'purchase', 'buy', 'order eka', 'kirima', 'ganna',
          'order', 'buy', 'kirima', ' supplier'
        ],
        tables: ['orders'],
        attributes: ['order_number', 'status', 'supplier', 'total', 'items', 'date']
      },
      incident: {
        keywords: [
          // English
          'incident', 'accident', 'injury', 'issue', 'problem', 'danger', 'safety', 'accident eka',
          // Sinhala/Singlish
          'incident', 'accident', 'injury', 'problem', 'prashna', 'galpa', 'roga', 'balanna',
          'accident', 'issue', 'prashna', 'kriya', 'kriyaman'
        ],
        tables: ['incidents'],
        attributes: ['type', 'severity', 'description', 'date', 'location', 'reported_by']
      },
      report: {
        keywords: [
          // English
          'report', 'daily report', 'site report', 'progress report', 'report eka', 'wadakarta',
          // Sinhala/Singlish
          'report', 'daily report', 'site report', 'wadakarta', 'report eka', 'kriyawa',
          'report', 'wadakarta', 'daily', 'kandayama'
        ],
        tables: ['daily_reports'],
        attributes: ['date', 'project_id', 'summary', 'workers_present', 'work_done', 'issues']
      },
      task: {
        keywords: [
          // English
          'task', 'tasks', 'work', 'job', 'assignment', 'to do', 'pending work',
          // Sinhala/Singlish
          'task', 'tasks', 'work', 'wada', 'kama', 'karanne', 'karanawa', 'task eka',
          'wada', 'kama', 'karana', 'task', 'job'
        ],
        tables: ['project_tasks'],
        attributes: ['title', 'status', 'assigned_to', 'due_date', 'progress', 'priority']
      },
      profile: {
        keywords: [
          // English
          'user', 'users', 'admin', 'manager', 'supervisor', 'account', 'profile',
          // Sinhala/Singlish
          'user', 'users', 'admin', 'manager', 'supervisor', 'account', 'profile', ' owner',
          'admin', 'manager', 'supervisor', 'account', 'owner', 'boss'
        ],
        tables: ['profiles'],
        attributes: ['full_name', 'email', 'role', 'phone', 'assigned_site']
      },
      subcontractor: {
        keywords: [
          // English
          'subcontractor', 'contractor', 'supplier', 'vendor', 'party',
          // Sinhala/Singlish
          'subcontractor', 'contractor', 'supplier', 'vendor', 'party', 'sub',
          'contractor', 'supplier', 'vendor'
        ],
        tables: ['subcontractor_claims'],
        attributes: ['name', 'amount', 'status', 'project', 'claim_date', 'approved']
      },
      client: {
        keywords: [
          // English
          'client', 'clients', 'customer', 'customer', 'buyer',
          // Sinhala/Singlish
          'client', 'customers', 'buyer', 'kirema', 'client eka', 'balanna',
          'client', 'customer', 'buyer', 'harakarana'
        ],
        tables: ['clients'],
        attributes: ['name', 'company', 'email', 'phone', 'contact_person', 'status']
      },
      supplier: {
        keywords: [
          // English
          'supplier', 'suppliers', 'vendor', 'seller',
          // Sinhala/Singlish
          'supplier', 'vendors', 'seller', 'kirema wala', 'supplier eka',
          'supplier', 'vendor', 'seller', 'kirema', 'gna'
        ],
        tables: ['suppliers'],
        attributes: ['name', 'company', 'materials', 'email', 'phone', 'status']
      },
      holiday: {
        keywords: [
          // English
          'holiday', 'holidays', 'vacation', 'day off', 'poya', 'festival',
          // Sinhala/Singlish
          'holiday', 'holidays', 'nivadana', 'nivada', 'poya', 'estivala',
          'holiday', 'nivadana', 'poya', ' festival', 'laha'
        ],
        tables: ['holidays'],
        attributes: ['name', 'date', 'type', 'status']
      }
    };

    this.timePatterns = {
      // English
      'today': { days: 0, hours: 0 },
      'yesterday': { days: 1, hours: 0 },
      'this week': { days: 7, hours: 0 },
      'last week': { days: 7, hours: 0 },
      'this month': { days: 30, hours: 0 },
      'last month': { days: 30, hours: 0 },
      // Sinhala/Singlish
      'hengata': { days: 1, hours: 0 },
      'hinaheta': { days: 1, hours: 0 },
      'epa': { days: 0, hours: 0 },
      'etha': { days: 0, hours: 0 },
      'this wela': { days: 7, hours: 0 },
      'last wela': { days: 7, hours: 0 },
      'month eka': { days: 30, hours: 0 }
    };
  }

  resolveEntities(userInput) {
    const normalized = userInput.toLowerCase();
    const resolved = {
      entities: [],
      attributes: [],
      timeContext: null,
      intent: null,
      rawQuery: userInput
    };

    // Detect entities
    for (const [entityType, config] of Object.entries(this.entityPatterns)) {
      for (const keyword of config.keywords) {
        if (normalized.includes(keyword)) {
          resolved.entities.push({
            type: entityType,
            tables: config.tables,
            confidence: this.calculateEntityConfidence(normalized, keyword)
          });
          break;
        }
      }
    }

    // Detect attributes
    resolved.attributes = this.extractAttributes(normalized);

    // Detect time context
    resolved.timeContext = this.extractTimeContext(normalized);

    // Detect query intent
    resolved.intent = this.detectQueryIntent(normalized);

    return resolved;
  }

  calculateEntityConfidence(query, keyword) {
    const count = (query.match(new RegExp(keyword, 'gi')) || []).length;
    return Math.min(0.5 + (count * 0.1), 1);
  }

  extractAttributes(query) {
    const attributes = [];
    
    const attributePatterns = {
      'who': ['name', 'worker', 'person'],
      'what': ['status', 'name', 'details'],
      'how many': ['count', 'total', 'number'],
      'how much': ['amount', 'total', 'balance', 'cost'],
      'present': ['is_present', 'attendance'],
      'absent': ['is_absent', 'absent'],
      'attendance': ['attendance_rate', 'present_today'],
      'cash': ['cash_balance', 'balance'],
      'budget': ['budget', 'estimatedCost', 'totalSpent'],
      'progress': ['progress', 'percentage', 'completion'],
      'supervisor': ['supervisor', 'assigned_supervisor'],
      'status': ['status', 'state']
    };

    for (const [pattern, attrs] of Object.entries(attributePatterns)) {
      if (query.includes(pattern)) {
        attributes.push(...attrs);
      }
    }

    return [...new Set(attributes)];
  }

  extractTimeContext(query) {
    for (const [timePhrase, duration] of Object.entries(this.timePatterns)) {
      if (query.includes(timePhrase)) {
        return {
          phrase: timePhrase,
          ...duration,
          referenceDate: new Date().toISOString()
        };
      }
    }
    return {
      phrase: 'today',
      days: 0,
      hours: 0,
      referenceDate: new Date().toISOString()
    };
  }

  detectQueryIntent(query) {
    if (query.startsWith('who')) return 'lookup';
    if (query.startsWith('what') && query.includes('status')) return 'status';
    if (query.startsWith('how many') || query.startsWith('how much')) return 'aggregation';
    if (query.includes('why')) return 'diagnostic';
    if (query.includes('if ') || query.includes('what if')) return 'simulation';
    if (query.includes('show') || query.startsWith('list')) return 'list';
    return 'general';
  }

  getRequiredTables(resolved) {
    const tables = new Set();
    resolved.entities.forEach(e => {
      e.tables.forEach(t => tables.add(t));
    });
    return Array.from(tables);
  }
}

export const entityResolverEngine = new EntityResolverEngine();
export default EntityResolverEngine;
