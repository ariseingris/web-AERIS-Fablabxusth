CREATE TABLE IF NOT EXISTS public.raw_sensor_data (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_timestamp TEXT,
  source_ts BIGINT,
  sequence_number TEXT,
  temperature_raw DOUBLE PRECISION,
  humidity_raw DOUBLE PRECISION,
  co2_raw DOUBLE PRECISION,
  lux_raw DOUBLE PRECISION,
  pressure_raw DOUBLE PRECISION,
  gas_raw DOUBLE PRECISION,
  soil_moisture_raw DOUBLE PRECISION,
  fan_raw DOUBLE PRECISION,
  piston_raw DOUBLE PRECISION,
  raw_payload JSONB NOT NULL,
  ingestion_status TEXT NOT NULL DEFAULT 'received',
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  topic TEXT
);

CREATE INDEX IF NOT EXISTS idx_raw_sensor_data_device_recorded_at
  ON public.raw_sensor_data (device_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_raw_sensor_data_created_at
  ON public.raw_sensor_data (created_at);

CREATE INDEX IF NOT EXISTS idx_raw_sensor_data_device_sequence
  ON public.raw_sensor_data (device_id, sequence_number);
