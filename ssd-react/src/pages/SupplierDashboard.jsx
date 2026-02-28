import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import Card from '../components/Card';
import { Truck, Package, DollarSign, ShieldCheck, FileText, Hash } from 'lucide-react';
import CountUp from '../components/CountUp';
import './Dashboard.css';
import SupplierOrdersView from '../components/role-components/SupplierOrdersView';

export default function SupplierDashboard() {
    const { t } = useTranslation();
    const { profile, identity } = useAuth();
    const [materials, setMaterials] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const supplierName = identity?.name || profile?.full_name || 'Supplier';
    const supplierId = identity?.id || null;

    useEffect(() => {
        if (!supplierId) {
            setLoading(false);
            return;
        }
        loadData();
    }, [supplierId]);

    async function loadData() {
        setLoading(true);
        try {
            const [mats, pays] = await Promise.all([
                supabase
                    .from('materials')
                    .select('id, name, quantity, unit, unitCost, status')
                    .eq('supplier_id', supplierId)
                    .order('name', { ascending: true }),
                supabase
                    .from('payments')
                    .select('id, amount, direction, category, date, createdAt')
                    .eq('supplierId', supplierId)
                    .order('date', { ascending: false })
                    .limit(20),
            ]);
            setMaterials(mats.data || []);
            setPayments(pays.data || []);
        } catch (e) {
            console.error('[SupplierDashboard] Load error:', e);
        } finally {
            setLoading(false);
        }
    }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
    const totalPaid = payments.filter(p => p.direction === 'Out').reduce((s, p) => s + (p.amount || 0), 0);
    const totalReceived = payments.filter(p => p.direction === 'In').reduce((s, p) => s + (p.amount || 0), 0);

    return (
        <div className="worker-dashboard">
            <div className="worker-welcome">
                <div className="welcome-text">
                    <h2>{t('dashboard.welcome_back')}, {supplierName}</h2>
                    <p>Your supply account dashboard — materials delivered and payment history.</p>
                </div>
                <div className="worker-status-badge client-badge" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                    <ShieldCheck size={18} />
                    <span>Supplier Access</span>
                </div>
            </div>

            {/* Identity Card */}
            {identity && (
                <Card className="mb-6" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1px solid #fed7aa' }}>
                    <div className="flex items-center gap-4 p-2">
                        <div style={{ background: '#f97316', borderRadius: '50%', padding: 10 }}>
                            <Truck size={20} color="#fff" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">Linked Supplier Record</div>
                            <div className="font-bold text-slate-800">{identity.name}</div>
                            {identity.phone && <div className="text-sm text-slate-500">{identity.phone}</div>}
                            {identity.category && (
                                <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                                    {identity.category}
                                </span>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            <div className="dashboard-stats">
                <Card className="stat-card amber">
                    <div className="stat-icon amber">
                        <Package size={22} />
                    </div>
                    <div className="card-label">Materials Supplied</div>
                    <div className="card-value"><CountUp to={materials.length} /></div>
                    <div className="stat-sub">Items in registry</div>
                </Card>

                <Card className="stat-card emerald">
                    <div className="stat-icon emerald">
                        <DollarSign size={22} />
                    </div>
                    <div className="card-label">Total Paid to You</div>
                    <div className="card-value">{fmt(totalPaid)}</div>
                    <div className="stat-sub">Payments from SSD</div>
                </Card>
            </div>

            <div className="dashboard-grid-full">
                <SupplierOrdersView supplierId={supplierId} />
            </div>

            <div className="dashboard-grid">
                <Card title="Your Materials">
                    {loading ? (
                        <div className="empty-state">Loading...</div>
                    ) : materials.length === 0 ? (
                        <div className="empty-state">No materials linked to your account yet.</div>
                    ) : (
                        <div className="space-y-2">
                            {materials.slice(0, 10).map(m => (
                                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                    <div>
                                        <div className="font-medium text-sm text-slate-800">{m.name}</div>
                                        <div className="text-xs text-slate-400">{m.quantity} {m.unit}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold">{fmt(m.unitCost)}</div>
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${m.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>{m.status || 'N/A'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card title="Recent Payments">
                    {payments.length === 0 ? (
                        <div className="empty-state">No payment records found.</div>
                    ) : (
                        payments.slice(0, 8).map((p, i) => (
                            <div key={i} className="activity-item">
                                <div className={`activity-dot ${p.direction === 'Out' ? 'green' : 'blue'}`} />
                                <div>
                                    <div className="activity-text">{p.category || 'Payment'} — {fmt(p.amount)}</div>
                                    <div className="activity-time">{p.date || ''}</div>
                                </div>
                            </div>
                        ))
                    )}
                </Card>
            </div>
        </div>
    );
}
