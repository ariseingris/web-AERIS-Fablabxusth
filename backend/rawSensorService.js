const { persistNormalizedSensorRecord } = require('./normalizedSensorService');

const RAW_SENSOR_FIELD_MAP = [
  ['temperature_raw', 'temp'],
  ['humidity_raw', 'hum'],
  ['co2_raw', 'co2'],
  ['lux_raw', 'lux'],
  ['pressure_raw', 'pressure'],
  ['gas_raw', 'gas'],
  ['soil_moisture_raw', 'soil'],
  ['fan_raw', 'fan'],
  ['piston_raw', 'piston'],
];

function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function safeDeviceId(deviceId) {
  return String(deviceId || '').trim();
}

function maybeParseJson(rawPayload) {
  if (rawPayload === null || rawPayload === undefined) return null;
  if (typeof rawPayload === 'object') return rawPayload;
  if (typeof rawPayload !== 'string') return rawPayload;
  const trimmed = rawPayload.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function readSourceTimestamp(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) return null;
  const direct = rawPayload.ts ?? rawPayload.source_timestamp ?? rawPayload.sourceTs ?? rawPayload.source_timestamp_raw ?? null;
  return direct ?? null;
}

function readSequenceNumber(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) return null;
  return rawPayload.sequence_number ?? rawPayload.sequenceNumber ?? rawPayload.message_id ?? rawPayload.messageId ?? null;
}

function classifyError(rawPayload) {
  const value = String(rawPayload ?? '').trim();
  if (!value) {
    return { code: 'EMPTY_PAYLOAD', message: 'Empty MQTT payload' };
  }

  if (value.includes('MODEM_NO_RESPONSE')) {
    return { code: 'MODEM_NO_RESPONSE', message: 'Malformed MQTT payload' };
  }

  if (value.includes('ERR:')) {
    const match = value.match(/ERR:([A-Z0-9_]+)/i);
    return {
      code: match ? match[1].toUpperCase() : 'MQTT_ERROR',
      message: 'Malformed MQTT payload',
    };
  }

  return { code: 'PARSE_ERROR', message: 'Malformed MQTT payload' };
}

function buildRawSensorRecord({
  deviceId,
  rawPayload,
  receivedAt = new Date().toISOString(),
  topic = null,
  sequenceNumber = null,
  sourceTimestamp = null,
}) {
  const safeId = safeDeviceId(deviceId);
  if (!safeId) {
    throw new Error('deviceId is required');
  }

  const parsedPayload = maybeParseJson(rawPayload);
  const isObjectPayload = parsedPayload && typeof parsedPayload === 'object' && !Array.isArray(parsedPayload);
  const sourceValue = sourceTimestamp ?? readSourceTimestamp(parsedPayload ?? rawPayload) ?? null;
  const sourceTimestampValue = sourceValue === null || sourceValue === undefined ? null : sourceValue;
  const numericSourceTs = typeof sourceTimestampValue === 'number'
    ? sourceTimestampValue
    : (typeof sourceTimestampValue === 'string' && sourceTimestampValue.trim() !== ''
        ? Number(sourceTimestampValue)
        : null);

  const baseRecord = {
    device_id: safeId,
    recorded_at: receivedAt,
    received_at: receivedAt,
    source_timestamp: sourceTimestampValue,
    source_ts: Number.isFinite(numericSourceTs) ? numericSourceTs : null,
    sequence_number: sequenceNumber ?? readSequenceNumber(parsedPayload ?? rawPayload) ?? null,
    raw_payload: rawPayload,
    ingestion_status: 'received',
    error_code: null,
    error_message: null,
    created_at: new Date().toISOString(),
    topic: topic || null,
  };

  if (!isObjectPayload) {
    const errorInfo = classifyError(rawPayload);
    return {
      ...baseRecord,
      raw_payload: rawPayload,
      ingestion_status: 'failed',
      error_code: errorInfo.code,
      error_message: errorInfo.message,
    };
  }

  const record = {
    ...baseRecord,
    raw_payload: parsedPayload,
    temperature_raw: toNumber(parsedPayload.temp),
    humidity_raw: toNumber(parsedPayload.hum),
    co2_raw: toNumber(parsedPayload.co2),
    lux_raw: toNumber(parsedPayload.lux),
    pressure_raw: toNumber(parsedPayload.pressure),
    gas_raw: toNumber(parsedPayload.gas),
    soil_moisture_raw: toNumber(parsedPayload.soil),
    fan_raw: toNumber(parsedPayload.fan),
    piston_raw: toNumber(parsedPayload.piston),
  };

  for (const [column, key] of RAW_SENSOR_FIELD_MAP) {
    if (record[column] === null && Object.prototype.hasOwnProperty.call(parsedPayload, key)) {
      record[column] = toNumber(parsedPayload[key]);
    }
  }

  return record;
}

async function ingestRawSensorEvent({
  deviceId,
  topic,
  payload,
  receivedAt = new Date().toISOString(),
  sequenceNumber = null,
  sourceTimestamp = null,
  supabase = null,
}) {
  const record = buildRawSensorRecord({
    deviceId,
    rawPayload: payload,
    receivedAt,
    topic,
    sequenceNumber,
    sourceTimestamp,
  });

  if (!supabase) {
    return record;
  }

  const sequence = record.sequence_number;
  if (sequence !== null && sequence !== undefined && sequence !== '') {
    const { data: existing, error: lookupError } = await supabase
      .from('raw_sensor_data')
      .select('id')
      .eq('device_id', record.device_id)
      .eq('sequence_number', sequence)
      .limit(1);

    if (!lookupError && Array.isArray(existing) && existing.length > 0) {
      const duplicateRecord = {
        ...record,
        ingestion_status: 'duplicate',
        error_code: 'DUPLICATE_MESSAGE',
        error_message: 'Duplicate raw sensor event detected',
      };

      const { data, error } = await supabase
        .from('raw_sensor_data')
        .insert(duplicateRecord)
        .select()
        .single();

      if (error) throw new Error(error.message);

      try {
        await persistNormalizedSensorRecord({ rawRecord: data || duplicateRecord, supabase });
      } catch (normalizeError) {
        console.warn('⚠️  Failed to normalize duplicate raw sensor record:', normalizeError.message);
      }

      return data || duplicateRecord;
    }
  }

  const { data, error } = await supabase
    .from('raw_sensor_data')
    .insert(record)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  try {
    await persistNormalizedSensorRecord({ rawRecord: data || record, supabase });
  } catch (normalizeError) {
    console.warn('⚠️  Failed to normalize raw sensor record:', normalizeError.message);
  }

  return data || record;
}

function detectDuplicate({ deviceId, sequenceNumber, seen = new Set() }) {
  if (deviceId === null || deviceId === undefined || sequenceNumber === null || sequenceNumber === undefined || sequenceNumber === '') {
    return false;
  }

  const rawKey = String(sequenceNumber);
  const scopedKey = `${String(deviceId)}:${rawKey}`;
  return seen.has(rawKey) || seen.has(scopedKey);
}

module.exports = {
  buildRawSensorRecord,
  detectDuplicate,
  ingestRawSensorEvent,
  RAW_SENSOR_FIELD_MAP,
};
