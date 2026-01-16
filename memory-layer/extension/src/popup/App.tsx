import { useState, useEffect } from 'react';
import { SettingsView } from './components/SettingsView';

function App() {
    const [activeTab, setActiveTab] = useState<'memories' | 'settings'>('memories');
    const [loading, setLoading] = useState(false);
    const [captureStatus, setCaptureStatus] = useState('');
    const [stats, setStats] = useState({ total: 0 });
    const [recentMemories, setRecentMemories] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const statsRes = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
            if (statsRes && statsRes.success) setStats({ total: statsRes.total });

            const recentRes = await chrome.runtime.sendMessage({ type: 'GET_RECENT_MEMORIES' });
            if (recentRes && recentRes.success) setRecentMemories(recentRes.memories);
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };

    const captureMemory = async () => {
        setLoading(true);
        setCaptureStatus('Analyzing...');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) throw new Error("No active tab");

            const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' });
            if (!response || !response.text) {
                throw new Error("Could not extract text");
            }

            setCaptureStatus('Saving...');
            const res = await chrome.runtime.sendMessage({
                type: 'CAPTURE_CONVERSATION',
                payload: { text: response.text, url: response.url }
            });

            if (res.success) {
                setCaptureStatus('✓ Saved!');
                setTimeout(() => {
                    setCaptureStatus('');
                    setLoading(false);
                    loadData();
                }, 1500);
            } else {
                throw new Error(res.message);
            }
        } catch (error: any) {
            setCaptureStatus('⚠ Error');
            setLoading(false);
            setTimeout(() => setCaptureStatus(''), 2000);
        }
    };

    const containerStyle: React.CSSProperties = {
        width: '400px',
        height: '600px',
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        borderRadius: '16px',
        overflow: 'hidden'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #333',
        background: '#000'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: '700',
        color: '#fff'
    };

    const closeButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: '24px',
        cursor: 'pointer',
        padding: '0',
        lineHeight: '1'
    };

    const tabsContainerStyle: React.CSSProperties = {
        display: 'flex',
        padding: '12px 20px 0',
        background: '#000'
    };

    const getTabStyle = (isActive: boolean): React.CSSProperties => ({
        background: 'none',
        border: 'none',
        color: isActive ? '#fff' : '#888',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        padding: '0 0 12px',
        marginRight: '32px',
        borderBottom: isActive ? '2px solid #9333ea' : '2px solid transparent',
        transition: 'all 0.2s'
    });

    const mainStyle: React.CSSProperties = {
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        background: '#000'
    };

    const cardStyle: React.CSSProperties = {
        background: '#1a1a1a',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #333',
        marginBottom: '16px'
    };

    const statsLabelStyle: React.CSSProperties = {
        color: '#888',
        fontSize: '12px',
        marginBottom: '8px'
    };

    const statsValueStyle: React.CSSProperties = {
        color: '#fff',
        fontSize: '32px',
        fontWeight: '700',
        marginBottom: '16px'
    };

    const buttonStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px',
        background: loading ? '#581c87' : '#9333ea',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: loading ? 'wait' : 'pointer',
        transition: 'all 0.2s'
    };

    const memoryCardStyle: React.CSSProperties = {
        background: '#1a1a1a',
        borderRadius: '16px',
        padding: '16px',
        border: '1px solid #333',
        marginBottom: '12px'
    };

    const memoryTextStyle: React.CSSProperties = {
        color: '#fff',
        fontSize: '14px',
        lineHeight: '1.6',
        marginBottom: '12px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
    };

    const tagStyle: React.CSSProperties = {
        display: 'inline-block',
        padding: '4px 8px',
        background: '#2a2a2a',
        color: '#ccc',
        fontSize: '10px',
        borderRadius: '8px',
        marginRight: '8px'
    };

    const emptyStateStyle: React.CSSProperties = {
        textAlign: 'center',
        padding: '40px 20px',
        color: '#666'
    };

    const footerStyle: React.CSSProperties = {
        padding: '12px 20px',
        borderTop: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#000'
    };

    const kbdStyle: React.CSSProperties = {
        padding: '4px 8px',
        background: '#1a1a1a',
        color: '#888',
        fontSize: '10px',
        borderRadius: '8px',
        border: '1px solid #333',
        fontFamily: 'monospace'
    };

    return (
        <div style={containerStyle}>
            <header style={headerStyle}>
                <h1 style={titleStyle}>AI Brain</h1>
                <button style={closeButtonStyle} onClick={() => window.close()}>×</button>
            </header>

            <div style={tabsContainerStyle}>
                <button style={getTabStyle(activeTab === 'memories')} onClick={() => setActiveTab('memories')}>
                    Recent Memories
                </button>
                <button style={getTabStyle(activeTab === 'settings')} onClick={() => setActiveTab('settings')}>
                    Settings
                </button>
            </div>

            <main style={mainStyle}>
                {activeTab === 'memories' ? (
                    <div>
                        <div style={cardStyle}>
                            <div style={statsLabelStyle}>Total Memories</div>
                            <div style={statsValueStyle}>{stats.total}</div>
                            <button style={buttonStyle} onClick={captureMemory} disabled={loading}>
                                {captureStatus || '+ Capture Page Memory'}
                            </button>
                        </div>

                        <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Recent</h3>

                        {recentMemories.length === 0 ? (
                            <div style={emptyStateStyle}>
                                <p style={{ fontSize: '14px', marginBottom: '4px' }}>No memories yet</p>
                                <p style={{ fontSize: '12px', color: '#444' }}>Capture your first one above</p>
                            </div>
                        ) : (
                            recentMemories.map((mem) => (
                                <div key={mem.id} style={memoryCardStyle}>
                                    <p style={memoryTextStyle}>{mem.content}</p>
                                    <div>
                                        <span style={tagStyle}>{mem.type}</span>
                                        {mem.source?.platform && (
                                            <span style={{ ...tagStyle, background: '#1e3a8a', color: '#93c5fd' }}>
                                                {mem.source.platform}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div style={cardStyle}>
                        <SettingsView />
                    </div>
                )}
            </main>

            <footer style={footerStyle}>
                <span style={kbdStyle}>Ctrl+M</span>
                <span style={{ color: '#666', fontSize: '10px' }}>v1.0.0</span>
            </footer>
        </div>
    );
}

export default App;
