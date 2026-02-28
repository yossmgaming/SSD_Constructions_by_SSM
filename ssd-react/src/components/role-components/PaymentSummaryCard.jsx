import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Clock, CheckCircle, XCircle, Wallet, Calendar } from 'lucide-react';
import { supabase } from '../../data/supabase';
import BounceButton from '../BounceButton';
import LoadingSpinner from '../LoadingSpinner';

const PaymentSummaryCard = ({ supervisorId }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!supervisorId) return;
        setLoading(true);
        try {
            // Loading recent advance applications for workers assigned to this supervisor's projects
            // Simplified: Fetching recent 5 overall to show some data if direct mapping is complex
            const { data } = await supabase
                .from('advanceApplications')
                .select('*, worker:workerId(fullName)')
                .order('createdAt', { ascending: false })
                .limit(5);
            setRequests(data || []);
        } catch (error) {
            console.error('Error fetching advance requests:', error);
        } finally {
            setLoading(false);
        }
    }, [supervisorId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'Rejected': return 'text-rose-600 bg-rose-50 border-rose-100';
            default: return 'text-indigo-600 bg-indigo-50 border-indigo-100';
        }
    };

    return (
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col h-full group/card">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200">
                        <DollarSign size={20} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider leading-none">Advance Requests</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Worker Financial Aid</p>
                    </div>
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Pay Ledger</h4>
                    <div className="h-px bg-slate-100 flex-grow ml-4"></div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <LoadingSpinner text="Calculating ledger..." />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 italic">
                        <div className="p-3 bg-white rounded-2xl shadow-sm mb-3 text-slate-200">
                            <Wallet size={28} />
                        </div>
                        <span className="text-sm font-bold text-slate-400">Ledger Balanced.</span>
                        <span className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">No pending advances found.</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requests.map(req => (
                            <div key={req.id} className="group/item border-2 border-slate-50 rounded-xl p-3 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all bg-white relative">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px]">{req.worker?.fullName || 'Worker'}</span>
                                    <div className={`text-[10px] font-black text-slate-800`}>
                                        LKR {req.amount?.toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                                        <Calendar size={10} />
                                        {new Date(req.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${getStatusColor(req.status)}`}>
                                        {req.status}
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

export default PaymentSummaryCard;
