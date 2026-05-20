'use strict';
// Connectivity smoke-test: connects to HiveMQ Cloud, publishes one message,
// waits to receive it back, then exits 0 on success or 1 on failure.

require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });

const mqtt = require('mqtt');

const BROKER   = process.env.MQTT_BROKER;
const USERNAME = process.env.MQTT_USERNAME;
const PASSWORD = process.env.MQTT_PASSWORD;

if (!BROKER || !USERNAME || !PASSWORD) {
  console.error('❌ MQTT round-trip FAILED: MQTT_BROKER / MQTT_USERNAME / MQTT_PASSWORD not set in backend/.env');
  process.exit(1);
}

const TEST_TOPIC   = 'sgh-aeris/gateway/TEST_DEVICE/sensors';
const TEST_PAYLOAD = JSON.stringify({ temp: 25.0, hum: 60, timestamp: new Date().toISOString() });

const client = mqtt.connect(BROKER, {
  username: USERNAME,
  password: PASSWORD,
  rejectUnauthorized: true,
  connectTimeout: 5000,
});

const timer = setTimeout(() => {
  console.error('❌ MQTT round-trip FAILED: timed out after 5 seconds (no message received)');
  client.end(true);
  process.exit(1);
}, 5000);

client.on('error', e => {
  clearTimeout(timer);
  console.error('❌ MQTT round-trip FAILED:', e.message);
  client.end(true);
  process.exit(1);
});

client.on('connect', () => {
  client.subscribe(TEST_TOPIC, { qos: 1 }, err => {
    if (err) {
      clearTimeout(timer);
      console.error('❌ MQTT round-trip FAILED: subscribe error:', err.message);
      client.end(true);
      process.exit(1);
    }
    client.publish(TEST_TOPIC, TEST_PAYLOAD, { qos: 1 });
  });
});

client.on('message', (topic, payload) => {
  if (topic === TEST_TOPIC) {
    clearTimeout(timer);
    console.log('✅ MQTT round-trip OK');
    client.end();
    process.exit(0);
  }
});
