# Review Exporter 使用说明

Review Exporter 是一个 Chrome Manifest V3 扩展，用来抓取商品评论、YouTube 视频评论、TikTok 视频评论和 Facebook 帖子评论，并导出 JSON / CSV。

## 一、安装

### 开发者模式加载

1. 打开 Chrome 或 Edge。
2. 访问 `chrome://extensions/`。
3. 打开右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择构建后的 `dist/` 目录，目录内需要包含 `manifest.json`。

### 使用 ZIP 发布包

1. 解压 `review-exporter.zip`。
2. 在 `chrome://extensions/` 里加载解压后的目录。

Chrome MV3 不能直接拖入 zip 安装，必须先解压。

## 二、支持平台

| 平台 | 页面格式 |
| --- | --- |
| Shopee TH | `https://shopee.co.th/...-i.{shopid}.{itemid}` |
| Lazada TH | `https://www.lazada.co.th/products/pdp-i{itemId}-s{shopId}.html` |
| TikTok Shop TH | `https://www.tiktok.com/shop/th/pdp/{productId}` |
| YouTube | `https://www.youtube.com/watch?v={videoId}` |
| TikTok Video | `https://www.tiktok.com/@{username}/video/{videoId}` |
| Facebook Post | `https://www.facebook.com/{page}/posts/{postId}` |

## 三、商品评论抓取

1. 打开支持的商品详情页。
2. 点击扩展图标。
3. 按需选择翻页方式和请求速度。
4. 点击“开始抓取”。
5. 完成后点击“导出 JSON”或“导出 CSV”。

翻页方式：

- 自动翻页：点击页面里的下一页按钮，兼容性最好。
- 直接接口：直接请求评论接口，速度更快，但需要当前浏览器会话有效。Lazada 更容易触发风控，建议慢速。

## 四、YouTube 评论抓取

1. 打开 YouTube 视频页。
2. 点击扩展图标。
3. 在“抓取设置”里选择排序：热门 + 最新、热门或最新。
4. 选择是否抓取回复。
5. 设置最大评论数。默认 `500`，填 `0` 表示不限。
6. 点击“开始抓取”。

YouTube 导出的每条记录会包含：

- `sort_mode`：热门或最新
- `is_reply`：是否为回复
- `parent_cmtid`：回复所属主评论 ID
- `author_channel_url`：作者频道链接
- `video_id` / `video_title`
- `published_time_text`：页面显示的发布时间文本

## 五、TikTok 视频评论抓取

1. 打开 TikTok 视频页，例如 `https://www.tiktok.com/@{username}/video/{videoId}`。
2. 点击扩展图标。
3. 设置最大评论数。填 `0` 表示不限。
4. 点击“开始抓取”。

TikTok 视频抓取说明：

- 只抓取一级评论，不抓取回复。
- 不需要登录状态。
- 优先使用 TikTok 公开评论接口，接口不可用时再尝试页面数据。
- 导出字段使用默认评论 schema，并额外保留 `video_id` / `video_title` 等视频字段。

## 六、导出字段

## 六、Facebook 帖子评论抓取

1. 打开 Facebook 帖子页。
2. 如果页面要求登录，先在浏览器里登录并确认评论区域可见。
3. 点击扩展图标。
4. 点击“开始抓取”。

Facebook 抓取说明：

- 使用当前页面 DOM 滚动和“查看更多评论”按钮采集。
- 后台无浏览器登录态时只能抓公开可见评论。
- Facebook 页面结构变化较频繁，如果抓取为 0，先确认帖子评论在页面上真实可见。

## 七、导出字段

CSV 使用统一字段，电商评论、YouTube 评论、TikTok 视频评论和 Facebook 帖子评论共用同一套 schema。主要字段包括：

| 字段 | 说明 |
| --- | --- |
| `platform` | 平台 ID |
| `shopid` | 店铺 ID、频道链接或作者标识 |
| `itemid` | 商品 ID 或视频 ID |
| `cmtid` | 评论 ID |
| `author_username` | 评论作者 |
| `rating` / `rating_star` | 商品评分，视频评论为空 |
| `comment` | 评论正文 |
| `like_count` | 点赞数 |
| `submit_time` | 提交时间或页面展示时间 |
| `review_type` | 评论类型，视频主评论为 `comment` |
| `sort_mode` | YouTube 排序模式 |
| `parent_cmtid` | YouTube 回复所属主评论，TikTok 视频为空 |
| `original_url` | 原始页面 URL |

## 八、常见问题

### Lazada 报 RGV587 怎么办？

这是 Lazada 风控。可以切回自动翻页、降低速度，或在页面上手动完成验证后再重试。

### YouTube 抓不到第一页怎么办？

刷新视频页后再打开扩展。扩展会在页面开始加载时注入桥接脚本，用来捕获最早的评论接口响应。

### TikTok 视频抓不到怎么办？

先确认链接是 `https://www.tiktok.com/@{username}/video/{videoId}` 格式。若接口暂时返回空数据，可以刷新视频页后重试。

### Facebook 帖子抓不到怎么办？

先确认当前浏览器里能看到该帖子的评论区，再点击“查看更多评论”后重试。私密帖、未登录可见性受限的帖子，后台 crawler 可能无法抓取。

### 抓取中途停止会丢数据吗？

不会。已抓到的数据保留在当前页面的扩展状态里，可以直接导出，也可以继续点击“开始抓取”。

### 数据会上传到服务器吗？

不会。扩展只在本地浏览器中读取页面接口响应，导出文件也保存在本机。

## 九、构建

```bash
npm install
npm run build
npm run build:zip
```

`npm run build` 输出到 `dist/`，`npm run build:zip` 生成 `review-exporter.zip`。
