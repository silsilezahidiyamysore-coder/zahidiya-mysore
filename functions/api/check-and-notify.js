// functions/api/check-and-notify.js
// Isko har 1 minute mein ek free cron-service (jaise cron-job.org) se hit karwana hai.
// Yeh khud current IST time check karke, agar namaz/custom-alarm/event ka time hua ho,
// to sab (ya matching) mureedon ke phone par REAL push notification bhej deta hai —
// chahe unki screen lock ho ya app band ho.

import { buildPushHTTPRequest } from "@pushforge/builder";

function nowIST() {
  // Cloudflare Worker hamesha UTC mein chalta hai, isliye 5:30 add karke IST nikalte hain
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
}

function istDateStr(d) {
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}

function toMinutes(hhmm) {
  if (!hhmm) return null;
  const parts = String(hhmm).trim().split(' ')[0].split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

async function shouldSend(db, key) {
  try {
    const res = await db.prepare(`INSERT OR IGNORE INTO push_sent_log (alarm_key, sent_at) VALUES (?, ?)`)
      .bind(key, new Date().toISOString()).run();
    return res.meta && res.meta.changes > 0;
  } catch (e) { return false; }
}

async function getTodayPrayerTimes(db, dateStr) {
  const row = await db.prepare(`SELECT * FROM daily_prayer_cache WHERE date = ?`).bind(dateStr).first();
  if (row) return row;
  try {
    const res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Mysore&country=India&method=2');
    const data = await res.json();
    const t = data.data.timings;
    const clean = (s) => (s || '').split(' ')[0];
    const times = { fajr: clean(t.Fajr), dhuhr: clean(t.Dhuhr), asr: clean(t.Asr), maghrib: clean(t.Maghrib), isha: clean(t.Isha) };
    await db.prepare(
      `INSERT OR REPLACE INTO daily_prayer_cache (date, fajr, dhuhr, asr, maghrib, isha) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(dateStr, times.fajr, times.dhuhr, times.asr, times.maghrib, times.isha).run();
    return { date: dateStr, ...times };
  } catch (e) { return null; }
}

async function sendPushToSubscription(env, sub, payload) {
  const request = await buildPushHTTPRequest({
    privateJWK: env.VAPID_PRIVATE_KEY_JWK,
    subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    message: {
      payload,
      adminContact: 'mailto:silsilezahidiyamysore@gmail.com',
      options: { ttl: 1800, urgency: 'high' }
    }
  });
  const res = await fetch(request.endpoint, { method: 'POST', headers: request.headers, body: request.body });
  return res.status;
}

async function sendToSubscriptions(env, db, subs, payload) {
  for (const sub of subs) {
    try {
      const status = await sendPushToSubscription(env, sub, payload);
      if (status === 404 || status === 410) {
        // Yeh subscription ab mar chuki hai (mureed ne notification band kar di ya app uninstall)
        await db.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).bind(sub.id).run();
      }
    } catch (e) { /* ek subscription fail ho to baaki na ruken */ }
  }
}

export async function onRequestGet(context) {
  return handle(context);
}
export async function onRequestPost(context) {
  return handle(context);
}

async function handle(context) {
  try {
    const db = context.env.DB;
    if (!context.env.VAPID_PRIVATE_KEY_JWK) {
      return Response.json({ success: false, message: "VAPID_PRIVATE_KEY_JWK env var set nahi hai" }, { status: 500 });
    }

    const ist = nowIST();
    const nowMin = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    const todayISO = istDateStr(ist);
    const todayDow = ist.getUTCDay();
    const todayDate = ist.getUTCDate();
    let sentCount = 0;

    const alarmSettings = await db.prepare(`SELECT * FROM alarm_settings WHERE id = 1`).first();
    const allSubs = (await db.prepare(`SELECT * FROM push_subscriptions`).all()).results || [];
    const allMureeds = (await db.prepare(`SELECT id, mobile, group_type, role FROM mureeds`).all()).results || [];
    const mureedByMobile = {};
    allMureeds.forEach(m => { mureedByMobile[m.mobile] = m; });

    // ---------- 1) NAMAZ ALARM ----------
    if (alarmSettings && Number(alarmSettings.start_alarm_enabled) !== 0) {
      const prayerTimes = await getTodayPrayerTimes(db, todayISO);
      if (prayerTimes) {
        const prayers = [
          ['Fajr', prayerTimes.fajr], ['Dhuhr', prayerTimes.dhuhr], ['Asr', prayerTimes.asr],
          ['Maghrib', prayerTimes.maghrib], ['Isha', prayerTimes.isha]
        ];
        for (const [name, time] of prayers) {
          const tMin = toMinutes(time);
          if (tMin !== null && tMin === nowMin) {
            const key = 'namaz-' + name + '-' + todayISO;
            if (await shouldSend(db, key)) {
              await sendToSubscriptions(context.env, db, allSubs, {
                title: '🕌 ' + name + ' ki namaz ka waqt ho gaya hai',
                body: 'Silsila-e-Zahidiya Mysore', tag: 'namaz-' + name
              });
              sentCount++;
            }
          }
        }
      }
    }

    // ---------- 2) CUSTOM ALARM ----------
    if (alarmSettings && Number(alarmSettings.custom_alarm_enabled) !== 0 && alarmSettings.custom_alarm_start) {
      const sMin = toMinutes(alarmSettings.custom_alarm_start);
      if (sMin !== null && sMin === nowMin) {
        const key = 'customalarm-' + todayISO + '-' + alarmSettings.custom_alarm_start;
        if (await shouldSend(db, key)) {
          await sendToSubscriptions(context.env, db, allSubs, {
            title: '🔔 ' + (alarmSettings.custom_alarm_title || 'Alarm'),
            body: 'Silsila-e-Zahidiya Mysore', tag: 'custom-alarm'
          });
          sentCount++;
        }
      }
    }

    // ---------- 3) EVENTS (weekly / monthly / ek-baar) ----------
    const events = (await db.prepare(`SELECT * FROM events WHERE is_enabled = 1`).all()).results || [];
    for (const ev of events) {
      let matchesToday = false;
      if (ev.repeat_type === 'weekly' && Number(ev.day_of_week) === todayDow) matchesToday = true;
      else if (ev.repeat_type === 'monthly' && Number(ev.day_of_month) === todayDate) matchesToday = true;
      else if (ev.repeat_type === 'once' && ev.event_date === todayISO) matchesToday = true;
      if (!matchesToday) continue;

      const sMin = toMinutes(ev.start_time);
      if (sMin === null || sMin !== nowMin) continue;

      const key = 'event-' + ev.id + '-' + todayISO;
      if (!(await shouldSend(db, key))) continue;

      const targetSubs = allSubs.filter(sub => {
        const m = mureedByMobile[sub.mobile];
        if (!m) return false;
        if (m.role === 'admin') return true;
        return ev.group_type === 'both' || ev.group_type === m.group_type;
      });
      await sendToSubscriptions(context.env, db, targetSubs, {
        title: '📅 ' + ev.title,
        body: 'Silsila-e-Zahidiya Mysore', tag: 'event-' + ev.id
      });
      sentCount++;
    }

    // ---------- 4) NAYI/EDIT CLASSES (existing "notifications" table use karte hain) ----------
    const recentNotifs = (await db.prepare(
      `SELECT * FROM notifications ORDER BY id DESC LIMIT 30`
    ).all()).results || [];
    for (const n of recentNotifs) {
      const key = 'classnotif-' + n.id;
      if (!(await shouldSend(db, key))) continue;

      let targetSubs;
      if (n.target_mobile) {
        targetSubs = allSubs.filter(sub => sub.mobile === n.target_mobile);
      } else if (n.target_role === 'admin') {
        targetSubs = allSubs.filter(sub => {
          const m = mureedByMobile[sub.mobile];
          return m && m.role === 'admin';
        });
      } else if (n.target_role === 'mureed') {
        targetSubs = allSubs.filter(sub => {
          const m = mureedByMobile[sub.mobile];
          return m && m.role !== 'admin';
        });
      } else {
        targetSubs = allSubs;
      }

      await sendToSubscriptions(context.env, db, targetSubs, {
        title: '📚 ' + (n.message || 'Nayi Class Aayi Hai'),
        body: 'Silsila-e-Zahidiya Mysore', tag: 'class-notif-' + n.id
      });
      sentCount++;
    }

    return Response.json({ success: true, checked_at_ist: ist.toISOString(), sent: sentCount });
  } catch (err) {
    return Response.json({ success: false, message: err.message, stack: err.stack }, { status: 500 });
  }
}
