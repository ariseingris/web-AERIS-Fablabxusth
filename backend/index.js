// backend/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { supabase } = require('./supabaseClient');
const ExcelJS = require('exceljs');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

/**
 * Resolve a public IPv4 to geo metadata via ip-api.com.
 * Returns null for loopback / unresolvable / any error (never throws).
 */
async function resolveGeo(ip) {
  if (!ip) return null;
  const clean = ip.replace(/^::ffff:/, '');
  if (!clean || clean === '::1' || clean === '127.0.0.1') return null;
  try {
    const resp = await fetch(
      `http://ip-api.com/json/${clean}?fields=status,country,countryCode,city,timezone,lat,lon`
    );
    if (!resp.ok) return null;
    const j = await resp.json();
    if (j.status !== 'success') return null;
    return {
      country_code: j.countryCode ?? null,
      country_name: j.country ?? null,
      city: j.city ?? null,
      timezone: j.timezone ?? null,
      latitude: j.lat ?? null,
      longitude: j.lon ?? null,
    };
  } catch {
    return null;
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend run better' });
});

app.get('/api/ai/health', async (req, res) => {
  try {
    const aiResp = await fetch(`${AI_SERVICE_URL}/ai/health`);
    const aiData = await aiResp.json();
    res.status(aiResp.status).json(aiData);
  } catch (err) {
    console.error('[AI health] Cannot reach AI service:', err.message);
    res.status(503).json({ status: 'unreachable', error: err.message });
  }
});

app.get('/api/ai/model-info', async (req, res) => {
  try {
    const aiResp = await fetch(`${AI_SERVICE_URL}/ai/model-info`);
    const aiData = await aiResp.json();
    res.status(aiResp.status).json(aiData);
  } catch (err) {
    console.error('[AI model-info] Cannot reach AI service:', err.message);
    res.status(503).json({ status: 'unreachable', model: 'unknown', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// AUTH HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * extractUser middleware — extracts user from Supabase JWT in Authorization header.
 * Attaches req.user on success. Does NOT block if missing (use requireAuth for that).
 */
async function extractUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) console.warn('[extractUser] getUser failed:', error.message);
    if (!error && user) req.user = user;
  } catch (e) { console.warn('[extractUser] exception:', e.message); }
  next();
}

/**
 * requireAuth — blocks unauthenticated requests (401)
 */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

/**
 * requireAdmin — blocks non-admin users (403)
 * Checks user.user_metadata.role === 'admin' or falls back to profiles table.
 */
async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  // Check user_metadata first (fast path)
  if (req.user.user_metadata?.role === 'admin') return next();

  // Fallback: check profiles table
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();
    if (data?.role === 'admin') return next();
  } catch { /* ignore */ }

  return res.status(403).json({ error: 'Admin access required' });
}

// Apply extractUser to all routes

/**
 * Subscription Helpers
 */
async function getIsPro(userId) {
  if (!userId) return false;
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, expires_at, status')
    .eq('user_id', userId)
    .single();
  if (!data) return false;
  return data.plan === 'pro' && (new Date(data.expires_at) > new Date()) && data.status === 'active';
}

async function requirePro(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const isPro = await getIsPro(req.user.id);
  if (!isPro) return res.status(403).json({ error: 'requires_pro', message: 'Pro subscription required' });
  next();
}

app.use(extractUser);


// ──────────────────────────────────────────────────────────────────────────────
// GROUP 1 — IoT Endpoints
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/iot/connect
 * Register a device for the current user
 * Body: { device_id, name, user_id }
 */
app.post('/api/iot/connect', async (req, res) => {
  try {
    const { device_id, name, user_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id is required' });

    if (user_id) {
      const isPro = await getIsPro(user_id);
      if (!isPro) {
        // Check if they already have an active device (ignoring the one they might be updating)
        const { count } = await supabase.from('devices').select('id', { count: 'exact', head: true }).eq('user_id', user_id).neq('device_id', device_id);
        if (count >= 1) return res.status(403).json({ error: 'requires_pro', limit_type: 'device', message: 'Free limit: 1 device max' });
      }
    }

    const xff = req.headers['x-forwarded-for']?.split(',')[0].trim();
    const ip  = xff || req.socket.remoteAddress || null;
    const geo = await resolveGeo(ip);

    const upsertData = {
      device_id,
      user_id: user_id || null,
      name: name || device_id,
      status: 'active',
      ip_address: ip,
    };
    if (geo) {
      Object.assign(upsertData, geo);
      upsertData.geo_updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('devices')
      .upsert(upsertData, { onConflict: 'device_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, device: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/iot/devices
 * List devices (optionally filter by user_id query param)
 */
app.get('/api/iot/devices', async (req, res) => {
  try {
    let query = supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (req.query.user_id) {
      query = query.eq('user_id', req.query.user_id);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ devices: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/iot/data
 * Save a sensor reading (called by mqttBridge on MQTT message)
 * Body: { device_id, timestamp, temperature, humidity, co2, ch4, pressure, light }
 */
app.post('/api/iot/data', async (req, res) => {
  try {
    const { device_id, timestamp, temperature, humidity, co2, ch4, pressure, light } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id is required' });

    const { data, error } = await supabase
      .from('sensor_data')
      .insert({
        device_id,
        timestamp: timestamp || new Date().toISOString(),
        temperature: temperature ?? null,
        humidity: humidity ?? null,
        co2: co2 ?? null,
        ch4: ch4 ?? null,
        pressure: pressure ?? null,
        light: light ?? null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, reading: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/iot/data/:deviceId
 * Get historical sensor data
 * Query: from, to, limit (default 500)
 */
app.get('/api/iot/data/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { from, to, limit } = req.query;

    let query = supabase
      .from('sensor_data')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: true });

    if (from) query = query.gte('timestamp', from);
    if (to) query = query.lte('timestamp', to);
    query = query.limit(parseInt(limit) || 500);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GROUP 2 — Admin + Content Moderation Endpoints
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/set-role
 * Admin-only. Update a user's role in both profiles table and user_metadata.
 * Body: { userId, role }
 */
app.post('/api/admin/set-role', requireAdmin, async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) return res.status(400).json({ error: 'userId and role are required' });
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be: user, admin, or moderator' });
    }

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (profileError) return res.status(500).json({ error: profileError.message });

    // Update user_metadata via admin API
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role },
    });

    if (authError) {
      console.warn('⚠️  Could not update user_metadata (may need service_role key):', authError.message);
      // Not fatal — profile table is the source of truth
    }

    res.json({ ok: true, userId, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/pending
 * List content pending moderation.
 * Query: status (optional) — "pending" | "approved" | "rejected" | "all" (default: "pending")
 */
app.get('/api/admin/pending', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'pending';

    let query = supabase
      .from('community_posts')
      .select('id, title, content, user_email, author_id, status, ai_classification, tags, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ posts: data ?? [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/flagged
 * List posts that need admin review (AI flagged as uncertain, harmful, or AI service was down).
 */
app.get('/api/admin/flagged', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('id, title, body, user_email, author_id, status, ai_classification, tags, created_at, updated_at')
      .in('ai_classification', ['uncertain', 'harmful', 'pending_review'])
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ posts: data ?? [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/moderate
 * Approve or remove a post.
 * Body: { postId, action: "approve" | "remove", reason? }
 */
app.post('/api/admin/moderate', requireAdmin, async (req, res) => {
  try {
    const { postId, action, reason } = req.body;
    if (!postId || !action) return res.status(400).json({ error: 'postId and action are required' });
    if (!['approve', 'reject', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve", "reject", or "remove"' });
    }

    const newStatus = action === 'approve' ? 'published' : 'removed';
    const updateData = {
      status: newStatus,
      approved: action === 'approve',
      ai_classification: action === 'approve' ? 'admin_approved' : 'harmful',
      moderated_by: req.user.id,
      moderated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (reason) updateData.moderation_reason = reason;

    const { data, error } = await supabase
      .from('community_posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, post: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/auto-moderate
 * Call AI service to classify content. Sets ai_classification field.
 * Body: { postId }
 */
app.post('/api/admin/auto-moderate', requireAdmin, async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: 'postId is required' });

    // Fetch the post content
    const { data: post, error: fetchError } = await supabase
      .from('community_posts')
      .select('id, title, content')
      .eq('id', postId)
      .single();

    if (fetchError || !post) return res.status(404).json({ error: 'Post not found' });

    // Call AI service for classification
    let classification = 'uncertain'; // default
    try {
      const aiResp = await fetch(`${AI_SERVICE_URL}/ai/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${post.title || ''} ${post.content || ''}` }),
      });
      if (aiResp.ok) {
        const aiData = await aiResp.json();
        classification = aiData.classification || 'uncertain';
      }
    } catch (aiErr) {
      console.warn('⚠️  AI moderation service unavailable:', aiErr.message);
    }

    // Update post with classification
    const updateData = { ai_classification: classification };
    // Auto-action based on AI classification
    if (classification === 'safe') {
      updateData.status = 'approved';
      updateData.approved = true;
    } else if (classification === 'harmful') {
      updateData.status = 'rejected';
      updateData.approved = false;
    }
    // "uncertain" stays as pending

    const { data, error } = await supabase
      .from('community_posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, classification, post: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GROUP 4 — Report Export Endpoints
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/reports/excel/:deviceId
 * Generate Excel report.
 */
app.get('/api/reports/excel/:deviceId', requireAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { from, to, format } = req.query; // format = "summary" | "detailed"

    let query = supabase
      .from('sensor_data')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: true });

    if (from) query = query.gte('timestamp', from);
    if (to) query = query.lte('timestamp', to);

    const { data: sensorData, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    if (!sensorData || sensorData.length === 0) {
      return res.status(404).json({ error: 'No data found in this range' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AERIS Platform';
    workbook.created = new Date();

    // Sheet 1: Overview
    const overviewSheet = workbook.addWorksheet('Overview');
    overviewSheet.columns = [
      { header: 'Metric', key: 'metric', width: 20 },
      { header: 'Min', key: 'min', width: 15 },
      { header: 'Max', key: 'max', width: 15 },
      { header: 'Avg', key: 'avg', width: 15 },
    ];
    overviewSheet.getRow(1).font = { bold: true };

    const metrics = ['temperature', 'humidity', 'co2', 'ch4', 'pressure', 'light'];
    metrics.forEach(m => {
      const vals = sensorData.map(d => d[m]).filter(v => v !== null && v !== undefined);
      if (vals.length > 0) {
        overviewSheet.addRow({
          metric: m,
          min: Math.min(...vals).toFixed(2),
          max: Math.max(...vals).toFixed(2),
          avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
        });
      } else {
        overviewSheet.addRow({ metric: m, min: '-', max: '-', avg: '-' });
      }
    });

    // Sheet 2: Raw data (only if not summary, or always based on requirement)
    // Requirement says: "Sheet 2: Raw data (one row per data point)."
    // So we'll include it.
    const rawSheet = workbook.addWorksheet('Raw Data');
    rawSheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 25 },
      { header: 'Temperature', key: 'temperature', width: 15 },
      { header: 'Humidity', key: 'humidity', width: 15 },
      { header: 'CO2', key: 'co2', width: 15 },
      { header: 'CH4', key: 'ch4', width: 15 },
      { header: 'Pressure', key: 'pressure', width: 15 },
      { header: 'Light', key: 'light', width: 15 },
    ];
    rawSheet.getRow(1).font = { bold: true };

    sensorData.forEach(d => rawSheet.addRow(d));

    // Response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_${deviceId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/reports/ai-write
 * AI-generated report.
 */
app.post('/api/reports/ai-write', requireAuth, async (req, res) => {
  try {
    const { deviceId, from, to, format, language } = req.body;

    if (format === 'latex' || format === 'docx') {
      const isPro = await getIsPro(req.user.id);
      if (!isPro) return res.status(403).json({ error: 'requires_pro', limit_type: 'report', message: 'Pro subscription required for LaTeX/DOCX export' });
    }

    let query = supabase
      .from('sensor_data')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: true });

    if (from) query = query.gte('timestamp', from);
    if (to) query = query.lte('timestamp', to);
    // Limit data so we don't blow up AI context
    query = query.limit(500);

    const { data: sensorData, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    let dataContext = "No sensor data found for this range.";
    if (sensorData && sensorData.length > 0) {
      dataContext = `Found ${sensorData.length} data points. `;
      const tVals = sensorData.map(d => d.temperature).filter(v => v !== null);
      if (tVals.length) dataContext += `Temperature avg: ${(tVals.reduce((a, b) => a + b, 0) / tVals.length).toFixed(1)}C. `;
    }

    const aiResp = await fetch(`${AI_SERVICE_URL}/ai/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_confirmed: true,
        format: format,
        context: dataContext,
        language: language || 'en'
      }),
    });

    let aiNarrative = '';
    if (aiResp.ok) {
      const aiData = await aiResp.json();
      aiNarrative = aiData.report || "AI could not generate a narrative.";
    } else {
      aiNarrative = "AI Service Error or Unreachable.";
    }

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const overviewSheet = workbook.addWorksheet('AI Narrative');
      overviewSheet.getColumn(1).width = 100;
      const lines = aiNarrative.split('\n');
      lines.forEach(l => {
        overviewSheet.addRow([l]);
      });

      const rawSheet = workbook.addWorksheet('Raw Data');
      rawSheet.columns = [
        { header: 'Timestamp', key: 'timestamp', width: 25 },
        { header: 'Temperature', key: 'temperature', width: 15 },
        { header: 'Humidity', key: 'humidity', width: 15 },
        { header: 'CO2', key: 'co2', width: 15 },
        { header: 'CH4', key: 'ch4', width: 15 },
      ];
      if (sensorData) {
        sensorData.forEach(d => rawSheet.addRow(d));
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=ai_report_${deviceId}.xlsx`);
      await workbook.xlsx.write(res);
      return res.end();
    } else {
      // For docx/latex just return as generic blob to be downloaded
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=ai_report_${deviceId}.${format === 'docx' ? 'docx' : 'tex'}`);
      return res.send(aiNarrative);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GROUP 5 — Community Recommendation Algorithm
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/feed/recommended
 * Fetch user's feed with recommendation engine
 */
app.get('/api/feed/recommended', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get user's past interacted tags (from their interactions)
    const { data: myInteractions } = await supabase
      .from('community_interactions')
      .select('post_id')
      .eq('user_id', userId);

    let myTags = new Set();
    if (myInteractions && myInteractions.length > 0) {
      const pastPostIds = myInteractions.map(i => i.post_id);
      const { data: pastPosts } = await supabase
        .from('community_posts')
        .select('tags')
        .in('id', pastPostIds);
      if (pastPosts) {
        pastPosts.forEach(p => {
          if (p.tags) p.tags.forEach(t => myTags.add(t.toLowerCase()));
        });
      }
    }

    // Fallback tags if user has no interactions
    if (myTags.size === 0) {
      ['agriculture', 'plants', 'academic', 'research'].forEach(t => myTags.add(t));
    }

    // 2. Fetch approved posts
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select('*, community_comments(count), community_interactions(type)')
      .in('status', ['published', 'flagged']);

    if (error) return res.status(500).json({ error: error.message });

    // 3. Process and score
    const now = new Date();
    const scoredPosts = (posts || []).map(post => {
      // Calculate interactions manually if we want (shares from interactions)
      let likes = post.likes || 0;
      let comments = post.community_comments?.[0]?.count || 0;
      let shares = 0;
      let views = 0;

      if (post.community_interactions) {
        post.community_interactions.forEach(i => {
          if (i.type === 'share') shares++;
          if (i.type === 'view') views++;
          // if we computed likes from interactions, we would do it here, but we have a direct likes column
        });
      }

      // Base engagement score
      const score = (likes * 1) + (comments * 2) + (shares * 3) + (views * 0.1);

      // Time decay
      const hoursSincePosted = (now - new Date(post.created_at)) / (1000 * 60 * 60);
      let timeDecayScore = score * Math.exp(-0.05 * hoursSincePosted);
      // Give brand new posts a slight baseline so they aren't purely 0
      if (timeDecayScore === 0 && hoursSincePosted < 24) {
        timeDecayScore = 0.5 * Math.exp(-0.05 * hoursSincePosted);
      }

      // Boost for matching tags
      let tagBoost = 1.0;
      if (post.tags) {
        let matches = post.tags.filter(t => myTags.has(t.toLowerCase())).length;
        tagBoost += (matches * 0.2); // +20% per matching tag
      }

      // Group boost: If post author is in same group as user
      // Note: Full implementation of group boost would require joining group_members. 
      // For performance, we assume baseline group boost logic here (can be expanded later)

      const finalScore = timeDecayScore * tagBoost;

      return {
        ...post,
        engagement_score: finalScore,
      };
    });

    // Sort by final score desc
    scoredPosts.sort((a, b) => b.engagement_score - a.engagement_score);

    res.json({ posts: scoredPosts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/feed/interact
 * Record user interactions (like, comment, share, view)
 * Body: { postId, type }
 */
app.post('/api/feed/interact', requireAuth, async (req, res) => {
  try {
    const { postId, type } = req.body;
    if (!postId || !['like', 'comment', 'share', 'view'].includes(type)) {
      return res.status(400).json({ error: 'Valid postId and type required' });
    }

    const { error } = await supabase
      .from('community_interactions')
      .insert({
        post_id: postId,
        user_id: req.user.id,
        type: type
      });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/feed/trending
 * Top posts in last 24h / 7d based on interactions
 * Query: period = '24h' | '7d' (default '24h')
 */
app.get('/api/feed/trending', async (req, res) => {
  try {
    const period = req.query.period === '7d' ? 7 * 24 : 24;
    const since = new Date(Date.now() - (period * 60 * 60 * 1000)).toISOString();

    const { data: posts, error } = await supabase
      .from('community_posts')
      .select('*, community_comments(count), community_interactions(type)')
      .in('status', ['published', 'flagged'])
      .gte('created_at', since);

    if (error) return res.status(500).json({ error: error.message });

    const scoredPosts = (posts || []).map(post => {
      let likes = post.likes || 0;
      let comments = post.community_comments?.[0]?.count || 0;
      let shares = 0;

      if (post.community_interactions) {
        post.community_interactions.forEach(i => {
          if (i.type === 'share') shares++;
        });
      }

      const score = (likes * 1) + (comments * 2) + (shares * 3);
      return { ...post, score };
    });

    // Top 10 by pure score
    scoredPosts.sort((a, b) => b.score - a.score);
    res.json({ posts: scoredPosts.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ──────────────────────────────────────────────────────────────────────────────
// GROUP 6 — Pro Subscription Endpoints
// ──────────────────────────────────────────────────────────────────────────────

app.get('/api/subscription/status', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();
    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });

    // Check limits usage
    let devicesCount = 0;
    try {
      const devRes = await supabase.from('devices').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id);
      devicesCount = devRes.count || 0;
    } catch (e) { }

    let groupsCount = 0;
    try {
      const gRes = await supabase.from('groups').select('id', { count: 'exact', head: true }).eq('created_by', req.user.id);
      groupsCount = gRes.count || 0;
    } catch (e) { }

    let aiCount = 0;
    const today = new Date().toISOString().split('T')[0];
    try {
      const aiRes = await supabase.from('ai_usage').select('count').eq('user_id', req.user.id).eq('date', today).single();
      if (aiRes.data) aiCount = aiRes.data.count;
    } catch (e) { }

    const isPro = data ? (data.plan === 'pro' && new Date(data.expires_at) > new Date() && data.status === 'active') : false;

    res.json({
      plan: isPro ? 'pro' : 'free',
      expires_at: data ? data.expires_at : null,
      usage: {
        devicesCount,
        groupsCount,
        aiCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscription/upgrade', requireAuth, async (req, res) => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: req.user.id,
        plan: 'pro',
        price: 500000,
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active'
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, subscription: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/ai/chat', '/api/ai/chat-proxy'], requireAuth, async (req, res) => {
  // Check AI Chat Limit
  const isPro = await getIsPro(req.user.id);
  const today = new Date().toISOString().split('T')[0];

  if (!isPro) {
    const { data: usage } = await supabase.from('ai_usage').select('count').eq('user_id', req.user.id).eq('date', today).single();
    let count = usage ? usage.count : 0;
    if (count >= 10) {
      return res.status(403).json({ error: 'requires_pro', message: 'Free limit: 10 AI messages per day' });
    }
  }

  // Proxy to AI Service
  try {
    const aiResp = await fetch(`${AI_SERVICE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const aiData = await aiResp.json();

    if (!aiResp.ok) {
      console.error(`[AI proxy] AI service returned ${aiResp.status}:`, aiData);
    }

    // Increment usage on success
    if (aiResp.ok && !isPro) {
      const { data: usage } = await supabase.from('ai_usage').select('*').eq('user_id', req.user.id).eq('date', today).single();
      if (usage) {
        await supabase.from('ai_usage').update({ count: usage.count + 1 }).eq('id', usage.id);
      } else {
        await supabase.from('ai_usage').insert({ user_id: req.user.id, date: today, count: 1 });
      }
    }

    res.status(aiResp.status).json(aiData);
  } catch (err) {
    console.error('[AI proxy] Cannot reach AI service:', err.message);
    res.status(503).json({ error: `Cannot reach AI service: ${err.message}` });
  }
});


// ──────────────────────────────────────────────────────────────────────────────
// GROUP 7 — User Profile + Groups
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/user/avatar
 * Upload avatar to Supabase Storage "avatars" bucket. Returns public URL.
 * Expects base64 image in body: { image: "data:image/png;base64,..." }
 */
app.post('/api/user/avatar', requireAuth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'image (base64) is required' });

    // Parse base64 data URL
    const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid image format. Must be data:image/*;base64,...' });

    const ext = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const filePath = `${req.user.id}/avatar.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const cachedUrl = publicUrl + '?t=' + Date.now();

    // Update profile with avatar URL
    await supabase
      .from('profiles')
      .update({ avatar_url: cachedUrl })
      .eq('id', req.user.id);

    res.json({ ok: true, url: cachedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/user/profile
 * Update user profile (name, bio)
 * Body: { full_name?, bio? }
 */
app.put('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, bio } = req.body;
    const updateData = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updateData.full_name = full_name;
    if (bio !== undefined) updateData.bio = bio;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, profile: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Groups ──────────────────────────────────────────────────────────────────

/**
 * POST /api/groups
 * Create a group. Creator becomes leader.
 * Body: { name, description?, avatar_url? }
 */
app.post('/api/groups', requireAuth, async (req, res) => {
  try {
    const { name, description, avatar_url } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const isPro = await getIsPro(req.user.id);
    if (!isPro) {
      const { count } = await supabase.from('groups').select('id', { count: 'exact', head: true }).eq('created_by', req.user.id);
      if (count >= 2) return res.status(403).json({ error: 'requires_pro', limit_type: 'group', message: 'Free limit: 2 groups max' });
    }

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description: description || '',
        avatar_url: avatar_url || null,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (groupError) return res.status(500).json({ error: groupError.message });

    // Add creator as leader
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: req.user.id,
        role: 'leader',
      });

    if (memberError) console.warn('⚠️  Could not add leader:', memberError.message);

    res.json({ ok: true, group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/groups
 * List groups the current user belongs to.
 */
app.get('/api/groups', requireAuth, async (req, res) => {
  try {
    // Get group IDs for this user
    const { data: memberships, error: memError } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', req.user.id);

    if (memError) return res.status(500).json({ error: memError.message });
    if (!memberships?.length) return res.json({ groups: [] });

    const groupIds = memberships.map(m => m.group_id);
    const roleMap = {};
    memberships.forEach(m => { roleMap[m.group_id] = m.role; });

    // Fetch groups
    const { data: groups, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false });

    if (groupError) return res.status(500).json({ error: groupError.message });

    // Attach user's role in each group
    const enriched = (groups ?? []).map(g => ({ ...g, my_role: roleMap[g.id] || 'member' }));

    res.json({ groups: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/groups/:id
 * Get single group details with members.
 */
app.get('/api/groups/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [groupRes, membersRes] = await Promise.all([
      supabase.from('groups').select('*').eq('id', id).single(),
      supabase.from('group_members').select('*').eq('group_id', id),
    ]);

    if (groupRes.error) return res.status(404).json({ error: 'Group not found' });

    res.json({
      group: groupRes.data,
      members: membersRes.data ?? [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/members
 * Add a member to the group (leader only).
 * Body: { userId, role? }
 */
app.post('/api/groups/:id/members', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Check if requester is leader
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (membership?.role !== 'leader') {
      return res.status(403).json({ error: 'Only group leader can add members' });
    }

    const { data, error } = await supabase
      .from('group_members')
      .upsert({
        group_id: id,
        user_id: userId,
        role: role || 'member',
      }, { onConflict: 'group_id,user_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, member: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/groups/:id/members/:userId
 * Remove a member from the group (leader only).
 */
app.delete('/api/groups/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if requester is leader
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (membership?.role !== 'leader') {
      return res.status(403).json({ error: 'Only group leader can remove members' });
    }

    // Cannot remove self (leader)
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Leader cannot remove themselves' });
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', id)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Group Journal ───────────────────────────────────────────────────────────

/**
 * GET /api/groups/:id/journal
 * Get journal entries for a group.
 */
app.get('/api/groups/:id/journal', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('group_journal')
      .select('*')
      .eq('group_id', id)
      .order('date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ entries: data ?? [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/journal
 * Add a journal entry.
 * Body: { content, date? }
 */
app.post('/api/groups/:id/journal', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, date } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const { data, error } = await supabase
      .from('group_journal')
      .insert({
        group_id: id,
        author_id: req.user.id,
        content,
        date: date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, entry: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Group Progress ──────────────────────────────────────────────────────────

/**
 * GET /api/groups/:id/progress
 * Get tasks for a group.
 */
app.get('/api/groups/:id/progress', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('group_progress')
      .select('*')
      .eq('group_id', id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ tasks: data ?? [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/groups/:id/progress
 * Create a new task.
 * Body: { title, description?, assigned_to?, due_date?, status? }
 */
app.post('/api/groups/:id/progress', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assigned_to, due_date, status } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const { data, error } = await supabase
      .from('group_progress')
      .insert({
        group_id: id,
        title,
        description: description || '',
        assigned_to: assigned_to || null,
        due_date: due_date || null,
        status: status || 'todo',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, task: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/groups/:id/progress/:taskId
 * Update a task's status/details.
 * Body: { title?, description?, status?, assigned_to?, due_date? }
 */
app.put('/api/groups/:id/progress/:taskId', requireAuth, async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const { title, description, status, assigned_to, due_date } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (due_date !== undefined) updateData.due_date = due_date;

    const { data, error } = await supabase
      .from('group_progress')
      .update(updateData)
      .eq('id', taskId)
      .eq('group_id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, task: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// AI Quick-Action Proxy Routes
// ──────────────────────────────────────────────────────────────────────────────

/** Shared AI usage helper — returns isPro, or sends 403 and returns null if over limit */
async function checkAndGetIsPro(req, res) {
  const isPro = await getIsPro(req.user.id);
  if (!isPro) {
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase.from('ai_usage').select('count').eq('user_id', req.user.id).eq('date', today).single();
    if ((usage?.count || 0) >= 10) {
      res.status(403).json({ error: 'requires_pro', message: 'Free limit: 10 AI messages per day' });
      return null;
    }
  }
  return isPro;
}

async function incrementAiUsage(userId) {
  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await supabase.from('ai_usage').select('*').eq('user_id', userId).eq('date', today).single();
  if (usage) {
    await supabase.from('ai_usage').update({ count: usage.count + 1 }).eq('id', usage.id);
  } else {
    await supabase.from('ai_usage').insert({ user_id: userId, date: today, count: 1 });
  }
}

/**
 * moderatePostAsync — run AI moderation in background after a post is published.
 * Updates ai_classification and status based on AI result.
 * safe      → keep status=published, ai_classification=safe
 * uncertain → status=flagged, ai_classification=uncertain
 * harmful   → status=hidden, approved=false, ai_classification=harmful
 * AI down   → ai_classification=pending_review, status unchanged (published)
 */
async function moderatePostAsync(postId, text) {
  try {
    const aiResp = await fetch(`${AI_SERVICE_URL}/ai/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!aiResp.ok) {
      await supabase.from('community_posts')
        .update({ ai_classification: 'pending_review' })
        .eq('id', postId);
      return;
    }

    const aiData = await aiResp.json();
    const classification = aiData.classification || 'uncertain';
    const updateData = { ai_classification: classification };

    if (classification === 'uncertain') {
      updateData.status = 'flagged';
    } else if (classification === 'harmful') {
      updateData.status = 'hidden';
      updateData.approved = false;
    }

    await supabase.from('community_posts').update(updateData).eq('id', postId);
  } catch (err) {
    console.error('[moderatePostAsync] failed:', err.message);
    await supabase.from('community_posts')
      .update({ ai_classification: 'pending_review' })
      .eq('id', postId)
      .catch(() => { });
  }
}

/**
 * POST /api/ai/research
 * Proxy to AI service /ai/research with usage tracking.
 * Body: { query }
 */
app.post('/api/ai/research', requireAuth, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: 'query is required' });

    const isPro = await checkAndGetIsPro(req, res);
    if (isPro === null) return;

    const aiResp = await fetch(`${AI_SERVICE_URL}/ai/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
    });
    const aiData = await aiResp.json();

    if (aiResp.ok && !isPro) await incrementAiUsage(req.user.id);
    res.status(aiResp.status).json(aiData);
  } catch (err) {
    res.status(503).json({ error: `Cannot reach AI service: ${err.message}` });
  }
});

/**
 * POST /api/ai/predict
 * Fetch latest sensor data then proxy to AI service /ai/predict.
 * Body: { user_confirmed: true }
 */
app.post('/api/ai/predict', requireAuth, async (req, res) => {
  try {
    const { user_confirmed } = req.body;
    if (!user_confirmed) return res.status(403).json({ error: 'user_confirmed is required' });

    const isPro = await checkAndGetIsPro(req, res);
    if (isPro === null) return;

    // Fetch latest sensor reading for context
    const { data: latest } = await supabase
      .from('sensor_data')
      .select('temperature, humidity, co2, ch4, pressure, light, timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const aiResp = await fetch(`${AI_SERVICE_URL}/ai/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_confirmed: true,
        context: latest
          ? `Latest reading (${latest.timestamp}): temp=${latest.temperature}°C, humidity=${latest.humidity}%, co2=${latest.co2}ppm, light=${latest.light}lux`
          : 'No sensor data available.',
      }),
    });
    const aiData = await aiResp.json();

    if (aiResp.ok && !isPro) await incrementAiUsage(req.user.id);
    res.status(aiResp.status).json(aiData);
  } catch (err) {
    res.status(503).json({ error: `Cannot reach AI service: ${err.message}` });
  }
});

/**
 * POST /api/ai/report
 * Proxy to AI service /ai/report with pro-check for docx/latex.
 * Body: { user_confirmed: true, format }
 */
app.post('/api/ai/report', requireAuth, async (req, res) => {
  try {
    const { user_confirmed, format } = req.body;
    if (!user_confirmed) return res.status(403).json({ error: 'user_confirmed is required' });

    const isPro = await getIsPro(req.user.id);
    if (!isPro && (format === 'docx' || format === 'latex')) {
      return res.status(403).json({ error: 'requires_pro', message: 'Pro subscription required for LaTeX/DOCX export' });
    }

    const isProForLimit = await checkAndGetIsPro(req, res);
    if (isProForLimit === null) return;

    const aiResp = await fetch(`${AI_SERVICE_URL}/ai/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_confirmed: true, format: format || 'markdown' }),
    });
    const aiData = await aiResp.json();

    if (aiResp.ok && !isPro) await incrementAiUsage(req.user.id);
    res.status(aiResp.status).json(aiData);
  } catch (err) {
    res.status(503).json({ error: `Cannot reach AI service: ${err.message}` });
  }
});

/**
 * POST /api/groups/:id/schedule
 * AI-generates a weekly schedule and saves it to the group journal.
 * Body: { user_confirmed: true }
 */
app.post('/api/groups/:id/schedule', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_confirmed } = req.body;
    if (!user_confirmed) return res.status(403).json({ error: 'user_confirmed is required' });

    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', req.user.id)
      .single();
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const { data: group } = await supabase.from('groups').select('name').eq('id', id).single();
    const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', id);

    const aiResp = await fetch(`${AI_SERVICE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Generate a practical weekly activity schedule for agricultural group "${group?.name || id}" with ${members?.length || 0} members. Include daily morning/afternoon tasks, roles, and goals for the week.`,
        session_id: `grp_sched_${id}`,
        mode: 'chat',
        control_granted: false,
      }),
    });
    const aiData = await aiResp.json();
    const schedule = aiData.reply || 'Could not generate schedule.';

    await supabase.from('group_journal').insert({
      group_id: id,
      author_id: req.user.id,
      content: `[AI Generated Schedule]\n${schedule}`,
      date: new Date().toISOString().split('T')[0],
    });

    res.json({ ok: true, schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/posts
 * Create a community post. Sets status="pending", triggers AI moderation async.
 * Body: { title, content, tags[] }
 */
app.post('/api/posts', requireAuth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!content?.trim() || content.trim().length < 10) {
      return res.status(400).json({ error: 'Content must be at least 10 characters' });
    }

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        author_id: req.user.id,
        user_email: req.user.email || '',
        title: title.trim(),
        body: content.trim(),
        tags: Array.isArray(tags) ? tags : [],
        status: 'published',
        approved: true,
        ai_classification: 'pending',
        likes: 0,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Async AI moderation — fire and forget, does not block response
    moderatePostAsync(data.id, `${title.trim()} ${content.trim()}`).catch(err => console.error('[Post] Moderation failed:', err));

    res.json({ ok: true, post: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/announcements
 * Save an announcement as a community post (status: pending for moderation).
 * Body: { content, user_confirmed: true }
 */
app.post('/api/announcements', requireAuth, async (req, res) => {
  try {
    const { content, user_confirmed } = req.body;
    if (!user_confirmed) return res.status(403).json({ error: 'user_confirmed is required' });
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        content: content.trim(),
        title: 'Announcement',
        author_id: req.user.id,
        user_email: req.user.email || '',
        tags: ['announcement'],
        status: 'pending',
        approved: false,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, post: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Attach MQTT ↔ WebSocket bridge ──────────────────────────────────────────
const mqttBridge = require('./mqttBridge');
mqttBridge(server);

/**
 * GET /api/iot/mqtt-status
 * Returns current HiveMQ broker connection status.
 */
app.get('/api/iot/mqtt-status', (req, res) => {
  res.json(mqttBridge.getStatus());
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Run at Port: ${PORT}`);
  console.log(`WebSocket  : ws://localhost:${PORT}/ws`);
});