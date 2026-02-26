import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Plus, CheckCircle, Flame, Droplets, Activity } from 'lucide-react';
import { getProjectIncidents, submitIncident } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import Modal from '../Modal';

const SafetyIncidentForm = ({ reporterId, projects }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal & Submission State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('Low');

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

    const loadIncidents = async () => {
        setLoading(true);
        try {
            const data = await getProjectIncidents(selectedProject);
            setIncidents(data || []);
        } catch (error) {
            console.error('Error loading incidents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        if (!selectedProject) {
            alert('Please select a project first.');
            return;
        }
        setIncidentDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setSeverity('Low');
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            alert('Please provide a description of the incident.');
            return;
        }

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
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to report incident. Please try again.');
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
        <div className="bg-white border flex flex-col h-full border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                        <ShieldAlert size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Safety & Incidents</h3>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">SITE REPORTING</p>
                    </div>
                </div>

                {projects.length > 1 && (
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-md p-1.5 text-slate-700 outline-none focus:border-rose-400"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <BounceButton
                    className="w-full bg-slate-50 border border-slate-200 border-dashed rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 text-slate-500 font-semibold text-sm transition-colors mb-4"
                    onClick={handleOpenModal}
                >
                    <Plus size={16} /> Report New Incident
                </BounceButton>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Reports</h4>

                {loading ? (
                    <div className="text-center p-4 text-slate-400 animate-pulse text-sm">Loading reports...</div>
                ) : incidents.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-70">
                        <ShieldAlert size={24} className="text-slate-300 mb-2" />
                        <span className="text-sm font-semibold text-slate-600">Zero Incidents</span>
                        <span className="text-xs text-slate-400 max-w-[200px]">No safety reports or incidents logged for this site.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[220px] pr-1">
                        {incidents.map(incident => (
                            <div key={incident.id} className="border border-slate-100 rounded-lg p-3 hover:border-rose-200 transition-colors bg-white shadow-sm flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {getSeverityBadge(incident.severity)}
                                        <span className={`text-[10px] font-bold px-1.5 rounded-sm ${incident.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{incident.status}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500">{formatDate(incident.date)}</span>
                                </div>
                                <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
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
