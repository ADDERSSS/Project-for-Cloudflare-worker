import { aggregateClicksForDate, purgeOldClickLogs } from '../db/queries';

export async function aggregateDailyStats(env: Env): Promise<void> {
  // Aggregate yesterday's clicks
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  await aggregateClicksForDate(env.DB, dateStr);
  await purgeOldClickLogs(env.DB, 90);
  console.log(`Aggregated stats for ${dateStr}, purged logs older than 90 days`);
}
