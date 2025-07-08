'use client';
import React, { useState } from 'react';

export default function TestAlertPage() {
  const [alertMessage, setAlertMessage] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch('/api/bybit/tradingview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_message: alertMessage })
      });
      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
        setResponse(data);
      } else {
        const text = await res.text();
        throw new Error(`Non-JSON response: ${text}`);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const buttonBg =
    loading || !alertMessage.trim()
      ? '#b3cdf6'
      : isHovered
        ? '#1d4ed8'
        : '#2563eb';

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '40px auto',
        padding: 32,
        border: '1px solid #e0e0e0',
        borderRadius: 12,
        background: '#f7f8fa',
        color: '#222',
        fontFamily: 'Inter, Arial, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}
    >
      <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 18 }}>
        Test Bybit TradingView API
      </h2>
      <label
        htmlFor="alert-message"
        style={{
          fontWeight: 600,
          fontSize: 16,
          marginBottom: 6,
          display: 'block'
        }}
      >
        Alert Message:
      </label>
      <textarea
        id="alert-message"
        value={alertMessage}
        onChange={(e) => setAlertMessage(e.target.value)}
        rows={4}
        style={{
          width: '100%',
          marginBottom: 18,
          fontSize: 16,
          padding: 10,
          borderRadius: 6,
          border: '1px solid #ccc',
          color: '#222',
          background: '#fff',
          resize: 'vertical'
        }}
        placeholder="Primescope LONG Entry! Symbol: BTCUSD, Price: 45000.50"
      />
      <button
        onClick={handleSend}
        disabled={loading || !alertMessage.trim()}
        style={{
          padding: '10px 28px',
          fontWeight: 700,
          fontSize: 16,
          background: buttonBg,
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: loading || !alertMessage.trim() ? 'not-allowed' : 'pointer',
          boxShadow: '0 1px 4px rgba(37,99,235,0.08)',
          transition: 'background 0.2s'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {loading ? 'Sending...' : 'Send Alert'}
      </button>
      {error && (
        <div style={{ color: '#b91c1c', marginTop: 18, fontWeight: 600 }}>
          Error: {error}
        </div>
      )}
      {response && (
        <div style={{ marginTop: 32 }}>
          <strong style={{ fontSize: 17 }}>API Response:</strong>
          <pre
            style={{
              background: '#23272e',
              color: '#f3f3f3',
              padding: 16,
              borderRadius: 6,
              marginTop: 10,
              fontSize: 15,
              overflowX: 'auto'
            }}
          >
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
