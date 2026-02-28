import React, { useState, useEffect, useCallback } from 'react';
import { FileSignature, FilePlus, ChevronRight, Info, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { getDailyReports, submitDailyReport } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import Modal from '../Modal';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';

const DailyReportForm = ({ supervisorId, projects, onSuccess, onError }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal & Submission State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [weather, setWeather] = useState('Clear / Sunny');
    const [workersCount, setWorkersCount] = useState('');
    const [workAccomplished, setWorkAccomplished] = useState('');
    const [issues, setIssues] = useState('');
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (projects && projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0].id);
        }
    }, [projects]);

    useEffect(() => {
        if (selectedProject) {
            loadReports();
        }
    }, [selectedProject]);

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getDailyReports(selectedProject);
            setReports(data || []);
        } catch (err) {
            console.error('Error loading reports:', err);
            setError('Failed to load reports. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [selectedProject]);

    const handleOpenModal = () => {
        if (!selectedProject) return;
        setReportDate(new Date().toISOString().split('T')[0]);
        setWeather('Clear / Sunny');
        setWorkersCount('');
        setWorkAccomplished('');
        setIssues('');
        setFormErrors({});
        setIsModalOpen(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!workAccomplished.trim()) errors.workAccomplished = 'Work details are required';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            await submitDailyReport({
                project_id: selectedProject,
                supervisor_id: supervisorId,
                report_date: reportDate,
                weather_condition: weather,
                workers_count: parseInt(workersCount) || 0,
                work_accomplished: workAccomplished,
                issues_blockers: issues
            });

            setIsModalOpen(false);
            loadReports();
            if (onSuccess) onSuccess('Daily report submitted successfully!');
        } catch (err) {
            console.error('Submit error:', err);
            setError('Failed to submit report. Please try again.');
            if (onError) onError('Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (!projects || projects.length === 0) {
        return null;
    }

    return (
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col h-full group/card">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                        <FileSignature size={20} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider leading-none">Daily Site Logs</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Digital Construction Diary</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <BounceButton
                        onClick={loadReports}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                        title="Refresh Logs"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </BounceButton>
                    {projects.length > 1 && (
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="text-[11px] font-bold bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer shadow-sm hover:border-slate-200"
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
                    className="w-full bg-indigo-50/50 border-2 border-indigo-100 border-dashed rounded-xl p-4 flex items-center justify-center gap-3 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-200 text-indigo-700 font-black text-xs uppercase tracking-widest transition-all mb-6 group"
                    onClick={handleOpenModal}
                >
                    <div className="p-1 bg-white rounded-lg group-hover:bg-indigo-500 transition-colors">
                        <FilePlus size={18} />
                    </div>
                    Create Today's Report
                </BounceButton>

                <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recent Observations</h4>
                    <div className="h-px bg-slate-100 flex-grow ml-4"></div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <LoadingSpinner text="Synchronizing..." />
                    </div>
                ) : error ? (
                    <EmptyState
                        icon="alert"
                        title="Unable to load logs"
                        description={error}
                        actionLabel="Try Again"
                        onAction={loadReports}
                    />
                ) : reports.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 italic">
                        <div className="p-3 bg-white rounded-2xl shadow-sm mb-3">
                            <FileSignature size={28} className="text-slate-200" />
                        </div>
                        <span className="text-sm font-bold text-slate-400">Chronicle is empty.</span>
                        <span className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">Start logging today's progress.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                        {reports.map(report => (
                            <div key={report.id} className="group/item border-2 border-slate-50 rounded-2xl p-4 hover:border-indigo-100 hover:bg-slate-50/30 hover:shadow-md transition-all bg-white relative">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-black text-slate-800">{formatDate(report.report_date)}</span>
                                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider">
                                        <span className="text-slate-400 font-bold">{report.weather_condition}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></span>
                                        <span className="text-indigo-600">{report.workers_count} ON SITE</span>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                    {report.work_accomplished}
                                </p>

                                {report.issues_blockers && (
                                    <div className="mt-3 flex items-start gap-2 text-[11px] font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100 group-hover/item:bg-rose-100/50 transition-colors">
                                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                        <span className="leading-tight">{report.issues_blockers}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Creation Modal */}
            <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title="New Daily Site Log">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Report Date</label>
                            <input
                                type="date"
                                className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-md outline-none"
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Est. Workers Present</label>
                            <input
                                type="number"
                                className="w-full text-sm p-2 border border-slate-200 rounded-md outline-none focus:border-indigo-400"
                                value={workersCount}
                                onChange={(e) => setWorkersCount(e.target.value)}
                                placeholder="e.g. 15"
                                min="0"
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Weather Condition</label>
                        <select
                            className="w-full text-sm p-2 border border-slate-200 rounded-md outline-none focus:border-indigo-400"
                            value={weather}
                            onChange={(e) => setWeather(e.target.value)}
                            disabled={submitting}
                        >
                            <option>Clear / Sunny</option>
                            <option>Cloudy</option>
                            <option>Light Rain</option>
                            <option>Heavy Rain (Work Stopped)</option>
                            <option>Extreme Heat</option>
                        </select>
                    </div>

                    <div className="form-group flex-1">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block flex items-center justify-between">
                            <span>Work Accomplished Today <span className="text-red-500">*</span></span>
                        </label>
                        <textarea
                            className="w-full text-sm p-3 border border-slate-200 rounded-md focus:border-indigo-400 outline-none resize-y min-h-[100px]"
                            placeholder="Detail the exact tasks completed by the team today..."
                            value={workAccomplished}
                            onChange={(e) => setWorkAccomplished(e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    <div className="form-group flex-1">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Issues / Delay Causes (Optional)</label>
                        <textarea
                            className="w-full text-sm p-3 border border-amber-200 bg-amber-50/30 rounded-md focus:border-amber-400 outline-none resize-y min-h-[60px]"
                            placeholder="Material shortages, weather delays, equipment failure..."
                            value={issues}
                            onChange={(e) => setIssues(e.target.value)}
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
                            className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 hover:shadow-md flex items-center gap-2"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <span>Saving...</span>
                            ) : (
                                <><CheckCircle size={16} /> Save Official Log</>
                            )}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DailyReportForm;
