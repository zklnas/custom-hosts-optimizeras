<div align="center">
  <img src="public/logo.svg" width="140" height="140" alt="优选自定义host logo">
  <h1>优选自定义host</h1>
  <p>自定义域名访问加速，智能 IP 优选解决访问慢的问题。基于 Cloudflare Workers 部署。</p>

  <p>
    <a href="#项目声明">项目声明</a> •
    <a href="#快速开始">快速开始</a> •
    <a href="#特性">特性</a> •
    <a href="#使用方法">使用方法</a> •
    <a href="#自定义域名">自定义域名</a> •
    <a href="#部署指南">部署指南</a> •
    <a href="#故障排除">故障排除</a>
  </p>
</div>

## 项目声明

本项目基于以下开源项目进行AI智能魔改优化：

- 🔗 **[GitHub520](https://github.com/521xueweihan/GitHub520)** - GitHub访问加速项目
- 🔗 **[github-hosts](https://github.com/TinsFox/github-hosts)** - GitHub hosts文件生成工具

### ✨ AI魔改特色

- 🤖 **AI驱动优化**：运用人工智能技术进行代码重构和功能增强
- 🚀 **架构升级**：从传统脚本升级为现代化 Cloudflare Workers 架构
- 🎯 **智能IP优选**：AI算法优化的IP选择策略，提升访问速度
- 🔧 **自动化部署**：完整的CI/CD流程，支持一键部署
- 🌐 **Web管理界面**：现代化的可视化管理后台
- 📡 **RESTful API**：完整的API接口，支持程序化管理

> 感谢原项目作者的贡献，本项目在其基础上通过AI技术进行了全面优化和功能扩展。

## 特性

### 🚀 核心功能
- **智能IP优选**：AI算法自动检测最佳响应时间，选择最快IP
- **全球CDN加速**：基于 Cloudflare Workers 部署，享受全球边缘网络
- **自动更新机制**：每小时自动更新DNS记录，保持最新状态
- **自定义域名**：支持添加和管理任意域名的IP优选

### 🛠️ 技术特性
- **多DNS支持**：集成 Cloudflare DNS、Google DNS 等多个解析服务
- **KV存储**：使用 Cloudflare KV 进行数据持久化存储
- **RESTful API**：完整的API接口，支持程序化管理
- **Web管理界面**：现代化的可视化管理后台

### 🔧 部署特性
- **一键部署**：支持 Cloudflare Workers 一键部署
- **GitHub Actions**：完整的CI/CD自动化部署流程
- **安全控制**：简化的权限控制系统，保护管理接口

## 快速开始

### 🚀 一键部署（推荐）

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Yan-nian/custom-host)

1. 点击上方按钮
2. 授权 GitHub 访问
3. 选择 Cloudflare 账户
4. 等待自动部署完成

### 🔄 GitHub Actions 自动部署

Fork 仓库后享受自动化部署，只需简单配置：

#### 1️⃣ Fork 仓库
点击仓库右上角的 "Fork" 按钮

#### 2️⃣ 获取 Cloudflare 凭据
- 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
- 获取 **Global API Key** 和 **账户邮箱**
- 创建 **KV 命名空间**（名称：`custom-hosts`）

#### 3️⃣ 配置 GitHub Secrets
在 Fork 的仓库中设置以下 Secrets：

| Secret 名称 | 说明 |
|------------|------|
| `CLOUDFLARE_EMAIL` | Cloudflare 账户邮箱 |
| `CLOUDFLARE_API_KEY` | Global API Key |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| `KV_NAMESPACE_ID` | KV 命名空间 ID |

#### 4️⃣ 触发部署
推送任何更改即可自动部署：
```bash
git commit --allow-empty -m "触发自动部署"
git push origin main
```

> 💡 **详细配置指南**：如需详细的配置步骤，请查看 [部署指南](#部署指南) 章节

### 🛠️ 手动部署

如果需要自定义配置或本地开发：

```bash
# 克隆仓库
git clone https://github.com/Yan-nian/custom-host.git
cd custom-host

# 安装依赖
pnpm install

# 登录 Cloudflare
npx wrangler login

# 部署到 Cloudflare Workers
pnpm run deploy
```

## 使用方法

### 🌐 Web 界面访问

部署成功后，访问您的 Worker URL：
```
https://your-worker-name.your-account.workers.dev
```

**主要功能：**
- 📄 查看和下载 hosts 文件
- 🎯 自定义域名管理
- 📊 统计仪表板
- 📖 API 文档

### 📋 SwitchHosts 集成

1. 下载 [SwitchHosts](https://github.com/oldj/SwitchHosts)
2. 添加远程规则：
   - **方案名**：Custom Hosts
   - **类型**：远程
   - **URL**：`https://your-worker-url.workers.dev/hosts`
   - **自动更新**：1 小时

### 🔗 直接使用 hosts 文件

```bash
# 下载 hosts 文件
curl https://your-worker-url.workers.dev/hosts > hosts

# 在 Linux/macOS 中应用
sudo cp hosts /etc/hosts

# 在 Windows 中应用（管理员权限）
copy hosts C:\Windows\System32\drivers\etc\hosts
```

## 自定义域名管理

### 🛠️ Web 管理后台

访问管理后台进行可视化操作：
```
https://your-worker-url.workers.dev/admin-x7k9m3q2
```

**主要功能：**
- 📊 **统计仪表板** - 查看域名数量和优选状态
- ➕ **添加域名** - 支持批量添加自定义域名
- ⚡ **一键优选** - 自动为域名选择最优IP
- 🗑️ **管理操作** - 删除、清空等管理功能

### 🚀 API 接口

使用 RESTful API 进行程序化管理：

```bash
# 设置 API Key（默认：admin-x7k9m3q2）
API_KEY="admin-x7k9m3q2"
BASE_URL="https://your-worker-url.workers.dev"

# 添加自定义域名
curl -X POST "$BASE_URL/api/custom-domains?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com", "description": "示例域名"}'

# 优选域名IP
curl -X POST "$BASE_URL/api/optimize/example.com?key=$API_KEY"

# 获取优选后的hosts文件
curl "$BASE_URL/hosts?optimize=true&custom=true"

# 查看所有自定义域名
curl "$BASE_URL/api/custom-domains?key=$API_KEY"
```

## 💡 应用场景

### 🏢 企业内网优化
为企业内部服务域名选择最优IP，提升内网访问速度：
```bash
# 添加企业内部域名
curl -X POST "$BASE_URL/api/custom-domains?key=$API_KEY" \
  -d '{"domain": "internal.company.com", "description": "企业内部服务"}'
```

### 🌐 CDN节点优选
为CDN域名选择最快的边缘节点，优化内容分发：
```bash
# 优选CDN域名
curl -X POST "$BASE_URL/api/optimize/cdn.example.com?key=$API_KEY"
```

### 🎮 游戏加速
为游戏服务器域名选择低延迟IP，提升游戏体验：
```bash
# 添加游戏服务器域名
curl -X POST "$BASE_URL/api/custom-domains?key=$API_KEY" \
  -d '{"domain": "game.server.com", "description": "游戏服务器"}'
```

### 🔧 开发环境
为开发和测试环境选择稳定的IP连接：
```bash
# 批量添加开发域名
for domain in api.dev.com cdn.dev.com; do
  curl -X POST "$BASE_URL/api/custom-domains?key=$API_KEY" \
    -d "{\"domain\": \"$domain\", \"description\": \"开发环境\"}"
done
```

## 部署指南

### 🔐 自定义管理后台地址（推荐）

默认管理后台：`/admin-x7k9m3q2`，**强烈建议修改为自定义路径**

**安全格式要求：**
- `admin-[8-16位字母数字]` （如：`admin-abc12345`）
- `[3-8位字母]-admin-[6-12位字母数字]` （如：`my-admin-secret123`）
- `secure-[8-16位字母数字]` （如：`secure-xyz98765`）
- `mgmt-[8-16位字母数字]` （如：`mgmt-manager001`）

**修改步骤：**
1. Fork 仓库
2. 编辑 `src/index.ts`，搜索并替换 `admin-x7k9m3q2`
3. 同时修改 `adminPathAsApiKey` 变量
4. 提交并推送代码触发自动部署

### ⚙️ 详细配置指南

<details>
<summary>点击展开详细的 GitHub Actions 配置步骤</summary>

#### 获取 Cloudflare API 凭据

**方式一：Global API Key（推荐）**
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 头像 → "My Profile" → "API Tokens"
3. "Global API Key" → "View" → 输入密码
4. 复制 API Key 和账户邮箱

**方式二：API Token（高级）**
1. "API Tokens" → "Create Token"
2. 使用 "Edit Cloudflare Workers" 模板
3. 权限：`Account:Cloudflare Workers:Edit`, `Zone:Zone Settings:Read`, `Zone:Zone:Read`
4. 复制生成的 Token

#### 创建 KV 命名空间
1. Cloudflare Dashboard → "Workers & Pages" → "KV"
2. "Create a namespace" → 命名为 `custom-hosts`
3. 复制命名空间 ID

#### 配置 GitHub Secrets
在 Fork 的仓库中添加以下 Secrets：

**Global API Key 方式：**
- `CLOUDFLARE_EMAIL`: Cloudflare 账户邮箱
- `CLOUDFLARE_API_KEY`: Global API Key
- `CLOUDFLARE_ACCOUNT_ID`: 账户 ID
- `KV_NAMESPACE_ID`: KV 命名空间 ID

**API Token 方式：**
- `CLOUDFLARE_API_TOKEN`: API Token
- `CLOUDFLARE_ACCOUNT_ID`: 账户 ID
- `KV_NAMESPACE_ID`: KV 命名空间 ID

</details>

## 📊 技术特性

### 🧠 智能算法
- **并发IP测试**：同时测试多个IP地址，选择响应最快的
- **智能缓存策略**：GitHub域名缓存1小时，自定义域名长期缓存
- **自动更新机制**：每小时自动更新DNS记录，保持最新状态

### 🔒 安全特性
- **权限控制**：管理后台地址即API Key，简化配置
- **路径验证**：严格的管理后台路径格式验证
- **环境隔离**：支持开发和生产环境分离

### ⚡ 性能优化
- **全球CDN**：基于Cloudflare Workers的全球边缘计算
- **KV存储**：高性能的键值存储，支持全球同步
- **并发处理**：支持高并发的IP优选请求

## 🔧 故障排除

### 🚨 常见问题

#### 部署认证失败
**问题**：GitHub Actions 提示 "Unable to authenticate request"
**解决**：
- 检查 GitHub Secrets 是否正确配置
- 确认 API Key 没有多余空格
- 验证 Cloudflare 账户权限

#### KV 命名空间错误
**问题**：提示 "KV namespace not found"
**解决**：
- 确认已创建 KV 命名空间
- 检查 `KV_NAMESPACE_ID` Secret 配置
- 验证命名空间 ID 是否正确

#### API 调用 403 错误
**问题**：API 调用返回权限错误
**解决**：
- 使用正确的 API Key（默认：`admin-x7k9m3q2`）
- 检查管理后台路径是否正确
- 确认 API Key 格式符合要求

#### 自定义域名无法添加
**问题**：域名添加失败
**解决**：
- 确保域名格式正确（如：`example.com`）
- 检查网络连接状态
- 验证域名是否可解析

### 🔍 调试方法

```bash
# 检查 wrangler 版本
npx wrangler --version

# 测试认证状态
npx wrangler whoami

# 查看实时日志
npx wrangler tail

# 本地开发调试
npx wrangler dev
```

### 📞 获取帮助

- 📖 查看 [Issues](https://github.com/Yan-nian/custom-host/issues)
- 🐛 报告问题或建议
- 💬 参与社区讨论

## 🤝 贡献指南

欢迎贡献代码和提出建议！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📄 开源许可

本项目采用 [MIT 许可证](LICENSE) 开源。

---

<div align="center">
  <p>⭐ 如果这个项目对您有帮助，请给个 Star 支持一下！</p>
  <p>🔧 基于 AI 技术优化，持续改进中...</p>
</div>
