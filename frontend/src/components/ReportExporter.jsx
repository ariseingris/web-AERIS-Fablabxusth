import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useSubscription } from '../contexts/SubscriptionContext';
import toast from 'react-hot-toast';

const RANGE_OPTIONS = [
  { label: '1h',  hours: 1   },
  { label: '24h', hours: 24  },
  { label: '7d',  hours: 168 },
  { label: '30d', hours: 720 },
];

const SENSOR_COLS = ['timestamp','temperature','humidity','co2','ch4','pressure','light','gas','soil'];

export default function ReportExporter({ device, lang, C }) {
  const { showUpsell, isPro } = useSubscription();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState(24);
  const [exporting, setExporting] = useState(null); // 'csv'|'excel'|'latex'|null

  // ── Fetch sensor data from Supabase ──────────────────────────────────────────
  const fetchSensorData = async (rangeHours = 24) => {
    const since = new Date(Date.now() - rangeHours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('sensor_data')
      .select('timestamp, temperature, humidity, co2, ch4, pressure, light, gas, soil')
      .eq('device_id', device.id)
      .gte('timestamp', since)
      .order('timestamp', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  };

  // ── CSV Export (free) ────────────────────────────────────────────────────────
  const exportCSV = async () => {
    if (!device) return;
    setExporting('csv');
    try {
      const rows = await fetchSensorData(selectedRange);
      if (rows.length === 0) {
        toast.error(lang === 'vi' ? 'Không có dữ liệu' : 'No data found');
        return;
      }
      const csv = [
        SENSOR_COLS.join(','),
        ...rows.map(r => SENSOR_COLS.map(h => r[h] ?? '').join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${device.name}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(lang === 'vi' ? 'Đã xuất CSV' : 'CSV exported');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(null);
    }
  };

  // ── Excel Export (free) — uses SheetJS ──────────────────────────────────────
  const exportExcel = async () => {
    if (!device) return;
    setExporting('excel');
    try {
      const rows = await fetchSensorData(selectedRange);
      if (rows.length === 0) {
        toast.error(lang === 'vi' ? 'Không có dữ liệu' : 'No data found');
        return;
      }
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sensor Data');
      // Auto column widths
      ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 12) }));
      XLSX.writeFile(wb, `${device.name}_${Date.now()}.xlsx`);
      toast.success(lang === 'vi' ? 'Đã xuất Excel' : 'Excel exported');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(null);
    }
  };

  // ── LaTeX Export (PRO only) ─────────────────────────────────────────────────
  const exportLatex = async () => {
    if (!isPro) { showUpsell('export'); return; }
    if (!device) return;
    setExporting('latex');
    try {
      const rows = await fetchSensorData(selectedRange);
      if (rows.length === 0) {
        toast.error(lang === 'vi' ? 'Không có dữ liệu' : 'No data found');
        return;
      }
      const cols = ['timestamp','temperature','humidity','co2','ch4','pressure','light'];
      const header = cols.join(' & ') + ' \\\\';
      const dataRows = rows.map(r =>
        cols.map(c => String(r[c] ?? '-').replace(/_/g, '\\_')).join(' & ') + ' \\\\'
      ).join('\n');

      const latex = `\\begin{table}[h]
\\centering
\\caption{Sensor Data — ${device.name}}
\\begin{tabular}{${'l'.repeat(cols.length)}}
\\hline
${header}
\\hline
${dataRows}
\\hline
\\end{tabular}
\\end{table}`;

      const blob = new Blob([latex], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${device.name}_${Date.now()}.tex`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(lang === 'vi' ? 'Đã xuất LaTeX' : 'LaTeX exported');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(null);
    }
  };

  // ── Format button configs ───────────────────────────────────────────────────
  const formats = [
    { key: 'csv',   label: '📊 CSV',           onClick: exportCSV,   pro: false },
    { key: 'excel', label: '📗 Excel (.xlsx)',  onClick: exportExcel, pro: false },
    { key: 'latex', label: '📄 LaTeX (.tex)',   onClick: exportLatex, pro: true  },
  ];

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

          {/* Range selector */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.subheading, marginBottom: 8, fontWeight: 600 }}>
              {lang === 'vi' ? 'Khoảng thời gian' : 'Time Range'}
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RANGE_OPTIONS.map(({ label, hours }) => {
                const active = selectedRange === hours;
                return (
                  <button
                    key={hours}
                    onClick={() => setSelectedRange(hours)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13,
                      fontFamily: "'DM Mono', monospace", cursor: 'pointer',
                      border: `1px solid ${active ? C.accent : C.cardBorder}`,
                      background: active ? C.accentBg : 'transparent',
                      color: active ? C.accent : C.subheading,
                      fontWeight: active ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >{label}</button>
                );
              })}
            </div>
          </div>

          {/* Device info */}
          {device && (
            <div style={{
              background: C.accentBg, border: `1px solid ${C.accentBorder}`,
              borderRadius: 10, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>{device.icon || '📡'}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.heading }}>{device.name}</div>
                <div style={{ fontSize: 11, color: C.faint, fontFamily: "'DM Mono', monospace" }}>
                  ID: {device.id}
                </div>
              </div>
            </div>
          )}

          {/* Export format buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: C.subheading, fontWeight: 600 }}>
              {lang === 'vi' ? 'Định dạng xuất' : 'Export Format'}
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {formats.map(({ key, label, onClick, pro }) => {
                const isLoading = exporting === key;
                const isDisabled = exporting !== null;
                return (
                  <button
                    key={key}
                    onClick={onClick}
                    disabled={isDisabled}
                    style={{
                      flex: 1, minWidth: 120,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '10px 16px', borderRadius: 10,
                      background: isLoading ? C.accentBg : (C.accentBgStrong || C.accentBg),
                      border: `1px solid ${isLoading ? C.accent : (C.accentBorderStrong || C.accentBorder)}`,
                      color: isLoading ? C.accent : C.subheading,
                      fontSize: 13, fontWeight: 600,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: (isDisabled && !isLoading) ? 0.5 : 1,
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!isDisabled) { e.currentTarget.style.background = C.accentBg; e.currentTarget.style.color = C.accent } }}
                    onMouseLeave={e => { if (!isDisabled) { e.currentTarget.style.background = C.accentBgStrong || C.accentBg; e.currentTarget.style.color = C.subheading } }}
                  >
                    {isLoading ? (
                      <span style={{
                        width: 14, height: 14, display: 'inline-block',
                        border: `2px solid ${C.accent}`, borderTopColor: 'transparent',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      }} />
                    ) : (
                      <span>{label}</span>
                    )}
                    {isLoading && <span style={{ fontSize: 12 }}>
                      {lang === 'vi' ? 'Đang xuất...' : 'Exporting...'}
                    </span>}
                    {pro && !isLoading && (
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        fontFamily: "'DM Mono', monospace",
                        background: isPro
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: isPro ? '#fff' : '#000',
                        borderRadius: 100, padding: '2px 6px',
                        flexShrink: 0,
                      }}>{isPro ? '✓ PRO' : 'PRO'}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
