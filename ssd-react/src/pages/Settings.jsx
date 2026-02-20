
import { Database, Info } from 'lucide-react';
import Card from '../components/Card';

export default function Settings() {
    return (
        <div className="settings-page" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={24} /> Settings & Data
            </h1>

            <Card title="Application Info">
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                        <div style={{ background: '#e0f2fe', padding: '10px', borderRadius: '50%', color: '#0284c7' }}>
                            <Info size={24} />
                        </div>
                        <div>
                            <h3 style={{ marginTop: 0, marginBottom: '5px' }}>SSD Construction Manager</h3>
                            <p className="text-muted" style={{ margin: 0 }}>Version 2.0</p>
                            <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#666', lineHeight: '1.5' }}>
                                <p>This application automatically saves your data to your local device database.</p>
                                <p>Your data is persistent and will be available every time you open the application.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
