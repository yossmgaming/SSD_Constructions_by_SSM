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
    const { data, error } = await supabase
        .from('daily_reports')
        .select('*, supervisor:supervisor_id(raw_user_meta_data)')
        .eq('project_id', projectId)
        .order('report_date', { ascending: false });
    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
        .from('incidents')
        .select('*, reporter:reporter_id(raw_user_meta_data)')
        .eq('project_id', projectId)
        .order('date', { ascending: false });
    if (error) throw error;
    return data;
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
