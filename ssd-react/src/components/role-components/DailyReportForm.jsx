import React, { useState, useEffect } from 'react';
import { FileSignature, FilePlus, ChevronRight, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { getDailyReports, submitDailyReport } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import Modal from '../Modal';

const DailyReportForm = ({ supervisorId, projects }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal & Submission State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [weather, setWeather] = useState('Clear / Sunny');
    const [workersCount, setWorkersCount] = useState('');
    const [workAccomplished, setWorkAccomplished] = useState('');
    const [issues, setIssues] = useState('');

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

    const loadReports = async () => {
        setLoading(true);
        try {
            const data = await getDailyReports(selectedProject);
            setReports(data || []);
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        if (!selectedProject) {
            alert('Please select a project first.');
            return;
        }
        setReportDate(new Date().toISOString().split('T')[0]);
        setWeather('Clear / Sunny');
        setWorkersCount('');
        setWorkAccomplished('');
        setIssues('');
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!workAccomplished.trim()) {
            alert('Please detail the work accomplished.');
            return;
        }

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
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to submit report. Please try again.');
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
        <div className="bg-white border flex flex-col h-full border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                        <FileSignature size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Daily Site Logs</h3>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">DIGITAL RECORD</p>
                    </div>
                </div>

                {projects.length > 1 && (
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-md p-1.5 text-slate-700 outline-none focus:border-indigo-400"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <BounceButton
                    className="w-full bg-slate-50 border border-slate-200 border-dashed rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 text-slate-500 font-semibold text-sm transition-colors mb-4"
                    onClick={handleOpenModal}
                >
                    <FilePlus size={16} /> Create Today's Report
                </BounceButton>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Logs</h4>

                {loading ? (
                    <div className="text-center p-4 text-slate-400 animate-pulse text-sm">Loading logs...</div>
                ) : reports.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-70">
                        <FileSignature size={24} className="text-slate-300 mb-2" />
                        <span className="text-sm font-semibold text-slate-600">No logs for this site</span>
                        <span className="text-xs text-slate-400 max-w-[200px]">Create daily reports to keep management updated.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px] pr-1">
                        {reports.map(report => (
                            <div key={report.id} className="group border border-slate-100 rounded-lg p-3 hover:border-indigo-200 transition-colors bg-white shadow-sm flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-slate-800">{formatDate(report.report_date)}</span>
                                    <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                        <span>{report.weather_condition}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>{report.workers_count} Workers</span>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                    {report.work_accomplished}
                                </p>

                                {report.issues_blockers && (
                                    <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 p-1.5 rounded-md border border-amber-100">
                                        <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                                        <span className="line-clamp-1 italic">{report.issues_blockers}</span>
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
