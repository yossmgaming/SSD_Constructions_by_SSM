import React, { useState, useEffect } from 'react';
import { Users, Hammer, BarChart2 } from 'lucide-react';
import { supabase } from '../../data/supabase';

const ResourceAllocationView = ({ projects }) => {
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (projects && projects.length > 0) {
            loadAllocations();
        }
    }, [projects]);

    const loadAllocations = async () => {
        setLoading(true);
        try {
            const projectIds = projects.map(p => p.id);

            // 1. Fetch Workers assigned to these projects
            const { data: pw } = await supabase
                .from('projectWorkers')
                .select('projectId')
                .in('projectId', projectIds);

            // 2. Fetch Subcontractors assigned
            const { data: ps } = await supabase
                .from('project_subcontractors')
                .select('project_id')
                .in('project_id', projectIds);

            // 3. Aggregate
            const data = projects.map(p => {
                const workersCount = (pw || []).filter(w => w.projectId === p.id).length;
                const subsCount = (ps || []).filter(s => s.project_id === p.id).length;
                return {
                    id: p.id,
                    name: p.name,
                    workers: workersCount,
                    subs: subsCount,
                    total: workersCount + subsCount // very simple metric
                };
            });

            setAllocations(data.sort((a, b) => b.total - a.total)); // Sort by most resources
        } catch (error) {
            console.error('Error loading allocations:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!projects || projects.length === 0) return null;

    // Find the max value to calculate percentage for the bars
    const maxVal = Math.max(1, ...allocations.map(a => Math.max(a.workers, a.subs)));

    return (
        <div className="bg-white border flex flex-col h-full border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                    <BarChart2 size={18} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Resource Allocation</h3>
                    <p className="text-[10px] text-slate-500 font-medium tracking-wide">HUMAN CAPITAL DISTRIBUTION</p>
                </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto max-h-[300px]">
                {loading ? (
                    <div className="text-center text-sm text-slate-400 animate-pulse py-6">Calculating allocation metrics...</div>
                ) : allocations.length === 0 ? (
                    <div className="text-center text-sm text-slate-400 py-6">No resources allocated to your projects yet.</div>
                ) : (
                    <div className="space-y-5">
                        {allocations.map(alloc => (
                            <div key={alloc.id} className="flex flex-col gap-1.5 group">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{alloc.name}</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">{alloc.total} Resources</span>
                                </div>

                                <div className="space-y-1.5 mt-1">
                                    {/* Workers Bar */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 w-[80px]">
                                            <Users size={12} /> Workers
                                        </div>
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex items-center">
                                            <div
                                                className="h-full bg-emerald-400 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${(alloc.workers / maxVal) * 100}%`, minWidth: alloc.workers > 0 ? '4px' : '0' }}
                                            />
                                        </div>
                                        <div className="text-xs font-bold text-slate-700 w-6 text-right">{alloc.workers}</div>
                                    </div>

                                    {/* Subcontractors Bar */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 w-[80px]">
                                            <Hammer size={12} /> Subs
                                        </div>
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex items-center">
                                            <div
                                                className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${(alloc.subs / maxVal) * 100}%`, minWidth: alloc.subs > 0 ? '4px' : '0' }}
                                            />
                                        </div>
                                        <div className="text-xs font-bold text-slate-700 w-6 text-right">{alloc.subs}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourceAllocationView;
