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

// Fajr ka asli "khatam" waqt Sunrise hota hai (website bhi yahi dikhati hai).
// Sunrise DB mein save nahi hota, isliye yahin se le lete hain. Na mile to
// purana tareeka (agli namaz ka waqt) hi chalega.
// Kisi bhi tareekh (YYYY-MM-DD) ke liye Aladhan ka sahi (us din ka) URL
function aladhanUrl(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  if (!m) return 'https://api.aladhan.com/v1/timingsByCity?city=Mysore&country=India&method=2';
  return 'https://api.aladhan.com/v1/timingsByCity/' + m[3] + '-' + m[2] + '-' + m[1] + '?city=Mysore&country=India&method=2';
}

// Us tareekh ke namaz ke time laata hai. Dated URL na chale to (sirf aaj ke liye)
// purana bina-tareekh wala URL try karta hai.
async function fetchTimings(dateStr) {
  try {
    const r = await fetch(aladhanUrl(dateStr));
    const d = await r.json();
    if (d && d.data && d.data.timings) return d.data.timings;
  } catch (e) {}
  if (dateStr === istDateStr(nowIST())) {
    try {
      const r = await fetch(aladhanUrl(''));
      const d = await r.json();
      if (d && d.data && d.data.timings) return d.data.timings;
    } catch (e) {}
  }
  return null;
}

let _sunriseCache = { date: '', value: null };
async function getSunriseHHMM(dateStr) {
  if (_sunriseCache.date === dateStr && _sunriseCache.value) return _sunriseCache.value;
  const t = await fetchTimings(dateStr);
  const v = t ? String(t.Sunrise || '').split(' ')[0] : '';
  if (v) { _sunriseCache = { date: dateStr, value: v }; return v; }
  return null;
}

// Aane wale din (kal) ke time database ke purane save kiye hue par bharosa nahi
// karte (pehle wo ghalat ~1 min wale save ho gaye the) — har baar sahi fetch
// karke database bhi theek kar dete hain (6 ghante memory mein yaad rakhte hain).
const _futureTimesCache = {};
async function getTodayPrayerTimes(db, dateStr) {
  const isFuture = dateStr > istDateStr(nowIST());
  if (isFuture) {
    const c = _futureTimesCache[dateStr];
    if (c && Date.now() - c.at < 6 * 60 * 60 * 1000) return c.value;
  } else {
    const row = await db.prepare(`SELECT * FROM daily_prayer_cache WHERE date = ?`).bind(dateStr).first();
    if (row) return row;
  }
  try {
    // Pehle tha: hamesha AAJ ke time fetch hote the aur "kal" ki tareekh ke naam
    // se save ho jaate the (isse kal ke time ~1 minute ghalat ho jaate the).
    // Ab har tareekh ka apna sahi time aata hai.
    const t = await fetchTimings(dateStr);
    if (!t) return null;
    const clean = (x) => (x || '').split(' ')[0];
    const times = { fajr: clean(t.Fajr), dhuhr: clean(t.Dhuhr), asr: clean(t.Asr), maghrib: clean(t.Maghrib), isha: clean(t.Isha) };
    await db.prepare(
      `INSERT OR REPLACE INTO daily_prayer_cache (date, fajr, dhuhr, asr, maghrib, isha) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(dateStr, times.fajr, times.dhuhr, times.asr, times.maghrib, times.isha).run();
    const value = { date: dateStr, ...times };
    if (isFuture) _futureTimesCache[dateStr] = { at: Date.now(), value };
    return value;
  } catch (e) {
    return null;
  }
}

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const url = new URL(context.request.url);
    const mobile = url.searchParams.get('mobile') || '';

    // Optional ?date=YYYY-MM-DD — app kal ka schedule bhi maangti hai taaki
    // kal subah ke alarm raat se pehle hi phone mein set ho jaayein.
    const dateParam = url.searchParams.get('date') || '';
    const ist = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? new Date(dateParam + 'T12:00:00Z') : nowIST();
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

    // ---------- 1) NAMAZ TIMES ----------
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

    // ---------- 1a) END REMINDER (namaz khatam hone se pehle) ----------
    if (alarmSettings && Number(alarmSettings.end_reminder_enabled) !== 0) {
      const prayerTimes = await getTodayPrayerTimes(db, todayISO);
      if (prayerTimes) {
        const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        const times = [prayerTimes.fajr, prayerTimes.dhuhr, prayerTimes.asr, prayerTimes.maghrib, prayerTimes.isha];

        // Isha ka asli "Khatam" waqt agle din ka Fajr hota hai (jaisa homepage
        // par bhi dikhta hai) — isliye kal ka Fajr alag se fetch karna zaroori hai.
        const tomorrow = new Date(ist.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowISO = istDateStr(tomorrow);
        const tomorrowPrayerTimes = await getTodayPrayerTimes(db, tomorrowISO);

        for (let i = 0; i < names.length; i++) {
          const tMin = toMinutes(times[i]);
          if (tMin === null) continue;

          let dt;
          // NOTE: yahan "asli" end time bhejte hain (jab agli namaz shuru
          // hoti hai), reminder-se-pehle-wala waqt nahi — warna app ki list
          // mein "End" ghalat (10 min jaldi) dikhta tha. Reminder push kab
          // bhejna hai, wo check-and-notify.js mein alag se (end_reminder_
          // minutes_before ke hisaab se) decide hota hai; yeh data sirf
          // app mein "End" time SAHI dikhane ke liye hai.
          if (i + 1 < names.length) {
            const nextTMin = toMinutes(times[i + 1]);
            if (nextTMin === null) continue;
            const hh = String(Math.floor(nextTMin / 60)).padStart(2, '0');
            const mm = String(((nextTMin % 60) + 60) % 60).padStart(2, '0');
            dt = buildISTDateTime(todayISO, hh + ':' + mm);
          } else {
            // Isha — agle din ke asli Fajr time se
            if (!tomorrowPrayerTimes) continue;
            const nextFajrMin = toMinutes(tomorrowPrayerTimes.fajr);
            if (nextFajrMin === null) continue;
            const hh = String(Math.floor(nextFajrMin / 60)).padStart(2, '0');
            const mm = String(nextFajrMin % 60).padStart(2, '0');
            dt = buildISTDateTime(tomorrowISO, hh + ':' + mm);
          }

          // Fajr ka "End" = Sunrise (website jaisa), Dhuhr ka waqt nahi
          if (i === 0) {
            const sr = await getSunriseHHMM(todayISO);
            const srMin = toMinutes(sr);
            if (srMin !== null && srMin > tMin) dt = buildISTDateTime(todayISO, sr);
          }

          if (dt) {
            schedule.push({
              id: 'endreminder-' + names[i] + '-' + todayISO,
              type: 'end_reminder',
              title: '⏳ ' + names[i] + ' ki namaz khatam hone wali hai',
              dateTime: dt
            });
          }
        }
      }
    }

    // ---------- 1b) CUSTOM ALARM ----------
    if (alarmSettings && Number(alarmSettings.custom_alarm_enabled) !== 0 && alarmSettings.custom_alarm_start) {
      const dt = buildISTDateTime(todayISO, alarmSettings.custom_alarm_start);
      if (dt) {
        // Custom alarm ka text/file bhi bhejte hain, taaki alarm app ke andar hi khul jaaye
        let caFileUrl = alarmSettings.custom_alarm_file_url || '';
        if (caFileUrl.startsWith('/')) {
          caFileUrl = 'https://zahidiya-mysore.pages.dev' + caFileUrl;
        }
        const caEnd = alarmSettings.custom_alarm_end ? buildISTDateTime(todayISO, alarmSettings.custom_alarm_end) : null;
        schedule.push({
          id: 'customalarm-' + todayISO,
          type: 'custom_alarm',
          title: alarmSettings.custom_alarm_title || 'Alarm',
          dateTime: dt,
          // End time tak app ki list mein rahe (file dekhne ke liye)
          ...(caEnd && caEnd > dt ? { realEndDateTime: caEnd } : {}),
          contentType: alarmSettings.custom_alarm_content_type || 'none',
          contentText: alarmSettings.custom_alarm_content_text || '',
          fileUrl: caFileUrl
        });
      }
    }

    // ---------- 2) TODAY'S EVENTS ----------
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
        // Event ka text/file bhi bhejte hain, taaki alarm app ke andar hi khul jaaye
        let evFileUrl = ev.file_url || '';
        if (evFileUrl.startsWith('/')) {
          evFileUrl = 'https://zahidiya-mysore.pages.dev' + evFileUrl;
        }
        const evEnd = ev.end_time ? buildISTDateTime(todayISO, ev.end_time) : null;
        schedule.push({
          id: 'event-' + ev.id + '-' + todayISO,
          type: 'event',
          title: ev.title,
          dateTime: dt,
          // Event khatam hone tak app ki list mein rahe (file dekhne ke liye)
          ...(evEnd && evEnd > dt ? { realEndDateTime: evEnd } : {}),
          contentType: ev.content_type || 'none',
          contentText: ev.content_text || '',
          fileUrl: evFileUrl
        });
      }
    }

    let toneUrl = (alarmSettings && alarmSettings.alarm_tone_url) || '';
    if (toneUrl && toneUrl.startsWith('/')) {
      toneUrl = 'https://zahidiya-mysore.pages.dev' + toneUrl;
    }
    let eventToneUrl = (alarmSettings && alarmSettings.event_tone_url) || '';
    if (eventToneUrl && eventToneUrl.startsWith('/')) {
      eventToneUrl = 'https://zahidiya-mysore.pages.dev' + eventToneUrl;
    }
    let liveToneUrl = (alarmSettings && alarmSettings.live_class_tone_url) || '';
    if (liveToneUrl && liveToneUrl.startsWith('/')) {
      liveToneUrl = 'https://zahidiya-mysore.pages.dev' + liveToneUrl;
    }
    let customToneUrl = (alarmSettings && alarmSettings.custom_alarm_tone_url) || '';
    if (customToneUrl && customToneUrl.startsWith('/')) {
      customToneUrl = 'https://zahidiya-mysore.pages.dev' + customToneUrl;
    }

    return Response.json({
      success: true,
      checked_at_ist: ist.toISOString(),
      schedule,
      tone_url: toneUrl,
      event_tone_url: eventToneUrl,
      live_class_tone_url: liveToneUrl,
      custom_alarm_tone_url: customToneUrl,
      start_alarm_duration_seconds: (alarmSettings && alarmSettings.start_alarm_duration_seconds) || 60,
      end_reminder_minutes_before: (alarmSettings && alarmSettings.end_reminder_minutes_before) || 0,
      end_reminder_beep_seconds: (alarmSettings && alarmSettings.end_reminder_beep_seconds) || 20
    });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
