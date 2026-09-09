import { DNS_PROVIDERS, GITHUB_URLS, HOSTS_TEMPLATE } from "../constants"
import { Bindings } from "../types"

export type HostEntry = [string, string]

interface DomainData {
  ip: string
  lastUpdated: string
  lastChecked: string
  responseTime?: number
  provider?: string
  isOptimized?: boolean
  resolvedAt?: string
}

interface DomainDataList {
  [key: string]: DomainData
}

interface KVData {
  domain_data: DomainDataList
  lastUpdated: string
  updateCount?: number
  version?: string
}

interface DnsQuestion {
  name: string
  type: number
}

interface DnsAnswer {
  name: string
  type: number
  TTL: number
  data: string
}

interface DnsResponse {
  Status: number
  TC: boolean
  RD: boolean
  RA: boolean
  AD: boolean
  CD: boolean
  Question: DnsQuestion[]
  Answer: DnsAnswer[]
}

// 重试机制 - 优化超时和重试策略
async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 2, // 减少重试次数，避免过长等待
  delay: number = 500  // 减少延迟时间
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries === 0) throw error
    await new Promise((resolve) => setTimeout(resolve, delay))
    return retry(fn, retries - 1, delay * 1.5) // 减少延迟增长倍数
  }
}

// DNS查询超时控制
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('DNS query timeout')), timeoutMs)
    )
  ])
}

// 使用 DNS API 获取 IP，基于 TinsFox 项目的实现
export async function fetchIPFromDNS(
  domain: string,
  providerName?: string
): Promise<string | null> {
  const provider =
    DNS_PROVIDERS.find((p) => p.name === providerName) || DNS_PROVIDERS[0]

  try {
    const response = await withTimeout(
      retry(() =>
        fetch(provider.url(domain), { 
          headers: provider.headers,
          signal: AbortSignal.timeout(5000) // 5秒超时
        })
      )
    )

    if (!response.ok) return null

    const data = (await response.json()) as DnsResponse

    // 查找类型为 1 (A记录) 的答案
    const aRecord = data.Answer?.find((answer) => answer.type === 1)
    const ip = aRecord?.data

    if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
      return ip
    }
  } catch (error) {
    console.error(`Error with DNS provider ${provider.name}:`, error)
  }

  return null
}

// 多DNS提供商重试机制
export async function fetchIPFromMultipleDNS(domain: string): Promise<string | null> {
  for (const provider of DNS_PROVIDERS) {
    try {
      const ip = await fetchIPFromDNS(domain, provider.name)
      if (ip) {
        console.log(`Successfully resolved ${domain} via ${provider.name}: ${ip}`)
        return ip
      }
      console.log(`Failed to resolve ${domain} via ${provider.name}`)
    } catch (error) {
      console.error(`Error resolving ${domain} via ${provider.name}:`, error)
    }
  }
  
  console.error(`Failed to resolve ${domain} from all DNS providers`)
  return null
}

// 批量获取最新 hosts 数据
export async function fetchLatestHostsData(): Promise<HostEntry[]> {
  const entries: HostEntry[] = []
  const batchSize = 5

  console.log(`Starting batch processing for ${GITHUB_URLS.length} domains`)

  for (let i = 0; i < GITHUB_URLS.length; i += batchSize) {
    console.log(
      `Processing batch ${i / batchSize + 1}/${Math.ceil(
        GITHUB_URLS.length / batchSize
      )}`
    )

    const batch = GITHUB_URLS.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (domain) => {
        const ip = await fetchIPFromMultipleDNS(domain)
        console.log(`Domain: ${domain}, IP: ${ip}`)
        return ip ? ([ip, domain] as HostEntry) : null
      })
    )

    entries.push(
      ...batchResults.filter((result): result is HostEntry => result !== null)
    )

    if (i + batchSize < GITHUB_URLS.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  console.log(`Total entries found: ${entries.length}`)
  return entries
}

// 存储数据
export async function storeData(
  env: Bindings,
  data: HostEntry[]
): Promise<void> {
  await updateHostsData(env, data)
}

// 获取 hosts 数据 - 优化缓存策略，参考 TinsFox/github-hosts 最佳实践
export async function getHostsData(env: Bindings, forceRefresh: boolean = false): Promise<HostEntry[]> {
  try {
    const kvData = (await env.custom_hosts.get("domain_data", {
      type: "json",
    })) as KVData | null

    // 检查缓存是否有效（6小时内的数据认为有效，而不是1小时）
    const cacheValidTime = 6 * 60 * 60 * 1000 // 6小时
    const isDataValid = kvData?.lastUpdated && 
      (new Date(kvData.lastUpdated).getTime() + cacheValidTime > Date.now()) &&
      Object.keys(kvData.domain_data || {}).length > 0

    // 只有在强制刷新或数据无效时才获取新数据
    if (forceRefresh || !isDataValid) {
      console.log(`${forceRefresh ? 'Force refresh requested' : 'Cache expired or invalid'}, fetching new data...`)
      const newEntries = await fetchLatestHostsData()
      await storeData(env, newEntries)
      return newEntries
    }

    // 从缓存获取数据
    const entries: HostEntry[] = []
    for (const domain of GITHUB_URLS) {
      const domainData = kvData!.domain_data[domain]
      if (domainData) {
        entries.push([domainData.ip, domain])
      }
    }
    
    const cacheAge = Math.round((Date.now() - new Date(kvData!.lastUpdated).getTime()) / 60000)
    console.log(`Loaded ${entries.length} entries from cache (age: ${cacheAge} minutes)`)
    return entries
  } catch (error) {
    console.error("Error getting hosts data:", error)
    // 降级处理：如果出错，尝试获取新数据
    try {
      const newEntries = await fetchLatestHostsData()
      await storeData(env, newEntries)
      return newEntries
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError)
      return []
    }
  }
}

// 更新 hosts 数据
export async function updateHostsData(
  env: Bindings,
  newEntries?: HostEntry[]
): Promise<void> {
  try {
    const currentTime = new Date().toISOString()
    const kvData = (await env.custom_hosts.get("domain_data", {
      type: "json",
    })) as KVData | null || { 
      domain_data: {} as DomainDataList, 
      lastUpdated: currentTime,
      updateCount: 0,
      version: "1.0.0"
    }

    if (!newEntries) {
      // 只更新检查时间
      for (const domain in kvData.domain_data) {
        kvData.domain_data[domain] = {
          ...kvData.domain_data[domain],
          lastChecked: currentTime,
        }
      }
    } else {
      // 更新域名数据
      for (const [ip, domain] of newEntries) {
        const oldData = kvData.domain_data[domain]
        const hasChanged = !oldData || oldData.ip !== ip

        kvData.domain_data[domain] = {
          ip,
          lastUpdated: hasChanged ? currentTime : oldData?.lastUpdated || currentTime,
          lastChecked: currentTime,
          responseTime: Date.now() - new Date(currentTime).getTime(),
          provider: 'multiple-dns',
          isOptimized: true,
          resolvedAt: currentTime
        }
      }
    }

    kvData.lastUpdated = currentTime
    kvData.updateCount = (kvData.updateCount || 0) + 1
    await env.custom_hosts.put("domain_data", JSON.stringify(kvData))
    console.log(`Updated ${Object.keys(kvData.domain_data).length} domains in KV`)
  } catch (error) {
    console.error("Error updating hosts data:", error)
  }
}

// 格式化 hosts 文件
export function formatHostsFile(entries: HostEntry[]): string {
  const content = entries
    .map(([ip, domain]) => `${ip.padEnd(30)}${domain}`)
    .join("\n")

  const updateTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  })

  return HOSTS_TEMPLATE.replace("{content}", content).replace(
    "{updateTime}",
    updateTime
  )
}

// 获取单个域名数据
export async function getDomainData(
  env: Bindings,
  domain: string
): Promise<DomainData | null> {
  try {
    const ip = await fetchIPFromMultipleDNS(domain)
    if (!ip) {
      return null
    }

    const currentTime = new Date().toISOString()
    const kvData = (await env.custom_hosts.get("domain_data", {
      type: "json",
    })) as KVData | null || { 
      domain_data: {} as DomainDataList, 
      lastUpdated: currentTime,
      updateCount: 0,
      version: "1.0.0"
    }

    const newData: DomainData = {
      ip,
      lastUpdated: currentTime,
      lastChecked: currentTime,
      responseTime: Date.now() - new Date(currentTime).getTime(),
      provider: 'multiple-dns',
      isOptimized: true,
      resolvedAt: currentTime
    }

    kvData.domain_data[domain] = newData
    kvData.lastUpdated = currentTime
    await env.custom_hosts.put("domain_data", JSON.stringify(kvData))

    return newData
  } catch (error) {
    console.error(`Error getting data for domain ${domain}:`, error)
    return null
  }
}

// 重置 hosts 数据
export async function resetHostsData(env: Bindings): Promise<HostEntry[]> {
  try {
    console.log("Clearing KV data...")
    await env.custom_hosts.delete("domain_data")
    console.log("KV data cleared")

    console.log("Fetching new data...")
    const newEntries = await fetchLatestHostsData()
    console.log("New entries fetched:", newEntries)

    await updateHostsData(env, newEntries)
    console.log("New data stored in KV")

    return newEntries
  } catch (error) {
    console.error("Error resetting hosts data:", error)
    return []
  }
}

// 自定义域名相关功能
export interface CustomDomain {
  domain: string
  ip: string
  addedAt: string
  resolvedAt?: string
  standardIp?: string
  optimizedIp?: string
  resolveMethod?: string
  isActive?: boolean
  isUpdate?: boolean  // 新增：标识是否为更新操作
}

// 添加自定义域名
export async function addCustomDomain(
  env: Bindings,
  domain: string,
  ip?: string
): Promise<CustomDomain | null> {
  try {
    console.log(`Adding custom domain: ${domain}`)
    
    let resolvedIp = ip
    let standardIp: string | undefined
    let optimizedIp: string | undefined
    let resolveMethod = 'manual'
    
    if (!ip) {
      // 如果没有提供 IP，尝试解析
      const resolvedResult = await fetchIPFromMultipleDNS(domain)
      if (!resolvedResult) {
        console.error(`Failed to resolve domain: ${domain}`)
        return null
      }
      resolvedIp = resolvedResult
      standardIp = resolvedResult
      optimizedIp = resolvedResult
      resolveMethod = 'dns'
    } else {
      // 如果提供了 IP，也尝试获取标准解析作为对比
      standardIp = await fetchIPFromMultipleDNS(domain) || undefined
      optimizedIp = ip
      resolveMethod = 'manual'
    }

    const customDomain: CustomDomain = {
      domain,
      ip: resolvedIp!,
      addedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
      standardIp,
      optimizedIp,
      resolveMethod,
      isActive: true
    }

    // 获取现有的自定义域名列表
    const existing = await env.custom_hosts.get("custom_domains", { type: "json" }) as CustomDomain[] || []
    
    // 检查是否已存在
    const existingIndex = existing.findIndex(cd => cd.domain === domain)
    let isUpdate = false
    
    if (existingIndex >= 0) {
      existing[existingIndex] = customDomain
      isUpdate = true
      console.log(`Updated existing custom domain: ${domain}`)
    } else {
      existing.push(customDomain)
      console.log(`Added new custom domain: ${domain}`)
    }

    await env.custom_hosts.put("custom_domains", JSON.stringify(existing))
    
    console.log(`Custom domain ${domain} -> ${resolvedIp} saved successfully`)
    // 返回结果，包含是否为更新操作的信息
    return {
      ...customDomain,
      isUpdate
    }
  } catch (error) {
    console.error(`Error adding custom domain ${domain}:`, error)
    return null
  }
}

// 获取自定义域名列表
export async function getCustomDomains(env: Bindings): Promise<CustomDomain[]> {
  try {
    return await migrateCustomDomainsData(env)
  } catch (error) {
    console.error("Error getting custom domains:", error)
    return []
  }
}

// 删除自定义域名
export async function removeCustomDomain(env: Bindings, domain: string): Promise<boolean> {
  try {
    const existing = await env.custom_hosts.get("custom_domains", { type: "json" }) as CustomDomain[] || []
    const filtered = existing.filter(cd => cd.domain !== domain)
    
    if (filtered.length < existing.length) {
      await env.custom_hosts.put("custom_domains", JSON.stringify(filtered))
      console.log(`Removed custom domain: ${domain}`)
      return true
    }
    
    console.log(`Custom domain not found: ${domain}`)
    return false
  } catch (error) {
    console.error(`Error removing custom domain ${domain}:`, error)
    return false
  }
}

// 获取包含自定义域名的完整数据
export async function fetchCustomDomainsData(env: Bindings): Promise<HostEntry[]> {
  try {
    const customDomains = await getCustomDomains(env)
    console.log(`Raw custom domains from storage: ${customDomains?.length || 0}`)
    
    const customEntries: HostEntry[] = customDomains
      .filter(cd => cd.isActive !== false)
      .map(cd => {
        console.log(`Processing custom domain: ${cd.domain} -> ${cd.ip} (active: ${cd.isActive !== false})`)
        return [cd.ip, cd.domain]
      })
    
    console.log(`Found ${customEntries.length} active custom domains`)
    return customEntries
  } catch (error) {
    console.error("Error fetching custom domains data:", error)
    return []
  }
}

// 获取包含自定义域名的完整 hosts 数据 - 优化缓存策略
export async function getCompleteHostsData(env: Bindings, forceRefresh: boolean = false): Promise<HostEntry[]> {
  try {
    console.log(`Fetching complete hosts data (GitHub + Custom)${forceRefresh ? ' with force refresh' : ''}`)
    
    // 获取 GitHub 域名数据，传递 forceRefresh 参数
    const githubEntries = await getHostsData(env, forceRefresh)
    console.log(`GitHub entries: ${githubEntries.length}`)
    
    // 获取自定义域名数据（自定义域名通常数量少，可以每次获取）
    const customEntries = await fetchCustomDomainsData(env)
    console.log(`Custom entries: ${customEntries.length}`)
    if (customEntries.length > 0) {
      console.log('Custom domains sample:', customEntries.slice(0, 3).map(([ip, domain]) => `${domain} -> ${ip}`))
    }
    
    // 合并数据，避免重复域名（自定义域名优先）
    const domainMap = new Map<string, string>()
    
    // 先添加 GitHub 域名
    for (const [ip, domain] of githubEntries) {
      domainMap.set(domain, ip)
    }
    
    // 自定义域名覆盖同名的 GitHub 域名
    for (const [ip, domain] of customEntries) {
      domainMap.set(domain, ip)
      console.log(`Added custom domain to map: ${domain} -> ${ip}`)
    }
    
    const allEntries: HostEntry[] = Array.from(domainMap.entries()).map(([domain, ip]) => [ip, domain])
    console.log(`Total entries after deduplication: ${allEntries.length}`)
    
    return allEntries
  } catch (error) {
    console.error("Error getting complete hosts data:", error)
    return await getHostsData(env, forceRefresh) // 降级到只返回 GitHub 数据
  }
}

// 数据迁移：将旧格式转换为新格式
async function migrateCustomDomainsData(env: Bindings): Promise<CustomDomain[]> {
  try {
    // 尝试获取新格式数据
    const newData = await env.custom_hosts.get("custom_domains", { type: "json" }) as CustomDomain[]
    if (newData && Array.isArray(newData) && newData.length > 0) {
      console.log(`Found new format data with ${newData.length} domains`)
      return newData
    }

    // 尝试获取旧格式数据
    const oldData = await env.custom_hosts.get("custom_domains", { type: "json" }) as Record<string, any>
    if (!oldData || typeof oldData !== 'object') {
      console.log("No custom domains data found")
      return []
    }

    // 检查是否是旧格式（对象）
    if (!Array.isArray(oldData)) {
      console.log("Found old format data, migrating...")
      const migratedData: CustomDomain[] = Object.values(oldData).map((item: any) => ({
        domain: item.domain || '',
        ip: item.ip || '',
        addedAt: item.addedAt || new Date().toISOString(),
        resolvedAt: item.addedAt || new Date().toISOString(),
        standardIp: item.ip,
        optimizedIp: item.ip,
        resolveMethod: 'migrated',
        isActive: true
      }))

      // 保存新格式数据
      await env.custom_hosts.put("custom_domains", JSON.stringify(migratedData))
      console.log(`Migrated ${migratedData.length} domains to new format`)
      return migratedData
    }

    return oldData as CustomDomain[]
  } catch (error) {
    console.error("Error migrating custom domains data:", error)
    return []
  }
}
