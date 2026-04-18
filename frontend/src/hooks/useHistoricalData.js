// frontend/src/hooks/useHistoricalData.js
// Fetches historical sensor data via backend API (bypasses Supabase RLS).
// All ranges use GET /api/iot/data/:deviceId?from=...&limit=1500

import { useCallback, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const WINDOW_MS = {
  '1h':  1 * HOUR,
  '6h':  6 * HOUR,
  '24h': 24 * HOUR,
  '7d':  7 * DAY,
  '30d': 30 * DAY,
  '90d': 90 * DAY,
};

function normalizeRow(row) {
  return {
    time:        row.timestamp,
    timestamp:   row.timestamp,
    temperature: row.temperature ?? null,
    humidity:    row.humidity    ?? null,
    co2:         row.co2         ?? null,
    ch4:         row.ch4         ?? null,
    pressure:    row.pressure    ?? null,
    light:       row.light       ?? null,
    soil:        row.soil        ?? null,
  };
}

export default function useHistoricalData(deviceId, range) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!deviceId) { setData([]); return; }
    const windowMs = WINDOW_MS[range] ?? WINDOW_MS['24h'];
    const since = new Date(Date.now() - windowMs).toISOString();

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ from: since, limit: '1500' });
      const resp = await fetch(
        `${API_URL}/api/iot/data/${encodeURIComponent(deviceId)}?${params}`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { data: rows } = await resp.json();
      setData((rows || []).map(normalizeRow));
    } catch (err) {
      setError(err);
      setData([]);
    }
    setLoading(false);
  }, [deviceId, range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
