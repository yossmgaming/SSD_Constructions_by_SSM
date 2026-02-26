import React, { useState, useEffect } from 'react';
import { CalendarRange, Plus, Clock, CheckCircle, AlertCircle, PlayCircle, MoreHorizontal } from 'lucide-react';
import { getProjectTasks, createProjectTask, updateProjectTask } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import Modal from '../Modal';

const ProjectTimeline = ({ projects }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (projects && projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0].id);
        }
    }, [projects]);

    useEffect(() => {
        if (selectedProject) {
            loadTasks();
        }
    }, [selectedProject]);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const data = await getProjectTasks(selectedProject);
            setTasks(data || []);
        } catch (error) {
            console.error('Error loading tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        if (!selectedProject) {
            alert('Please select a project first.');
            return;
        }
        setTitle('');
        setStartDate(new Date().toISOString().split('T')[0]);

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        setEndDate(nextWeek.toISOString().split('T')[0]);

        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!title.trim() || !startDate || !endDate) {
            alert('Please fill out all task details.');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('End date cannot be before start date.');
            return;
        }

        setSubmitting(true);
        try {
            await createProjectTask({
                project_id: selectedProject,
                title: title,
                start_date: startDate,
                end_date: endDate,
                status: 'Pending',
                progress: 0
            });

            setIsModalOpen(false);
            loadTasks();
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to create task. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (taskId, newStatus, newProgress) => {
        try {
            await updateProjectTask(taskId, { status: newStatus, progress: newProgress });
            loadTasks();
        } catch (error) {
            alert('Failed to update task.');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Completed': return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle size={14} />, bar: 'bg-emerald-500' };
            case 'In Progress': return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: <PlayCircle size={14} />, bar: 'bg-indigo-500' };
            case 'Delayed': return { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', icon: <AlertCircle size={14} />, bar: 'bg-rose-500' };
            default: return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: <Clock size={14} />, bar: 'bg-slate-400' };
        }
    };

    // Calculate timeline bounds
    const dates = tasks.flatMap(t => [new Date(t.start_date).getTime(), new Date(t.end_date).getTime()]);
    const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

    // Add padding to bounds (3 days before min, 3 days after max)
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 3);

    const totalDaysSpan = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24));

    if (!projects || projects.length === 0) return null;

    return (
        <div className="bg-white border flex flex-col h-full border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <CalendarRange size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Project Timeline</h3>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">GANTT-LITE VIEW</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {projects.length > 1 && (
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="text-xs bg-white border border-slate-200 rounded-md p-1.5 text-slate-700 outline-none focus:border-blue-400"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}

                    <BounceButton
                        className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700 border-0"
                        onClick={handleOpenModal}
                    >
                        <Plus size={14} /> Add Task
                    </BounceButton>
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col bg-slate-50/30">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 animate-pulse text-sm">Loading timeline...</div>
                ) : tasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-70">
                        <CalendarRange size={32} className="text-slate-300 mb-3" />
                        <span className="text-sm font-semibold text-slate-600">Timeline is empty</span>
                        <span className="text-xs text-slate-400 max-w-[250px] mt-1">Break down this project into trackable phases and tasks to view the Gantt schedule.</span>
                        <BounceButton
                            className="mt-4 text-xs font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors inline-block cursor-pointer"
                            onClick={handleOpenModal}
                        >
                            Create First Task
                        </BounceButton>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {/* Timeline Header (Months) */}
                        <div className="flex text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2 relative h-[25px]">
                            {/* Simple month markers (approx) */}
                            <span className="absolute left-0">Start ({formatDate(minDate.toISOString())})</span>
                            <span className="absolute right-0">End ({formatDate(maxDate.toISOString())})</span>
                        </div>

                        {/* Tracks */}
                        <div className="flex-1 overflow-y-auto space-y-4 pt-2 pb-6 pr-2">
                            {tasks.map(task => {
                                const st = new Date(task.start_date);
                                const ed = new Date(task.end_date);

                                const startPercent = Math.max(0, ((st - minDate) / (1000 * 60 * 60 * 24)) / totalDaysSpan * 100);
                                const durationPercent = Math.max(5, ((ed - st) / (1000 * 60 * 60 * 24)) / totalDaysSpan * 100); // min 5% width for visibility

                                const styles = getStatusStyle(task.status);

                                return (
                                    <div key={task.id} className="relative h-14 group">
                                        {/* Background connecting line (optional) */}
                                        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 -z-10 group-hover:bg-slate-300 transition-colors"></div>

                                        {/* Task Bar */}
                                        <div
                                            className={`absolute top-0 bottom-0 rounded-md shadow-sm border flex flex-col justify-center px-3 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${styles.bg} ${styles.border} z-10`}
                                            style={{ left: `${startPercent}%`, width: `${durationPercent}%`, minWidth: '120px' }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs font-bold truncate ${styles.text}`}>{task.title}</span>
                                                <div className="relative inline-block text-left dropdown-trigger group/dropdown">
                                                    <button className={`p-0.5 rounded opacity-50 hover:opacity-100 hover:bg-white/50 transition-colors ${styles.text}`}>
                                                        <MoreHorizontal size={14} />
                                                    </button>

                                                    {/* Dropdown Menu - Simple CSS hover approach for speed */}
                                                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-md shadow-lg border border-slate-200 z-50 hidden group-hover/dropdown:block">
                                                        <div className="py-1">
                                                            <button className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2" onClick={() => updateStatus(task.id, 'In Progress', 50)}>
                                                                <PlayCircle size={12} className="text-indigo-500" /> Start Phase
                                                            </button>
                                                            <button className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2" onClick={() => updateStatus(task.id, 'Completed', 100)}>
                                                                <CheckCircle size={12} className="text-emerald-500" /> Mark Complete
                                                            </button>
                                                            <button className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2" onClick={() => updateStatus(task.id, 'Delayed', task.progress)}>
                                                                <AlertCircle size={12} className="text-rose-500" /> Report Delay
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-1 opacity-80 gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    {styles.icon}
                                                    <span className={`text-[10px] font-semibold ${styles.text}`}>{formatDate(task.start_date)} - {formatDate(task.end_date)}</span>
                                                </div>
                                            </div>

                                            {/* Progress Bar under text */}
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/50 rounded-b-md overflow-hidden">
                                                <div className={`h-full ${styles.bar} shadow-sm`} style={{ width: `${task.progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Creation Modal */}
            <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title="Add Timeline Phase/Task">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Define a crucial phase of this project to track its progress visually on the timeline.
                    </p>

                    <div className="form-group">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Phase/Task Title <span className="text-blue-500">*</span></label>
                        <input
                            type="text"
                            className="w-full text-sm p-3 border border-slate-200 rounded-md outline-none focus:border-blue-400"
                            placeholder="e.g. Foundation Pouring, Site Survey..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Start Date</label>
                            <input
                                type="date"
                                className="w-full text-sm p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-400"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">End Date</label>
                            <input
                                type="date"
                                className="w-full text-sm p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-400"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => setEndDate(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
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
                            className="btn btn-primary bg-blue-600 hover:bg-blue-700 hover:shadow-md flex items-center gap-2 border-0"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <span>Adding...</span>
                            ) : (
                                <><CalendarRange size={16} /> Add to Timeline</>
                            )}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProjectTimeline;
