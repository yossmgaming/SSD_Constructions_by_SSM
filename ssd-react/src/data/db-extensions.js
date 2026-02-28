import { supabase } from './supabase';

/**
 * ============================================================================
 * 🧊 SSD EXTENSIONS API
 * This module extends the core `db.js` with feature-specific functions for
 * the new role-based portals (Messaging, Documents, Notifications, etc.)
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. MESSAGING & NOTIFICATIONS
// ----------------------------------------------------------------------------
export async function getUserNotifications(userId) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function getWorkerNotifications(workerId) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('target_user_id', workerId)
        .order('created_at', { ascending: false })
        .limit(20);
    if (error) {
        console.error('Error fetching worker notifications:', error);
        return [];
    }
    return data || [];
}

export async function markNotificationAsRead(notificationId) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    if (error) throw error;
}

export async function sendMessage(senderId, receiverId, projectId, content) {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            sender_id: senderId,
            receiver_id: receiverId,
            project_id: projectId,
            content: content
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ----------------------------------------------------------------------------
// 2. DOCUMENT VAULT (Client Portal)
// ----------------------------------------------------------------------------
export async function getProjectDocuments(projectId) {
    const { data, error } = await supabase
        .from('documents')
        .select('*, uploader:uploader_id(raw_user_meta_data)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function uploadDocumentMeta(documentData) {
    const { data, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ----------------------------------------------------------------------------
// 3. DAILY REPORTS (Supervisor Dashboard)
// ----------------------------------------------------------------------------
export async function getDailyReports(projectId) {
    // Fetch without FK join to avoid PGRST200 errors
    const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('report_date', { ascending: false });
    if (error) throw error;
    
    // Manually enrich with supervisor data if supervisor_id exists
    if (data && data.length > 0) {
        const supervisorIds = [...new Set(data.map(r => r.supervisor_id).filter(Boolean))];
        if (supervisorIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, raw_user_meta_data')
                .in('id', supervisorIds);
            
            const profileMap = {};
            (profiles || []).forEach(p => { profileMap[p.id] = p; });
            
            return data.map(r => ({
                ...r,
                supervisor: profileMap[r.supervisor_id] || null
            }));
        }
    }
    return data || [];
}

export async function submitDailyReport(reportData) {
    const { data, error } = await supabase
        .from('daily_reports')
        .insert(reportData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ----------------------------------------------------------------------------
// 4. LEAVE REQUESTS (Worker Portal)
// ----------------------------------------------------------------------------
export async function submitLeaveRequest(workerId, requestData) {
    const { data, error } = await supabase
        .from('leave_requests')
        .insert({
            worker_id: workerId,
            ...requestData
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getWorkerLeaveRequests(workerId) {
    const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

// ----------------------------------------------------------------------------
// 4b. LEAVE REQUESTS - Management Functions
// ----------------------------------------------------------------------------
export async function getAllLeaveRequests(statusFilter = null) {
    let query = supabase
        .from('leave_requests')
        .select(`
            *,
            worker:worker_id(
                id,
                fullName,
                phone,
                pid
            )
        `)
        .order('created_at', { ascending: false });
    
    if (statusFilter && statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function updateLeaveRequestStatus(requestId, newStatus, reviewedByUserId) {
    const { data, error } = await supabase
        .from('leave_requests')
        .update({ 
            status: newStatus, 
            reviewed_by: reviewedByUserId,
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getWorkerLeaveCountThisMonth(workerId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('leave_requests')
        .select('start_date, end_date, is_half_day')
        .eq('worker_id', workerId)
        .eq('status', 'Approved')
        .gte('start_date', startDate)
        .lte('start_date', endDate);
    
    if (error) {
        console.error('Error getting leave count:', error);
        return 0;
    }
    
    let totalDays = 0;
    (data || []).forEach(req => {
        const startStr = req.start_date ? req.start_date.split(' ')[0] : null;
        const endStr = req.end_date ? req.end_date.split(' ')[0] : null;
        if (!startStr || !endStr) return;
        
        const start = new Date(startStr);
        const end = new Date(endStr);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const days = req.is_half_day ? diffDays * 0.5 : diffDays;
        totalDays += days;
    });
    
    return Math.round(totalDays * 10) / 10;
}

export async function getWorkerAssignedProjects(workerId) {
    const { data, error } = await supabase
        .from('projectWorkers')
        .select(`
            id,
            assignedFrom,
            assignedTo,
            role,
            project:projectId(
                id,
                name,
                status,
                location
            )
        `)
        .eq('workerId', workerId);
    
    if (error) {
        console.error('getWorkerAssignedProjects error:', error);
        return [];
    }
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const activeAssignments = (data || []).filter(pw => {
        const from = pw.assignedFrom || '1900-01-01';
        const to = pw.assignedTo || '9999-12-31';
        // Check if assignment is currently active (date-wise)
        const isDateActive = from <= today && to >= today;
        return isDateActive;
    });
    
    return activeAssignments;
}

// ----------------------------------------------------------------------------
// 5. SUPPLIER ORDERS
// ----------------------------------------------------------------------------
export async function getSupplierOrders(supplierId) {
    const { data, error } = await supabase
        .from('orders')
        .select('*, project:project_id(name, location)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
    if (error) throw error;
}

// ----------------------------------------------------------------------------
// 6. WORKER ATTENDANCE (Heatmap Extension)
// ----------------------------------------------------------------------------
export async function getWorkerAttendanceHistory(workerId, limitDays = 30) {
    try {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - limitDays);

        const dateString = pastDate.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('attendances')
            .select('date, isPresent, isHalfDay, hoursWorked, project:projectId(name)')
            .eq('workerId', workerId)
            .gte('date', dateString)
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Error fetching worker attendance:", e);
        return [];
    }
}

// ----------------------------------------------------------------------------
// 7. SITE INCIDENTS (Safety & Reporting)
// ----------------------------------------------------------------------------
export async function submitIncident(incidentData) {
    const { data, error } = await supabase
        .from('incidents')
        .insert(incidentData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getProjectIncidents(projectId) {
    // Fetch without FK join to avoid PGRST200 errors
    const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false });
    if (error) throw error;
    
    // Manually enrich with reporter data if reporter_id exists
    if (data && data.length > 0) {
        const reporterIds = [...new Set(data.map(r => r.reporter_id).filter(Boolean))];
        if (reporterIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, raw_user_meta_data')
                .in('id', reporterIds);
            
            const profileMap = {};
            (profiles || []).forEach(p => { profileMap[p.id] = p; });
            
            return data.map(r => ({
                ...r,
                reporter: profileMap[r.reporter_id] || null
            }));
        }
    }
    return data || [];
}

// ----------------------------------------------------------------------------
// 8. PROJECT TASKS (PM Gantt/Timeline)
// ----------------------------------------------------------------------------
export async function getProjectTasks(projectId) {
    const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });
    if (error) throw error;
    return data;
}

export async function createProjectTask(taskData) {
    const { data, error } = await supabase
        .from('project_tasks')
        .insert(taskData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateProjectTask(taskId, updates) {
    const { data, error } = await supabase
        .from('project_tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ----------------------------------------------------------------------------
// 9. CHANGE ORDERS (PM Module)
// ----------------------------------------------------------------------------
export async function getChangeOrders(projectId) {
    const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function createChangeOrder(orderData) {
    const { data, error } = await supabase
        .from('change_orders')
        .insert(orderData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateChangeOrder(orderId, updates) {
    const { data, error } = await supabase
        .from('change_orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ----------------------------------------------------------------------------
// 10. SUBCONTRACTOR CLAIMS
// ----------------------------------------------------------------------------
export async function getSubcontractorClaims(subId) {
    const { data, error } = await supabase
        .from('subcontractor_claims')
        .select('*')
        .eq('subcontractor_id', subId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function submitSubcontractorClaim(claimData) {
    const { data, error } = await supabase
        .from('subcontractor_claims')
        .insert(claimData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ----------------------------------------------------------------------------
// 11. COMPANY HOLIDAYS
// ----------------------------------------------------------------------------
export async function getCompanyHolidays(year = null) {
    const targetYear = year || new Date().getFullYear();
    const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .or(`date.eq.${targetYear}-01-01,date.gte.${targetYear}-01-01,date.lte.${targetYear}-12-31,is_recurring.eq.true`)
        .order('date', { ascending: true });
    if (error) throw error;
    return data;
}

export async function addCompanyHoliday(holidayData) {
    const { data, error } = await supabase
        .from('holidays')
        .insert(holidayData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateCompanyHoliday(holidayId, updates) {
    const { data, error } = await supabase
        .from('holidays')
        .update(updates)
        .eq('id', holidayId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteCompanyHoliday(holidayId) {
    const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holidayId);
    if (error) throw error;
}

export async function checkHolidayOverlap(startDate, endDate) {
    const { data, error } = await supabase
        .from('holidays')
        .select('name, date')
        .or(`and(date.gte.${startDate},date.lte.${endDate}),and(date.eq.${startDate},is_recurring.eq.true),and(date.eq.${endDate},is_recurring.eq.true)`);
    if (error) throw error;
    return data;
}

export async function getHolidaysInRange(startDate, endDate) {
    const { data, error } = await supabase
        .from('holidays')
        .select('name, date, is_recurring')
        .or(`and(date.gte.${startDate},date.lte.${endDate}),is_recurring.eq.true`)
        .order('date', { ascending: true });
    if (error) throw error;
    return data;
}
