import { useState, useEffect } from 'react';

export function SettingsView() {
    const [apiKey, setApiKey] = useState('');
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Migration: move API key from sync to local storage
        chrome.storage.sync.get(['openai_api_key'], (syncResult) => {
            if (syncResult.openai_api_key) {
                // Migrate to local storage and remove from sync
                chrome.storage.local.set({ openai_api_key: syncResult.openai_api_key }, () => {
                    chrome.storage.sync.remove('openai_api_key');
                });
                setApiKey(syncResult.openai_api_key);
                setLoading(false);
            } else {
                chrome.storage.local.get(['openai_api_key'], (result) => {
                    if (result.openai_api_key) {
                        setApiKey(result.openai_api_key);
                    }
                    setLoading(false);
                });
            }
        });
    }, []);

    const handleSave = () => {
        chrome.storage.local.set({ openai_api_key: apiKey }, () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        });
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '32px', color: '#fff' }}>
                <div style={{ fontSize: '24px' }}>⟳</div>
            </div>
        );
    }

    const titleStyle: React.CSSProperties = {
        color: '#fff',
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '4px'
    };

    const descStyle: React.CSSProperties = {
        color: '#888',
        fontSize: '12px',
        marginBottom: '20px'
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        color: '#ccc',
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '8px'
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 12px',
        background: '#000',
        border: '1px solid #333',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
        marginBottom: '8px'
    };

    const helpTextStyle: React.CSSProperties = {
        color: '#666',
        fontSize: '12px',
        marginBottom: '16px'
    };

    const getButtonStyle = (): React.CSSProperties => ({
        width: '100%',
        padding: '10px',
        background: saved ? '#166534' : apiKey ? '#9333ea' : '#2a2a2a',
        color: saved ? '#86efac' : '#fff',
        border: saved ? '1px solid #15803d' : 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: apiKey ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s'
    });

    const infoStyle: React.CSSProperties = {
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #333'
    };

    const bulletStyle: React.CSSProperties = {
        color: '#888',
        fontSize: '12px',
        marginBottom: '8px',
        paddingLeft: '16px',
        position: 'relative'
    };

    return (
        <div>
            <h3 style={titleStyle}>API Configuration</h3>
            <p style={descStyle}>Configure your OpenAI API key</p>

            <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>OpenAI API Key</label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    style={inputStyle}
                />
                <p style={helpTextStyle}>Your key is stored locally and never shared</p>
            </div>

            <button onClick={handleSave} disabled={!apiKey || saved} style={getButtonStyle()}>
                {saved ? '✓ Saved Successfully' : 'Save API Key'}
            </button>

            <div style={infoStyle}>
                <p style={bulletStyle}>• Get your key from OpenAI Platform</p>
                <p style={bulletStyle}>• Requires active account with credits</p>
                <p style={bulletStyle}>• Secure API processing via OpenAI</p>
            </div>
        </div>
    );
}
