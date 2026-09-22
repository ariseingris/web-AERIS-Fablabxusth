const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRawSensorRecord,
  detectDuplicate,
  ingestRawSensorEvent,
} = require('./rawSensorService');

test('preserves raw sentinel values without normalization', () => {
  const record = buildRawSensorRecord({
    deviceId: 'dev-001',
    rawPayload: {
      ts: 30,
      temp: 27.2,
      hum: 55.6,
      co2: 2459,
      lux: -999.0,
      pressure: 999.7,
      gas: -1,
      soil: 85,
      fan: 1,
      piston: 0,
    },
    receivedAt: '2026-06-06T12:00:00.000Z',
  });

  assert.equal(record.device_id, 'dev-001');
  assert.equal(record.temperature_raw, 27.2);
  assert.equal(record.lux_raw, -999);
  assert.equal(record.gas_raw, -1);
  assert.equal(record.soil_moisture_raw, 85);
  assert.equal(record.fan_raw, 1);
  assert.equal(record.piston_raw, 0);
  assert.equal(record.source_timestamp, 30);
  assert.equal(record.ingestion_status, 'received');
  assert.deepEqual(record.raw_payload, {
    ts: 30,
    temp: 27.2,
    hum: 55.6,
    co2: 2459,
    lux: -999.0,
    pressure: 999.7,
    gas: -1,
    soil: 85,
    fan: 1,
    piston: 0,
  });
});

test('stores malformed payload as failed ingestion without silent drop', () => {
  const record = buildRawSensorRecord({
    deviceId: 'dev-001',
    rawPayload: '[RX←B] ERR:MODEM_NO_RESPONSE',
    receivedAt: '2026-06-06T12:00:00.000Z',
  });

  assert.equal(record.ingestion_status, 'failed');
  assert.equal(record.error_code, 'MODEM_NO_RESPONSE');
  assert.equal(record.error_message, 'Malformed MQTT payload');
  assert.equal(record.raw_payload, '[RX←B] ERR:MODEM_NO_RESPONSE');
});

test('detects duplicate based on sequence_number while keeping an audit trail', () => {
  const seen = new Set(['seq-42']);
  const duplicate = detectDuplicate({
    deviceId: 'dev-001',
    sequenceNumber: 'seq-42',
    seen,
  });

  assert.equal(duplicate, true);
});

test('ingestRawSensorEvent inserts a raw record for valid payloads', async () => {
  const calls = [];
  const result = await ingestRawSensorEvent({
    deviceId: 'dev-001',
    topic: 'sgh-aeris/gateway/dev-001/sensors',
    payload: '{"ts":30,"temp":27.2,"hum":55.6,"co2":2459,"lux":-999.0,"pressure":999.7,"gas":-1,"soil":85,"fan":1,"piston":0}',
    receivedAt: '2026-06-06T12:00:00.000Z',
    supabase: {
      from(table) {
        return {
          select() {
            calls.push(['select', table]);
            return {
              eq() { return this; },
              limit() { return Promise.resolve({ data: [] }); },
            };
          },
          insert(values) {
            calls.push(['insert', table, values]);
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({ data: values, error: null });
                  },
                };
              },
            };
          },
        };
      },
    },
  });

  assert.equal(result.ingestion_status, 'received');
  assert.equal(result.lux_raw, -999);
  assert.equal(result.gas_raw, -1);
  assert.ok(calls.some(call => call[0] === 'insert'));
});
