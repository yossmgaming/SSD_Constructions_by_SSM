import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, AlertTriangle, Plus, CheckCircle, Flame, Droplets, Activity, RefreshCw } from 'lucide-react';
import { getProjectIncidents, submitIncident } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import Modal from '../Modal';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';

const SafetyIncidentForm = ({ reporterId, projects, onSuccess, onError }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal & Submission State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('Low');
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (projects && projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0].id);
        }
    }, [projects]);

    useEffect(() => {
        if (selectedProject) {
            loadIncidents();
        }
    }, [selectedProject]);

    const loadIncidents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getProjectIncidents(selectedProject);
            setIncidents(data || []);
        } catch (err) {
            console.error('Error loading incidents:', err);
            setError('Failed to load incidents.');
        } finally {
            setLoading(false);
        }
    }, [selectedProject]);

    const handleOpenModal = () => {
        if (!selectedProject) return;
        setIncidentDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setSeverity('Low');
        setFormErrors({});
        setIsModalOpen(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!description.trim()) errors.description = 'Description is required';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            await submitIncident({
                project_id: selectedProject,
                reporter_id: reporterId,
                date: incidentDate,
                description: description,
                severity: severity,
                status: 'Reported'
            });

            setIsModalOpen(false);
            loadIncidents();
            if (onSuccess) onSuccess('Incident reported successfully!');
        } catch (err) {
            console.error('Submit error:', err);
            setError('Failed to report incident.');
            if (onError) onError('Failed to report incident');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getSeverityBadge = (level) => {
        switch (level) {
            case 'Critical': return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Flame size={10} /> Critical</span>;
            case 'High': return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10} /> High</span>;
            case 'Medium': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10} /> Medium</span>;
            default: return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Activity size={10} /> Low</span>;
        }
    };

    if (!projects || projects.length === 0) return null;

    return (
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col h-full group/card">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-200">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider leading-none">Safety & Incidents</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Site Incident Reporting</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <BounceButton
                        onClick={loadIncidents}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                        title="Refresh Reports"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </BounceButton>
                    {projects.length > 1 && (
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="text-[11px] font-bold bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all cursor-pointer shadow-sm hover:border-slate-200"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <BounceButton
                    className="w-full bg-rose-50/50 border-2 border-rose-100 border-dashed rounded-xl p-4 flex items-center justify-center gap-3 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-lg hover:shadow-rose-200 text-rose-700 font-black text-xs uppercase tracking-widest transition-all mb-6 group"
                    onClick={handleOpenModal}
                >
                    <div className="p-1 bg-white rounded-lg group-hover:bg-rose-400 transition-colors">
                        <Plus size={18} />
                    </div>
                    Report New Incident
                </BounceButton>

                <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Safety Logbook</h4>
                    <div className="h-px bg-slate-100 flex-grow ml-4"></div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <LoadingSpinner text="Safety audit..." />
                    </div>
                ) : error ? (
                    <EmptyState
                        icon="alert"
                        title="Unable to load reports"
                        description={error}
                        actionLabel="Try Again"
                        onAction={loadIncidents}
                    />
                ) : incidents.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-emerald-50/30 rounded-2xl border-2 border-dashed border-emerald-100 italic">
                        <div className="p-3 bg-white rounded-2xl shadow-sm mb-3 text-emerald-500">
                            <ShieldAlert size={28} />
                        </div>
                        <span className="text-sm font-bold text-emerald-600">Zero Incidents.</span>
                        <span className="text-[10px] text-emerald-400 uppercase tracking-widest mt-1">Site is currently secure.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                        {incidents.map(incident => (
                            <div key={incident.id} className="group/item border-2 border-slate-50 rounded-2xl p-4 hover:border-rose-100 hover:bg-rose-50/30 hover:shadow-md transition-all bg-white relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {getSeverityBadge(incident.severity)}
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${incident.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{incident.status}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-400">{formatDate(incident.date)}</span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-100 shadow-sm group-hover/item:border-rose-100 transition-colors">
                                    {incident.description}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Creation Modal */}
            <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title="Report Safety Incident">
                <div className="space-y-4">
                    <div className="bg-rose-50 border border-rose-200 rounded-md p-3 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-rose-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-rose-800">
                            <strong>Important:</strong> Only report physical, environmental, or compliance-related safety incidents here. For structural issues, use the Daily Log.
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Incident Date</label>
                            <input
                                type="date"
                                className="w-full text-sm p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-rose-400"
                                value={incidentDate}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setIncidentDate(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Severity Level</label>
                            <select
                                className="w-full text-sm p-2 border border-slate-200 rounded-md outline-none focus:border-rose-400"
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value)}
                                disabled={submitting}
                            >
                                <option value="Low">Low - Minor injury, handled on site</option>
                                <option value="Medium">Medium - Medical attention required</option>
                                <option value="High">High - Hospitalization, major damage</option>
                                <option value="Critical">Critical - Life-threatening / Fatality</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group flex-1">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                            Incident Description <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            className="w-full text-sm p-3 border border-slate-200 rounded-md focus:border-rose-400 outline-none resize-y min-h-[100px]"
                            placeholder="Describe what happened, who was involved, and what initial actions were taken..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-slate-100">
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <BounceButton
                            className="btn btn-primary bg-rose-600 hover:bg-rose-700 hover:shadow-md flex items-center gap-2 border-0"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <span>Reporting...</span>
                            ) : (
                                <><ShieldAlert size={16} /> Submit Official Report</>
                            )}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SafetyIncidentForm;
