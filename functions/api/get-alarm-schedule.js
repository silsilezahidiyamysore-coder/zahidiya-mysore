// functions/api/get-alarm-schedule.js
// Zahidiya Alarm (companion app) yeh endpoint call karti hai taaki use pata chale
// aaj ke Namaz aur Event ke time kya hain. Mobile number query param se bhejna hai
// taaki mureed ke group_type (Zanana/Mardana) ke hisaab se sahi Events milein.
// Example: /api/get-alarm-schedule?mobile=9999999999

function nowIST() {
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

function buildISTDateTime(dateStr, hhmm) {
  const mins = toMinutes(hhmm);
  if (mins === null) return null;
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return dateStr + 'T' + hh + ':' + mm + ':00+05:30';
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
  } catch (e) {
    return null;
  }
}

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const url = new URL(context.request.url);
    const mobile = url.searchParams.get('mobile') || '';

    const ist = nowIST();
    const todayISO = istDateStr(ist);
    const todayDow = ist.getUTCDay();
    const todayDate = ist.getUTCDate();

    let groupType = null;
    let isAdmin = false;
    if (mobile) {
      const m = await db.prepare(`SELECT group_type, role FROM mureeds WHERE mobile = ?`).bind(mobile).first();
      if (m) {
        groupType = m.group_type;
        isAdmin = m.role === 'admin';
      }
    }

    const schedule = [];

    const alarmSettings = await db.prepare(`SELECT * FROM alarm_settings WHERE id = 1`).first();
    if (alarmSettings && Number(alarmSettings.start_alarm_enabled) !== 0) {
      const prayerTimes = await getTodayPrayerTimes(db, todayISO);
      if (prayerTimes) {
        const prayers = [
          ['Fajr', prayerTimes.fajr], ['Dhuhr', prayerTimes.dhuhr], ['Asr', prayerTimes.asr],
          ['Maghrib', prayerTimes.maghrib], ['Isha', prayerTimes.isha]
        ];
        for (const [name, time] of prayers) {
          const dt = buildISTDateTime(todayISO, time);
          if (dt) {
            schedule.push({
              id: 'namaz-' + name + '-' + todayISO,
              type: 'namaz',
              title: name + ' ki namaz ka waqt ho gaya hai',
              dateTime: dt
            });
          }
        }
      }
    }

    const events = (await db.prepare(`SELECT * FROM events WHERE is_enabled = 1`).all()).results || [];
    for (const ev of events) {
      let matchesToday = false;
      if (ev.repeat_type === 'weekly' && Number(ev.day_of_week) === todayDow) matchesToday = true;
      else if (ev.repeat_type === 'monthly' && Number(ev.day_of_month) === todayDate) matchesToday = true;
      else if (ev.repeat_type === 'once' && ev.event_date === todayISO) matchesToday = true;
      if (!matchesToday) continue;

      if (!isAdmin && groupType && ev.group_type !== 'both' && ev.group_type !== groupType) continue;

      const dt = buildISTDateTime(todayISO, ev.start_time);
      if (dt) {
        schedule.push({
          id: 'event-' + ev.id + '-' + todayISO,
          type: 'event',
          title: ev.title,
          dateTime: dt
        });
      }
    }

    return Response.json({ success: true, checked_at_ist: ist.toISOString(), schedule });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
