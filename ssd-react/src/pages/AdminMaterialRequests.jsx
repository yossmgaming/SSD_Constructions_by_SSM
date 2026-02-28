import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import { Package, CheckCircle, XCircle, Clock, Edit2, Plus } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminMaterialRequests() {
    const { t } = useTranslation();
    const { profile, identity } = useAuth();

    const [requests, setRequests] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processing, setProcessing] = useState(false);

    const [editForm, setEditForm] = useState({
        material_name: '',
        quantity_needed: 1,
        unit: 'pieces'
    });

    useEffect(() => {
        loadData();
    }, [identity?.id]);

    async function loadData() {
        if (!identity?.id) return;
        setLoading(true);
        try {
            // Load all requests
            const { data: reqs } = await supabase
                .from('material_requests')
                .select('*, project:project_id(name), supervisor:supervisor_id(full_name)')
                .order('created_at', { ascending: false });
            setRequests(reqs || []);

            // Load ongoing projects
            const { data: p } = await supabase
                .from('projects')
                .select('id, name')
                .eq('status', 'Ongoing');
            setProjects(p || []);
        } catch (e) {
            console.error('Error loading data:', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove() {
        if (!selectedRequest) return;
        setProcessing(true);
        try {
            // Update request status
            await supabase
                .from('material_requests')
                .update({ 
                    status: 'Approved', 
                    reviewed_by: identity.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', selectedRequest.id);

            // Auto-add to material usage
            await supabase
                .from('material_usage')
                .insert({
                    project_id: selectedRequest.project_id,
                    material_name: editForm.material_name,
                    quantity_used: editForm.quantity_needed,
                    unit: editForm.unit,
                    used_date: new Date().toISOString().split('T')[0],
                    recorded_by: identity.id,
                    notes: `Approved from request - ${selectedRequest.purpose}`
                });

            setShowModal(false);
            loadData();
        } catch (e) {
            console.error('Error approving request:', e);
            alert('Failed to approve request');
        } finally {
            setProcessing(false);
        }
    }

    async function handleReject() {
        if (!selectedRequest) return;
        setProcessing(true);
        try {
            await supabase
                .from('material_requests')
                .update({ 
                    status: 'Rejected', 
                    reviewed_by: identity.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', selectedRequest.id);

            setShowModal(false);
            loadData();
        } catch (e) {
            console.error('Error rejecting request:', e);
            alert('Failed to reject request');
        } finally {
            setProcessing(false);
        }
    }

    const openEditModal = (request) => {
        setSelectedRequest(request);
        setEditForm({
            material_name: request.material_name,
            quantity_needed: request.quantity_needed,
            unit: request.unit
        });
        setShowModal(true);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Approved': return 'badge-success';
            case 'Rejected': return 'badge-error';
            default: return 'badge-warning';
        }
    };

    const pendingRequests = requests.filter(r => r.status === 'Pending');
    const processedRequests = requests.filter(r => r.status !== 'Pending');

    if (loading) {
        return <div className="p-8 flex items-center justify-center"><LoadingSpinner text="Loading..." /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Material Requests</h1>
                <p className="text-slate-500">Review and approve supervisor material requests</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="stat-card amber">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg"><Clock size={20} className="text-amber-600" /></div>
                        <div>
                            <div className="text-2xl font-bold">{pendingRequests.length}</div>
                            <div className="text-sm text-slate-500">Pending</div>
                        </div>
                    </div>
                </Card>
                <Card className="stat-card emerald">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle size={20} className="text-emerald-600" /></div>
                        <div>
                            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'Approved').length}</div>
                            <div className="text-sm text-slate-500">Approved</div>
                        </div>
                    </div>
                </Card>
                <Card className="stat-card rose">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg"><XCircle size={20} className="text-rose-600" /></div>
                        <div>
                            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'Rejected').length}</div>
                            <div className="text-sm text-slate-500">Rejected</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Pending Requests */}
            <Card title="Pending Requests">
                {pendingRequests.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No pending requests</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-slate-200">
                                <tr>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Supervisor</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Project</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Material</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Quantity</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Date Needed</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Purpose</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Date</th>
                                    <th className="text-center text-xs font-bold text-slate-500 uppercase px-3 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRequests.map(req => (
                                    <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-2 text-sm">{req.supervisor?.full_name || 'Unknown'}</td>
                                        <td className="px-3 py-2 text-sm font-medium">{req.project?.name || 'Unknown'}</td>
                                        <td className="px-3 py-2 text-sm">{req.material_name}</td>
                                        <td className="px-3 py-2 text-sm">{req.quantity_needed} {req.unit}</td>
                                        <td className="px-3 py-2 text-sm">{req.date_needed || '-'}</td>
                                        <td className="px-3 py-2 text-sm text-slate-500 max-w-[150px] truncate">{req.purpose}</td>
                                        <td className="px-3 py-2 text-sm text-slate-400">{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex justify-center gap-1">
                                                <button 
                                                    onClick={() => openEditModal(req)}
                                                    className="p-1.5 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200"
                                                    title="Review"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Processed Requests */}
            {processedRequests.length > 0 && (
                <Card title="Processed Requests">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-slate-200">
                                <tr>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Supervisor</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Project</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Material</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Quantity</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Status</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Reviewed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedRequests.map(req => (
                                    <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-2 text-sm">{req.supervisor?.full_name || 'Unknown'}</td>
                                        <td className="px-3 py-2 text-sm font-medium">{req.project?.name || 'Unknown'}</td>
                                        <td className="px-3 py-2 text-sm">{req.material_name}</td>
                                        <td className="px-3 py-2 text-sm">{req.quantity_needed} {req.unit}</td>
                                        <td className="px-3 py-2">
                                            <span className={`badge ${getStatusBadge(req.status)}`}>{req.status}</span>
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-400">{req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Review Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Review Material Request">
                <div className="space-y-4">
                    {selectedRequest && (
                        <>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-slate-500">Supervisor:</span> <span className="font-medium">{selectedRequest.supervisor?.full_name}</span></div>
                                    <div><span className="text-slate-500">Project:</span> <span className="font-medium">{selectedRequest.project?.name}</span></div>
                                    <div><span className="text-slate-500 col-span-2">Purpose:</span> <span className="font-medium">{selectedRequest.purpose}</span></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Material Name</label>
                                    <input 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        value={editForm.material_name}
                                        onChange={(e) => setEditForm({ ...editForm, material_name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Quantity</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        value={editForm.quantity_needed}
                                        onChange={(e) => setEditForm({ ...editForm, quantity_needed: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Unit</label>
                                <select 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                    value={editForm.unit}
                                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                >
                                    <option value="pieces">Pieces</option>
                                    <option value="kg">Kg</option>
                                    <option value="tons">Tons</option>
                                    <option value="cubic meters">Cubic Meters</option>
                                    <option value="bags">Bags</option>
                                </select>
                            </div>

                            <div className="flex justify-between pt-4 border-t">
                                <BounceButton className="btn bg-rose-500 text-white hover:bg-rose-600" onClick={handleReject} disabled={processing}>
                                    <XCircle size={18} className="mr-1" /> Reject
                                </BounceButton>
                                <div className="flex gap-2">
                                    <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                    <BounceButton 
                                        className="btn btn-primary" 
                                        onClick={handleApprove} 
                                        disabled={processing}
                                    >
                                        <CheckCircle size={18} className="mr-1" />
                                        {processing ? 'Processing...' : 'Approve & Add to Usage'}
                                    </BounceButton>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
