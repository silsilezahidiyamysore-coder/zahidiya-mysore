-- Mureeds (users) table
CREATE TABLE IF NOT EXISTS mureeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  group_type TEXT NOT NULL CHECK (group_type IN ('mardana', 'zanana')),
  role TEXT NOT NULL DEFAULT 'mureed' CHECK (role IN ('admin', 'mureed')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Classes table (MP3, Video, PDF uploads)
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('audio', 'video', 'pdf')),
  file_url TEXT NOT NULL,
  group_type TEXT NOT NULL CHECK (group_type IN ('mardana', 'zanana', 'both')),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  target_role TEXT NOT NULL DEFAULT 'admin' CHECK (target_role IN ('admin', 'mureed', 'all')),
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default admin account (mobile: 9999999999, password: change_this_password)
INSERT OR IGNORE INTO mureeds (name, mobile, password, group_type, role, status)
VALUES ('Admin', '9999999999', 'change_this_password', 'mardana', 'admin', 'approved');

-- Alarm settings table (Admin control ke liye)
CREATE TABLE IF NOT EXISTS alarm_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  start_alarm_enabled INTEGER NOT NULL DEFAULT 1,
  start_alarm_duration_seconds INTEGER NOT NULL DEFAULT 60,
  end_reminder_enabled INTEGER NOT NULL DEFAULT 1,
  end_reminder_minutes_before INTEGER NOT NULL DEFAULT 10,
  end_reminder_repeat_count INTEGER NOT NULL DEFAULT 3,
  end_reminder_beep_seconds INTEGER NOT NULL DEFAULT 2,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO alarm_settings (id) VALUES (1);
