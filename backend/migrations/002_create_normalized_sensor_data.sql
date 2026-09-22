CREATE TABLE IF NOT EXISTS public.normalized_sensor_data (
  id BIGSERIAL PRIMARY KEY,
  raw_id BIGINT NOT NULL UNIQUE REFERENCES public.raw_sensor_data(id) ON DELETE RESTRICT,
  duplicate_raw_id BIGINT,
  device_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  temperature_c DOUBLE PRECISION,
  temperature_status TEXT NOT NULL DEFAULT 'missing' CHECK (
    temperature_status IN ('valid', 'invalid', 'missing', 'out_of_range')
  ),
  humidity_pct DOUBLE PRECISION,
  humidity_status TEXT NOT NULL DEFAULT 'missing' CHECK (
    humidity_status IN ('valid', 'invalid', 'missing', 'out_of_range')
  ),
  co2_ppm DOUBLE PRECISION,
  co2_status TEXT NOT NULL DEFAULT 'missing' CHECK (
    co2_status IN ('valid', 'invalid', 'missing', 'out_of_range')
  ),
  light_lux DOUBLE PRECISION,
  light_status TEXT NOT NULL DEFAULT 'missing' CHECK (
    light_status IN ('valid', 'invalid', 'missing', 'out_of_range')
  ),
  pressure_hpa DOUBLE PRECISION,
  pressure_status TEXT NOT NULL DEFAULT 'missing' CHECK (
    pressure_status IN ('valid', 'invalid', 'missing', 'out_of_range')
  ),
  gas_raw_value DOUBLE PRECISION,
  gas_status TEXT NOT NULL DEFAULT 'missing' CHECK (
    gas_status IN ('valid', 'invalid', 'missing', 'out_of_range')
  ),
  soil_moisture_pct DOUBLE PRECISION,
  soil_status TEXT NOT NULL DEFAULT 'missing' CHECK (
    soil_status IN ('valid', 'invalid', 'missing', 'out_of_range')
  ),
  fan_state DOUBLE PRECISION,
  fan_status TEXT NOT NULL DEFAULT 'missing' CHECK (
    fan_status IN ('valid', 'invalid', 'missing', 'out_of_range')
  ),
  piston_state DOUBLE PRECISION,
  piston_status TEXT NOT NULL DEFAULT 'missing' CHECK (
    piston_status IN ('valid', 'invalid', 'missing', 'out_of_range')
  ),
  quality_status TEXT NOT NULL DEFAULT 'valid' CHECK (
    quality_status IN ('valid', 'invalid', 'missing', 'out_of_range', 'duplicate')
  ),
  quality_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  normalization_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_normalized_sensor_data_device_recorded_at
  ON public.normalized_sensor_data (device_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_normalized_sensor_data_raw_id
  ON public.normalized_sensor_data (raw_id);

CREATE INDEX IF NOT EXISTS idx_normalized_sensor_data_created_at
  ON public.normalized_sensor_data (created_at);
