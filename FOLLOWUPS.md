# Follow-ups (out of scope for MQTT connectivity task)

## Firmware repository not present

Files `module_sim.cpp`, `module_sim.h`, `config.h`, `main.cpp` were referenced in the task
spec but do not exist in this repository. The STM32-B firmware lives in a separate project.

Items that require the firmware repo:

- **Step 3 (Option A)**: Verify `MQTT_TOPIC_BASE` in `module_sim.h` matches
  `sgh-aeris/gateway` and that IMEI suffix produces `sgh-aeris/gateway/{imei8}/sensors`.
- **Step 4**: Confirm firmware JSON keys (`temp`, `hum`, `co2`, `ch4`, `lux`, `pressure`,
  `gas`, `soil`, `fan`, `piston`) match exactly what `persistAerisSensorData` reads.
- **Step 6**: Verify `connectMQTT()` uses port 8883 + `TinyGsmClientSecure` and that
  `MQTT_CLIENT_ID_PREFIX` + IMEI ≤ 65 chars.

## Bridge .gitignore

`backend/node_modules/` is currently tracked by git (shows ~200 modified files in
`git status`). Add `backend/node_modules/` to `.gitignore` if not already there.
