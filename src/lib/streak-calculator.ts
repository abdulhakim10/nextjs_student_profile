import type { AttendanceRecord } from '@/types';

export interface StreakEntry {
  uid: string;
  name: string;
  streak: number;
  tier: 'on-fire' | 'solid' | 'good';
}

export function calculateStreaks(records: AttendanceRecord[]): StreakEntry[] {
  // Group records by uid
  const byEmployee = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    if (!r.uid) continue;
    const existing = byEmployee.get(r.uid) || [];
    existing.push(r);
    byEmployee.set(r.uid, existing);
  }

  const streaks: StreakEntry[] = [];

  for (const [uid, recs] of byEmployee) {
    // Sort by date descending (most recent first)
    const sorted = [...recs].sort((a, b) => {
      const da = new Date(a.date || '').getTime();
      const db = new Date(b.date || '').getTime();
      return db - da;
    });

    // Count consecutive days where status is "present" or "late" (both count as showed up)
    // Skip rest_day entries — they don't break the streak
    let streak = 0;
    for (const rec of sorted) {
      const status = rec.status?.toLowerCase();
      if (status === 'present' || status === 'late') {
        streak++;
      } else if (status === 'rest_day') {
        continue; // weekends/off days don't break streak
      } else {
        break;
      }
    }

    if (streak >= 3) {
      const name = sorted[0].name || uid;
      const tier: StreakEntry['tier'] = streak >= 7 ? 'on-fire' : streak >= 5 ? 'solid' : 'good';
      streaks.push({ uid, name, streak, tier });
    }
  }

  // Sort by streak length descending, return top 5
  return streaks.sort((a, b) => b.streak - a.streak).slice(0, 5);
}
