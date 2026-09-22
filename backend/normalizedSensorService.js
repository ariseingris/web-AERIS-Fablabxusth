const DEFAULT_NORMALIZATION_VERSION = 'v1';

const SENSOR_STATUS_VALUES = ['valid', 'invalid', 'missing', 'out_of_range'];

const SENSOR_RULES = {
  temperature: {
    valueKey: 'temperature_raw',
    outputKey: 'temperature_c',
    statusKey: 'temperature_status',
    invalidSentinels: [-999],
    range: { min: -50, max: 80 },
  },
  humidity: {
    valueKey: 'humidity_raw',
    outputKey: 'humidity_pct',
    statusKey: 'humidity_status',
    invalidSentinels: [-999],
    range: { min: 0, max: 100 },
  },
  co2: {
    valueKey: 'co2_raw',
    outputKey: 'co2_ppm',
    statusKey: 'co2_status',
    invalidSentinels: [-1],
    range: { min: 0, max: 100000 },
  },
  light: {
    valueKey: 'lux_raw',
    outputKey: 'light_lux',
    statusKey: 'light_status',
    invalidSentinels: [-999],
    range: { min: 0, max: 100000 },
  },
  pressure: {
    valueKey: 'pressure_raw',
    outputKey: 'pressure_hpa',
    statusKey: 'pressure_status',
    invalidSentinels: [-999],
    range: { min: 500, max: 1200 },
  },
  gas: {
    valueKey: 'gas_raw',
    outputKey: 'gas_raw_value',
    statusKey: 'gas_status',
    invalidSentinels: [-1],
    range: { min: 0, max: 100000 },
  },
  soil: {
    valueKey: 'soil_moisture_raw',
    outputKey: 'soil_moisture_pct',
    statusKey: 'soil_status',
    invalidSentinels: [-999],
    range: { min: 0, max: 100 },
  },
  fan: {
    valueKey: 'fan_raw',
    outputKey: 'fan_state',
    statusKey: 'fan_status',
    invalidSentinels: [-1],
    range: { min: 0, max: 1 },
  },
  piston: {
    valueKey: 'piston_raw',
    outputKey: 'piston_state',
    statusKey: 'piston_status',
    invalidSentinels: [-1],
    range: { min: 0, max: 1 },
  },
};

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const timestampMs = value > 1e12 ? value : value * 1000;
    const date = new Date(timestampMs);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const numericValue = Number(trimmed);
      if (Number.isFinite(numericValue)) {
        const timestampMs = numericValue > 1e12 ? numericValue : numericValue * 1000;
        const date = new Date(timestampMs);
        if (!Number.isNaN(date.getTime())) return date.toISOString();
      }
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function normalizeRawPayload(rawPayload) {
  if (rawPayload === null || rawPayload === undefined) {
    return { __invalid_json__: true, raw_value: rawPayload };
  }

  if (typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
    return rawPayload;
  }

  if (typeof rawPayload === 'string') {
    const trimmed = rawPayload.trim();
    if (!trimmed) {
      return { __invalid_json__: true, raw_value: rawPayload };
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return { __invalid_json__: true, raw_value: rawPayload };
    } catch {
      return { __invalid_json__: true, raw_value: rawPayload };
    }
  }

  return { __invalid_json__: true, raw_value: rawPayload };
}

function hasInvalidPayload(payload) {
  return !!(payload && payload.__invalid_json__ === true);
}

function classifySensorStatus(value, sensorKey) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'missing';
  }

  const numericValue = Number(value);
  const rule = SENSOR_RULES[sensorKey];
  if (!rule) {
    return 'valid';
  }

  if (rule.invalidSentinels.some((sentinel) => numericValue === sentinel)) {
    return 'invalid';
  }

  if (rule.range && (numericValue < rule.range.min || numericValue > rule.range.max)) {
    return 'out_of_range';
  }

  return 'valid';
}

function extractRawValue(record, payload, field, fallbackKey) {
  const candidate = record?.[field] ?? payload?.[fallbackKey] ?? payload?.[field] ?? null;
  const numericValue = toNumber(candidate);
  return numericValue;
}

function buildNormalizedRecordBase(record, payload) {
  const sourcePayload = normalizeRawPayload(payload ?? record?.raw_payload ?? record?.rawPayload ?? {});
  const isInvalidPayload = hasInvalidPayload(sourcePayload);
  const rawId = record?.id ?? record?.raw_id ?? null;
  const deviceId = record?.device_id ?? record?.deviceId ?? null;

  const normalized = {
    raw_id: rawId,
    duplicate_raw_id: record?.duplicate_raw_id ?? record?.duplicateRawId ?? null,
    device_id: deviceId,
    recorded_at: normalizeTimestamp(record?.recorded_at ?? record?.timestamp ?? sourcePayload?.ts ?? sourcePayload?.source_timestamp ?? null),
    received_at: normalizeTimestamp(record?.received_at ?? record?.receivedAt ?? record?.created_at ?? new Date().toISOString()),
    temperature_c: null,
    temperature_status: 'missing',
    humidity_pct: null,
    humidity_status: 'missing',
    co2_ppm: null,
    co2_status: 'missing',
    light_lux: null,
    light_status: 'missing',
    pressure_hpa: null,
    pressure_status: 'missing',
    gas_raw_value: null,
    gas_status: 'missing',
    soil_moisture_pct: null,
    soil_status: 'missing',
    fan_state: null,
    piston_state: null,
    quality_status: isInvalidPayload ? 'invalid' : 'valid',
    normalization_version: DEFAULT_NORMALIZATION_VERSION,
    created_at: normalizeTimestamp(record?.created_at ?? new Date().toISOString()),
  };

  const rawValues = {
    temperature: extractRawValue(record, sourcePayload, 'temperature_raw', 'temp'),
    humidity: extractRawValue(record, sourcePayload, 'humidity_raw', 'hum'),
    co2: extractRawValue(record, sourcePayload, 'co2_raw', 'co2'),
    light: extractRawValue(record, sourcePayload, 'lux_raw', 'lux'),
    pressure: extractRawValue(record, sourcePayload, 'pressure_raw', 'pressure'),
    gas: extractRawValue(record, sourcePayload, 'gas_raw', 'gas'),
    soil: extractRawValue(record, sourcePayload, 'soil_moisture_raw', 'soil'),
    fan: extractRawValue(record, sourcePayload, 'fan_raw', 'fan'),
    piston: extractRawValue(record, sourcePayload, 'piston_raw', 'piston'),
  };

  for (const [sensorKey, rule] of Object.entries(SENSOR_RULES)) {
    const rawValue = rawValues[sensorKey];
    const status = classifySensorStatus(rawValue, sensorKey);
    const value = status === 'valid' ? rawValue : null;

    normalized[rule.outputKey] = value;
    normalized[rule.statusKey] = status;

    if (!isInvalidPayload && sensorKey === 'gas' && rawValue === null) {
      normalized[rule.outputKey] = null;
      normalized[rule.statusKey] = 'missing';
    }
  }

  if (isInvalidPayload) {
    for (const [sensorKey, rule] of Object.entries(SENSOR_RULES)) {
      normalized[rule.outputKey] = null;
      normalized[rule.statusKey] = 'missing';
    }
  }

  if (record?.duplicate_raw_id || record?.duplicateRawId) {
    normalized.quality_status = 'duplicate';
  } else if (isInvalidPayload) {
    normalized.quality_status = 'invalid';
  } else if (Object.values(normalized).some((value) => value === 'out_of_range')) {
    normalized.quality_status = 'out_of_range';
  } else if (Object.values(normalized).some((value) => value === 'invalid')) {
    normalized.quality_status = 'invalid';
  } else if (Object.values(normalized).some((value) => value === 'missing')) {
    normalized.quality_status = 'missing';
  } else {
    normalized.quality_status = 'valid';
  }

  normalized.quality_score = normalized.quality_status === 'valid' ? 1 : normalized.quality_status === 'duplicate' ? 0 : normalized.quality_status === 'invalid' ? 0.25 : normalized.quality_status === 'out_of_range' ? 0.3 : 0.15;

  return normalized;
}

function normalizeRawSensorRecord(record, options = {}) {
  const recordWithOptions = { ...record, ...(options || {}) };
  const payload = recordWithOptions.raw_payload ?? recordWithOptions.rawPayload ?? {};
  const sanitizedRecord = { ...recordWithOptions };
  const fallbackPayload = normalizeRawPayload(payload);

  if (recordWithOptions.duplicate_raw_id == null && recordWithOptions.duplicateRawId != null) {
    sanitizedRecord.duplicate_raw_id = recordWithOptions.duplicateRawId;
  }

  const normalized = buildNormalizedRecordBase(sanitizedRecord, fallbackPayload);

  if (!normalized.recorded_at) {
    normalized.recorded_at = normalizeTimestamp(recordWithOptions.recorded_at ?? recordWithOptions.timestamp ?? fallbackPayload?.ts ?? null);
  }

  return normalized;
}

async function persistNormalizedSensorRecord({ rawRecord, supabase }) {
  if (!supabase) {
    return normalizeRawSensorRecord(rawRecord);
  }

  const normalized = normalizeRawSensorRecord(rawRecord);
  const rawId = normalized.raw_id;
  if (!rawId || rawId === 'null') {
    return normalized;
  }

  const { data: existing, error: lookupError } = await supabase
    .from('normalized_sensor_data')
    .select('id')
    .eq('raw_id', rawId)
    .limit(1);

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (Array.isArray(existing) && existing.length > 0) {
    const { error } = await supabase
      .from('normalized_sensor_data')
      .update(normalized)
      .eq('raw_id', rawId);

    if (error) {
      throw new Error(error.message);
    }

    return { ...normalized, updated: true };
  }

  const { data, error } = await supabase
    .from('normalized_sensor_data')
    .insert(normalized)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data || normalized;
}

module.exports = {
  DEFAULT_NORMALIZATION_VERSION,
  SENSOR_STATUS_VALUES,
  SENSOR_RULES,
  classifySensorStatus,
  normalizeRawPayload,
  normalizeRawSensorRecord,
  normalizeTimestamp,
  persistNormalizedSensorRecord,
  toNumber,
};
