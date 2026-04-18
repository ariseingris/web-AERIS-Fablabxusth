# AERIS – Task Breakdown & Prompts

> **Stack:** React (Vite) + Node.js + Supabase + MQTT + Docker + Python AI (Gemma 4 E4B)

---

## GROUP 1: IoT Dashboard + MultiChart

### Prompt 1.1 — MultiChart Component

```
Create `frontend/src/components/MultiChart.jsx` using recharts.

Props: `data` (array of {timestamp, temperature, humidity, co2, ch4, pressure, light}), `metrics` (array of metric keys).

- Render all metrics as lines on one chart. Toggle each line on/off.
- X-axis: timestamp. Y-axis: auto-scale.
- Tooltip on hover showing all values.
- Dropdown to filter time range: 1h, 6h, 24h, 7d, 30d.
- Read theme from ThemeContext for dark/light mode.
- Responsive.
```

### Prompt 1.2 — Sensor Stat Cards

```
Create `frontend/src/components/SensorStatCards.jsx`.

Props: `latestData` (object with latest sensor values), `previousData` (previous values for trend).

- Grid of cards. Each card: icon, metric name, current value, unit, trend arrow (up/down).
- Metrics: CO₂ (ppm), CH₄ (ppm), Temperature (°C), Soil Humidity (%), Pressure (hPa), Light (lux).
- Animate value changes.
- Dark/light mode from ThemeContext.
```

### Prompt 1.3 — Wire MQTT into IoTDashboard.jsx

```
Update `frontend/src/pages/IoTDashboard.jsx`:

1. Use `useMqttBridge` hook to subscribe to sensor topic.
2. On message: parse JSON {timestamp, temperature, humidity, co2, ch4, pressure, light}.
3. Store in state array (max 1000 points).
4. Pass data to <MultiChart /> and <SensorStatCards />.
5. "Connect Device" button → POST /api/iot/connect.
6. Show connection status badge: Connected / Disconnected / Reconnecting.
7. Persist history to Supabase via backend API.
```

### Prompt 1.4 — Backend IoT Endpoints

```
Add to `backend/index.js`:

POST /api/iot/connect — Register device. Save {device_id, user_id} to Supabase "devices" table.
GET  /api/iot/data/:deviceId — Get historical sensor data. Query: from, to, interval.
POST /api/iot/data — Save sensor reading (called by mqttBridge on MQTT message).
GET  /api/iot/devices — List current user's devices.

Supabase tables:
- devices(id, user_id, device_id, name, status, created_at)
- sensor_data(id, device_id, timestamp, temperature, humidity, co2, ch4, pressure, light)
```

---

## GROUP 2: Admin + Content Moderation

### Prompt 2.1 — Admin Middleware & Role Management

```
Update `backend/index.js`:

1. Add `requireAdmin` middleware — check user.user_metadata.role === 'admin'.
2. POST /api/admin/set-role — Admin-only. Body: {userId, role}. Update user metadata.
3. Add Supabase RLS policy: admin has full access to "profiles" table.

Update `frontend/src/components/AdminRoute.jsx` — redirect non-admin users.
```

### Prompt 2.2 — Content Moderation System

```
Backend (`backend/index.js`):
1. All new posts/comments default status = "pending".
2. GET  /api/admin/pending — List pending content.
3. POST /api/admin/moderate — Body: {postId, action: "approve"|"reject"}.
4. Auto-moderation: call AI.py with post content → returns "safe" (auto-approve), "uncertain" (keep pending), "harmful" (auto-reject).

Frontend (`frontend/src/pages/AdminPage.jsx`):
- "Content Moderation" tab. List pending posts.
- Each item: Approve / Reject buttons.
- AI badge: "Safe" / "Uncertain" / "Violation".
- Filter: All / Pending / Approved / Rejected.
```

---

## GROUP 3: AI Client (Gemma 4 E4B)

### Prompt 3.1 — AI Backend Service

```
Update `backend/AI.py` (Flask or FastAPI):

Endpoints:
- POST /ai/chat — Chat with Gemma 4 E4B. Input: message. Output: response.
- POST /ai/research — Web search for plant/crop info. Input: query. Output: results + summary.
- POST /ai/predict — Predict plant status from IoT data. Input: sensor_data array. Output: prediction + recommendations.
- POST /ai/report — Generate report from sensor data. Input: {deviceId, from, to, format: "latex"|"excel"|"docx"}. Output: file.
- POST /ai/moderate — Classify content. Input: text. Output: "safe"|"uncertain"|"harmful".

Permission model: endpoints that access IoT data, create group schedules, or post announcements must receive a `user_confirmed: true` flag in request body. Reject if missing.

Connect to Gemma 4 E4B via ollama or transformers.
```

### Prompt 3.2 — AI Chat Frontend

```
Update `frontend/src/pages/AiPage.jsx`:

1. Chat UI: messages list (scrollable) + input bar at bottom.
2. Header: "AERIS AI (Gemma 4 E4B)".
3. Quick action buttons:
   - "Research Plants" → /ai/research
   - "Analyze IoT Data" → permission popup → /ai/predict
   - "Generate Report" → format picker (LaTeX/Excel/DOCX) → /ai/report
   - "Create Group Schedule" → permission popup → API
   - "Post Announcement" → permission popup → API
4. Permission dialog: "AI wants to access [resource]. Allow?" → Allow / Deny.
5. Typing indicator while AI processes.
6. Use existing i18n from `frontend/src/i18n/ai.js`.
```

---

## GROUP 4: Report Export

### Prompt 4.1 — Report Export API

```
Add to `backend/index.js`:

GET /api/reports/excel/:deviceId — Generate Excel report.
  Query: from, to, format ("summary"|"detailed").
  Use exceljs.
  Sheet 1: Overview (min, max, avg per metric).
  Sheet 2: Raw data (one row per data point).
  Sheet 3: Auto-generated charts.
  Return .xlsx file.

POST /api/reports/ai-write — AI-generated report.
  Body: {deviceId, from, to, format: "excel"|"docx"|"latex", language}.
  AI analyzes data → writes natural narrative → exports file.
```

### Prompt 4.2 — Report Export UI

```
Create `frontend/src/components/ReportExporter.jsx`.

- Device dropdown, date range picker, format selector (Excel/DOCX/LaTeX).
- Toggle "AI-written report".
- "Export" button → call API → progress bar → download.
- Integrate into IoTDashboard.jsx as collapsible panel.
```

---

## GROUP 5: Community Recommendation Algorithm

### Prompt 5.1 — Recommendation Engine Backend

```
Add to `backend/index.js`:

GET /api/feed/recommended — Recommended posts for current user.
  Algorithm:
  - engagement_score = likes*1 + comments*2 + shares*3
  - time_decay = score * e^(-0.05 * hours_since_posted)
  - Boost if post shares tags with user's past interactions
  - Boost if post from same group
  - Filter: status = "approved" only
  - Focus: agriculture, plants, academic, research

POST /api/feed/interact — Body: {postId, type: "like"|"comment"|"share"|"view"}.
GET  /api/feed/trending — Top 10 posts in 24h/7d.

Supabase tables:
- posts(id, author_id, content, tags[], status, likes_count, comments_count, created_at)
- interactions(id, user_id, post_id, type, created_at)
```

### Prompt 5.2 — Community Feed Frontend

```
Update `frontend/src/pages/CommunityPage.jsx`:

1. Feed from GET /api/feed/recommended.
2. Tabs: Recommended / Latest / Trending / Following.
3. Post card: avatar, name, time, content, image, tags, like/comment/share.
4. Infinite scroll.
5. Sidebar: Popular Topics, Your Groups, Suggested Users.
6. Create post: markdown editor, image upload, tag picker (#plants #research #iot #greenhouse #emissions).
7. Nested comments.
```

---

## GROUP 6: Pro Subscription (500k VNĐ/month)

### Prompt 6.1 — Subscription Backend

```
Add to `backend/index.js`:

Table: subscriptions(id, user_id, plan, price, started_at, expires_at, status)

POST /api/subscription/upgrade — Create Pro. plan="pro", price=500000, expires_at=+30d.
GET  /api/subscription/status — Return plan + expiry.
Middleware `requirePro` — check active Pro subscription.

Free vs Pro:
- AI chat: 10/day vs unlimited
- Reports: Excel only vs all formats
- IoT devices: 1 vs unlimited
- Groups: 2 vs unlimited
- Ads: yes vs none
```

### Prompt 6.2 — Pricing UI

```
Create `frontend/src/components/PricingCard.jsx`:

- Free vs Pro comparison table.
- "Upgrade to Pro" button.
- Sidebar: "Upgrade" link for free users.
- Pro badge next to username.
- Upsell modal when free user hits Pro feature.
```

---

## GROUP 7: User Profile + Groups

### Prompt 7.1 — Avatar & Profile

```
Update `frontend/src/pages/SettingsPage.jsx`:

1. Avatar upload → Supabase Storage "avatars" bucket. Crop before upload.
2. Display name edit + save.
3. Live preview.

Backend:
POST /api/user/avatar — Upload, return URL.
PUT  /api/user/profile — Update name, bio.
```

### Prompt 7.2 — Groups Backend

```
Add to `backend/index.js`:

Tables:
- groups(id, name, description, avatar_url, created_by, created_at)
- group_members(id, group_id, user_id, role: "leader"|"member", joined_at)
- group_journal(id, group_id, author_id, content, date, created_at)
- group_progress(id, group_id, title, description, status: "todo"|"in_progress"|"done", assigned_to, due_date)

Endpoints:
POST   /api/groups — Create group. Creator = leader.
GET    /api/groups — List user's groups.
POST   /api/groups/:id/members — Add member (leader only).
DELETE /api/groups/:id/members/:userId — Remove member (leader only).
GET    /api/groups/:id/journal — Get entries.
POST   /api/groups/:id/journal — Add entry.
GET    /api/groups/:id/progress — Get tasks.
PUT    /api/groups/:id/progress/:taskId — Update task.
```

### Prompt 7.3 — Groups Frontend

```
Create `frontend/src/pages/GroupPage.jsx`:

1. Groups list (card grid).
2. Group detail tabs:
   - Members — list, add/remove (leader only).
   - Journal — timeline, add new entry.
   - Progress — Kanban (Todo / In Progress / Done), drag-drop, assign, due date.
   - Discussion — group chat.
3. Create group modal.
4. "Leader" badge.

Update App.jsx: routes /groups, /groups/:id.
Update Sidebar.jsx: add "Groups" link.
```

---

## EXECUTION ORDER

| # | Group | Reason |
|---|-------|--------|
| 1 | Group 1 | Core IoT feature |
| 2 | Group 2 | Required before community |
| 3 | Group 7 | User experience foundation |
| 4 | Group 5 | Depends on 2 & 7 |
| 5 | Group 3 | Parallel development |
| 6 | Group 4 | Depends on 1 & 3 |
| 7 | Group 6 | After features stable |
