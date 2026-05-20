# MQTT Connectivity Audit

Date: 2026-04-17

## Firmware side

Files `module_sim.cpp`, `module_sim.h`, `config.h`, `main.cpp` **are not present in this repository**.
The STM32-B firmware lives in a separate hardware project. All firmware-side information is
inferred from inline comments in `mqttBridge.js`.

From bridge comments:
- Firmware publishes to: `sgh-aeris/gateway/{imei8}/sensors`
  where `{imei8}` = last 8 digits of IMEI (e.g. `sgh-aeris/gateway/12345678/sensors`)
- Firmware also uses: `sgh-aeris/gateway/{imei8}/heartbeat`, `sgh-aeris/gateway/{imei8}/ack`
- Control direction (bridge → device): `sgh-aeris/gateway/{imei8}/control`
- Expected TLS port: 8883 (HiveMQ Cloud) — cannot verify without firmware source

## Bridge side (mqttBridge.js + .env)

| Setting | Value |
|---|---|
| Broker URL | `mqtts://9df9b7f54e0b41cdb8afd8fab379c0a3.s1.eu.hivemq.cloud:8883` |
| Protocol | `mqtts://` → TLS enabled |
| Port | 8883 |
| `rejectUnauthorized` | `true` (uses public CA — correct for HiveMQ Cloud) |
| Auth | `MQTT_USERNAME` / `MQTT_PASSWORD` from `.env` |
| Firmware subscription | `sgh-aeris/gateway/+/sensors` |
| Firmware heartbeat | `sgh-aeris/gateway/+/heartbeat` |
| Firmware ack | `sgh-aeris/gateway/+/ack` |
| Legacy subscription | `devices/{id}/status`, `devices/{id}/sensors/#` |

## Topic match verdict

**Topics MATCH.**

The task description stated the bridge subscribes to `aeris/sensors/#` — that is outdated.
The current `mqttBridge.js` already subscribes to `sgh-aeris/gateway/+/sensors`, which
matches the firmware's publish topic `sgh-aeris/gateway/{imei8}/sensors`.

No topic reconciliation is needed. Step 3 is a no-op documented in the file comments.

## Payload shape

Bridge's `persistAerisSensorData` reads:
`temp`, `hum`, `co2`, `ch4`, `lux`, `pressure`, `gas`, `soil`, `fan`, `piston`

Bridge's own comment at line 6 documents the firmware payload as:
`{ ts, temp, hum, co2, lux, pressure, gas, soil, fan, piston }`

Keys match. (`ch4` is present in the bridge's persistence code; not listed in comment —
firmware should include it if available; bridge will silently skip it if missing.)

## Issues found and fixed

1. **`mqttClient.on('error', ...)` missing `console.error`** — TLS auth failures were silent
   in server logs. Fixed: added `console.error('MQTT error:', e)` to the handler.

## Firmware files not in repo — follow-up required

See `FOLLOWUPS.md` for items that require the firmware repository.
