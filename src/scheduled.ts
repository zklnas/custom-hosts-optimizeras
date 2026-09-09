import { Bindings } from "./types"
import { fetchLatestHostsData, storeData } from "./services/hosts"

export async function handleSchedule(
  event: ScheduledEvent,
  env: Bindings
): Promise<void> {
  console.log("Running scheduled task (optimized caching strategy)...")

  try {
    // 参考 TinsFox/github-hosts 最佳实践：定时任务每小时更新一次
    // 在定时任务中总是获取最新数据，保证缓存的新鲜度
    console.log("Fetching latest hosts data for scheduled update...")
    
    const newEntries = await fetchLatestHostsData()
    await storeData(env, newEntries)

    console.log(`Scheduled task completed successfully with ${newEntries.length} entries`)
    console.log("Cache updated, next update in 1 hour")
  } catch (error) {
    console.error("Error in scheduled task:", error)
  }
}
