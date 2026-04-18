import React, { useState } from 'react';
import { useLang } from '../contexts/LangContext';
import { useColors } from '../hooks/useColors';
import { useMqttBridge } from '../hooks/useMqttBridge';

export default function ReportExporter({ device, lang, C }) {
  const [isOpen, setIsOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [format, setFormat] = useState('summary');
  const [aiWritten, setAiWritten] = useState(false);
  const [fileType, setFileType] = useState('excel');
  const [isExporting, setIsExporting] = useState(false);

  const CLocal = {
    ...C,
    buttonBg: C.accentBgStrong || '#e0f2fe',
    buttonBorder: C.accentBorderStrong || '#bae6fd'
  };

  const handleExport = async () => {
    if (!device) return;
    setIsExporting(true);
    
    try {
      const token = localStorage.getItem('supabase.auth.token'); // Adjust depending on your auth storage
      const parsedToken = token ? JSON.parse(token)?.currentSession?.access_token : null;
      const headers = {
        'Authorization': `Bearer ${parsedToken}`,
      };

      let url;
      let options = {};

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      if (aiWritten) {
        url = `${API_BASE}/api/reports/ai-write`;
        options = {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: device.id,
            from: fromDate,
            to: toDate,
            format: fileType,
            language: lang,
          }),
        };
      } else {
        const query = new URLSearchParams({
          from: fromDate,
          to: toDate,
          format: format,
        });
        url = `${API_BASE}/api/reports/excel/${device.id}?${query.toString()}`;
        options = { method: 'GET', headers };
      }

      const response = await fetch(url, options);
      
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      const ext = aiWritten && fileType === 'docx' ? 'docx' : (aiWritten && fileType === 'latex' ? 'tex' : 'xlsx');
      a.download = `report_${device.id}_${new Date().getTime()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{
      background: C.cardBg, border: `1px solid ${C.cardBorder}`,
      borderRadius: 16, padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.heading, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📄</span>
          {lang === 'vi' ? 'Xuất báo cáo' : 'Export Report'}
        </h3>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: C.subheading }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.subheading, marginBottom: 4 }}>
                {lang === 'vi' ? 'Từ ngày' : 'From Date'}
              </label>
              <input 
                type="datetime-local" 
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{
                  width: '100%', background: C.accentBg, border: `1px solid ${C.cardBorder}`,
                  borderRadius: 8, padding: '8px 12px', color: C.body, fontSize: 13, outline: 'none'
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.subheading, marginBottom: 4 }}>
                {lang === 'vi' ? 'Đến ngày' : 'To Date'}
              </label>
              <input 
                type="datetime-local" 
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{
                  width: '100%', background: C.accentBg, border: `1px solid ${C.cardBorder}`,
                  borderRadius: 8, padding: '8px 12px', color: C.body, fontSize: 13, outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div 
              onClick={() => setAiWritten(!aiWritten)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                background: aiWritten ? C.accentBg : 'transparent',
                border: `1px solid ${aiWritten ? C.accent : C.cardBorder}`,
                padding: '6px 12px', borderRadius: 8, transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 16 }}>{aiWritten ? '✨' : '📝'}</span>
              <span style={{ fontSize: 13, color: aiWritten ? C.accent : C.subheading, fontWeight: 500 }}>
                {lang === 'vi' ? 'Báo cáo AI' : 'AI-written report'}
              </span>
            </div>
          </div>

          {aiWritten ? (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.subheading, marginBottom: 4 }}>
                {lang === 'vi' ? 'Định dạng' : 'Format'}
              </label>
              <select 
                value={fileType}
                onChange={e => setFileType(e.target.value)}
                style={{
                  width: '100%', background: C.accentBg, border: `1px solid ${C.cardBorder}`,
                  borderRadius: 8, padding: '8px 12px', color: C.body, fontSize: 13, outline: 'none'
                }}
              >
                <option value="excel">Excel (.xlsx)</option>
                <option value="docx">Word (.docx)</option>
                <option value="latex">LaTeX (.tex)</option>
              </select>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.subheading, marginBottom: 4 }}>
                {lang === 'vi' ? 'Định dạng' : 'Format'}
              </label>
              <select 
                value={format}
                onChange={e => setFormat(e.target.value)}
                style={{
                  width: '100%', background: C.accentBg, border: `1px solid ${C.cardBorder}`,
                  borderRadius: 8, padding: '8px 12px', color: C.body, fontSize: 13, outline: 'none'
                }}
              >
                <option value="summary">{lang === 'vi' ? 'Tóm tắt' : 'Summary'}</option>
                <option value="detailed">{lang === 'vi' ? 'Chi tiết' : 'Detailed'}</option>
              </select>
            </div>
          )}

          <button 
            onClick={handleExport}
            disabled={isExporting}
            style={{
              background: CLocal.buttonBg, border: `1px solid ${CLocal.buttonBorder}`,
              color: C.accent, borderRadius: 8, padding: '10px 16px',
              fontSize: 14, fontWeight: 600, cursor: isExporting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
              opacity: isExporting ? 0.7 : 1
            }}
          >
            {isExporting ? (
              <span className="spinner" style={{ 
                width: 16, height: 16, border: '2px solid', borderTopColor: 'transparent', 
                borderRadius: '50%', animation: 'spin 1s linear infinite' 
              }}></span>
            ) : (lang === 'vi' ? 'Xuất' : 'Export')}
          </button>
        </div>
      )}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
