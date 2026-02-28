import React, { useState, useEffect, useCallback } from 'react';
import { Truck, PackageSearch, PackageCheck, AlertCircle, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { getSupplierOrders, updateOrderStatus } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';

const SupplierOrdersView = ({ supplierId, onSuccess, onError }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        if (supplierId) {
            loadOrders();
        }
    }, [supplierId]);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getSupplierOrders(supplierId);
            setOrders(data || []);
        } catch (err) {
            console.error('Error loading supplier orders:', err);
            setError('Failed to load orders.');
        } finally {
            setLoading(false);
        }
    }, [supplierId]);

    const handleStatusUpdate = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            await updateOrderStatus(orderId, newStatus);
            loadOrders();
            if (onSuccess) onSuccess('Order status updated!');
        } catch (err) {
            console.error('Failed to update order status:', err);
            setError('Failed to update order status.');
            if (onError) onError('Failed to update order status');
        } finally {
            setUpdatingId(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const fmtCurrency = (val) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(val || 0);

    const getStatusDetails = (status) => {
        switch (status) {
            case 'Delivered': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <PackageCheck size={16} />, progress: 100 };
            case 'Shipped': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Truck size={16} />, progress: 75 };
            case 'Processing': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <PackageSearch size={16} />, progress: 40 };
            case 'Cancelled': return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: <AlertCircle size={16} />, progress: 0 };
            default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: <Clock size={16} />, progress: 10 }; // Pending
        }
    };

    if (!supplierId) return null;

    return (
        <div className="bg-white border flex flex-col h-full border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Truck size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Order Fulfillment</h3>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">MATERIAL DISPATCH QUEUE</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadOrders}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Refresh orders"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                        {orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length} Active
                    </div>
                </div>
            </div>

            <div className="p-0 flex-1 flex flex-col bg-slate-50/30">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center p-8 text-slate-400 animate-pulse text-sm">Loading fulfillment queue...</div>
                ) : orders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-70">
                        <PackageSearch size={32} className="text-slate-300 mb-3" />
                        <span className="text-sm font-semibold text-slate-600">No Orders Assigned</span>
                        <span className="text-xs text-slate-400 max-w-[250px] mt-1">Pending material requests from construction sites will appear here.</span>
                    </div>
                ) : (
                    <div className="flex flex-col overflow-y-auto max-h-[400px]">
                        {orders.map(order => {
                            const ui = getStatusDetails(order.status);
                            const isUpdating = updatingId === order.id;

                            return (
                                <div key={order.id} className={`p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${order.status === 'Delivered' ? 'opacity-70' : ''}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-bold text-slate-800">{order.material}</h4>
                                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ui.bg} ${ui.text} ${ui.border}`}>
                                                    {ui.icon} {order.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Quantity: <strong className="text-slate-700">{order.quantity}</strong> • Required by: {formatDate(order.required_by_date)}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Order Value</div>
                                            <div className="font-bold text-indigo-700">{fmtCurrency(order.total_price)}</div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-100 p-2.5 rounded-md mb-4 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 uppercase font-bold text-[10px]">Deliver To</span>
                                            <span className="font-semibold text-slate-700">{order.project?.name || 'Unknown Site'}</span>
                                        </div>
                                        <div className="text-slate-500 truncate max-w-[150px]">{order.project?.location || 'No location set'}</div>
                                    </div>

                                    {/* Actions & Progress */}
                                    <div className="flex items-center justify-between">
                                        <div className="w-1/3 max-w-[150px]">
                                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className={`h-full bg-indigo-500 rounded-full transition-all duration-700 ${order.status === 'Delivered' ? 'bg-emerald-500' : ''}`} style={{ width: `${ui.progress}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {order.status === 'Pending' && (
                                                <BounceButton
                                                    className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors"
                                                    onClick={() => handleStatusUpdate(order.id, 'Processing')}
                                                    disabled={isUpdating}
                                                >
                                                    Accept & Process
                                                </BounceButton>
                                            )}
                                            {order.status === 'Processing' && (
                                                <BounceButton
                                                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                                                    onClick={() => handleStatusUpdate(order.id, 'Shipped')}
                                                    disabled={isUpdating}
                                                >
                                                    Mark Shipped
                                                </BounceButton>
                                            )}
                                            {order.status === 'Shipped' && (
                                                <div className="text-xs text-slate-400 font-semibold italic flex items-center gap-1">
                                                    Ongoing Transit...
                                                </div>
                                            )}
                                            {order.status === 'Delivered' && (
                                                <div className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded">
                                                    FULFILLMENT COMPLETE
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupplierOrdersView;
