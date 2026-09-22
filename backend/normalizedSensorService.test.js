const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeRawSensorRecord,
  classifySensorStatus,
  normalizeRawPayload,
} = require('./normalizedSensorService');

test('valid record is normalized without dropping values', () => {
  const normalized = normalizeRawSensorRecord({
    id: 101,
    device_id: 'device-001',
    recorded_at: '2026-06-06T12:00:00.000Z',
    received_at: '2026-06-06T12:00:00.500Z',
    temperature_raw: 27.2,
    humidity_raw: 55.6,
    co2_raw: 2459,
    lux_raw: 250.4,
    pressure_raw: 999.7,
    gas_raw: 42,
    soil_moisture_raw: 85,
    fan_raw: 1,
    piston_raw: 0,
    raw_payload: {
      ts: 30,
      temp: 27.2,
      hum: 55.6,
      co2: 2459,
      lux: 250.4,
      pressure: 999.7,
      gas: 42,
      soil: 85,
      fan: 1,
      piston: 0,
    },
  });

  assert.equal(normalized.raw_id, 101);
  assert.equal(normalized.device_id, 'device-001');
  assert.equal(normalized.temperature_c, 27.2);
  assert.equal(normalized.temperature_status, 'valid');
  assert.equal(normalized.light_lux, 250.4);
  assert.equal(normalized.light_status, 'valid');
  assert.equal(normalized.gas_raw_value, 42);
  assert.equal(normalized.gas_status, 'valid');
  assert.equal(normalized.normalization_version, 'v1');
});

test('lux sentinel is stored as null with invalid status', () => {
  const normalized = normalizeRawSensorRecord({
    id: 102,
    device_id: 'device-001',
    lux_raw: -999,
    raw_payload: { lux: -999 },
  });

  assert.equal(normalized.light_lux, null);
  assert.equal(normalized.light_status, 'invalid');
});

test('gas sentinel is stored as null with invalid status', () => {
  const normalized = normalizeRawSensorRecord({
    id: 103,
    device_id: 'device-001',
    gas_raw: -1,
    raw_payload: { gas: -1 },
  });

  assert.equal(normalized.gas_raw_value, null);
  assert.equal(normalized.gas_status, 'invalid');
});

test('null field is treated as missing not zero', () => {
  const normalized = normalizeRawSensorRecord({
    id: 104,
    device_id: 'device-001',
    temperature_raw: null,
    raw_payload: { temp: null },
  });

  assert.equal(normalized.temperature_c, null);
  assert.equal(normalized.temperature_status, 'missing');
});

test('missing field yields missing status', () => {
  const normalized = normalizeRawSensorRecord({
    id: 105,
    device_id: 'device-001',
    raw_payload: {},
  });

  assert.equal(normalized.humidity_pct, null);
  assert.equal(normalized.humidity_status, 'missing');
});

test('invalid JSON is rejected and leaves sensors missing', () => {
  const normalized = normalizeRawSensorRecord({
    id: 106,
    device_id: 'device-001',
    raw_payload: '{bad-json}',
  });

  assert.equal(normalized.quality_status, 'invalid');
  assert.equal(normalized.temperature_status, 'missing');
  assert.equal(normalized.light_status, 'missing');
});

test('out-of-range values are flagged instead of silently accepted', () => {
  const normalized = normalizeRawSensorRecord({
    id: 107,
    device_id: 'device-001',
    co2_raw: 999999,
    raw_payload: { co2: 999999 },
  });

  assert.equal(normalized.co2_ppm, null);
  assert.equal(normalized.co2_status, 'out_of_range');
});

test('duplicate raw_id remains traceable and quality is marked duplicate', () => {
  const normalized = normalizeRawSensorRecord({
    id: 108,
    device_id: 'device-001',
    duplicate_raw_id: 101,
    raw_payload: { temp: 20 },
  }, { duplicateRawId: 101 });

  assert.equal(normalized.raw_id, 108);
  assert.equal(normalized.duplicate_raw_id, 101);
  assert.equal(normalized.quality_status, 'duplicate');
});

test('timestamp conversion uses ISO-8601 UTC representation', () => {
  const normalized = normalizeRawSensorRecord({
    id: 109,
    device_id: 'device-001',
    recorded_at: 1714579200000,
    raw_payload: { ts: 1714579200 },
  });

  assert.equal(normalized.recorded_at, '2024-05-01T16:00:00.000Z');
});

test('multiple devices remain isolated by device_id', () => {
  const a = normalizeRawSensorRecord({ id: 110, device_id: 'device-001', temperature_raw: 21.5, raw_payload: { temp: 21.5 } });
  const b = normalizeRawSensorRecord({ id: 111, device_id: 'device-002', temperature_raw: 24.1, raw_payload: { temp: 24.1 } });

  assert.equal(a.device_id, 'device-001');
  assert.equal(b.device_id, 'device-002');
  assert.equal(a.temperature_c, 21.5);
  assert.equal(b.temperature_c, 24.1);
});

test('consecutive invalid measurements keep invalid nulls without interpolation', () => {
  const values = [
    normalizeRawSensorRecord({ id: 112, device_id: 'device-001', lux_raw: -999, raw_payload: { lux: -999 } }),
    normalizeRawSensorRecord({ id: 113, device_id: 'device-001', lux_raw: -999, raw_payload: { lux: -999 } }),
    normalizeRawSensorRecord({ id: 114, device_id: 'device-001', lux_raw: 120, raw_payload: { lux: 120 } }),
    normalizeRawSensorRecord({ id: 115, device_id: 'device-001', lux_raw: 125, raw_payload: { lux: 125 } }),
  ];

  assert.equal(values[0].light_lux, null);
  assert.equal(values[1].light_lux, null);
  assert.equal(values[2].light_lux, 120);
  assert.equal(values[3].light_lux, 125);
  assert.equal(values[0].light_status, 'invalid');
  assert.equal(values[1].light_status, 'invalid');
  assert.equal(values[2].light_status, 'valid');
  assert.equal(values[3].light_status, 'valid');
});

test('recovery from invalid to valid remains explicit', () => {
  const invalid = normalizeRawSensorRecord({ id: 116, device_id: 'device-001', lux_raw: -999, raw_payload: { lux: -999 } });
  const valid = normalizeRawSensorRecord({ id: 117, device_id: 'device-001', lux_raw: 120, raw_payload: { lux: 120 } });

  assert.equal(invalid.light_status, 'invalid');
  assert.equal(valid.light_status, 'valid');
  assert.equal(valid.light_lux, 120);
});

test('classifySensorStatus identifies known states', () => {
  assert.equal(classifySensorStatus(null, 'temperature'), 'missing');
  assert.equal(classifySensorStatus(-999, 'light'), 'invalid');
  assert.equal(classifySensorStatus(2459, 'co2'), 'valid');
  assert.equal(classifySensorStatus(999999, 'co2'), 'out_of_range');
});

test('normalizeRawPayload ignores malformed payloads without mutating input', () => {
  const input = '{broken';
  const parsed = normalizeRawPayload(input);

  assert.deepEqual(parsed, { __invalid_json__: true, raw_value: input });
});
