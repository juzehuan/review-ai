# Review Exporter

Chrome Manifest V3 浏览器扩展：从电商商品详情页抓取商品评论，也可以从 YouTube / TikTok 视频页和 Facebook 帖子页抓取评论，支持导出 JSON / CSV。

支持平台：

- Shopee TH
- Lazada TH
- TikTok Shop TH
- YouTube 视频评论
- TikTok 视频评论
- Facebook 帖子评论

## 安装与使用

1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”，选择本项目的 `dist/` 目录
4. 打开支持的平台页面
5. 点击扩展图标，选择抓取设置，然后点击“开始抓取”
6. 完成后导出 JSON 或 CSV

YouTube 支持：

- 评论范围：只抓主评论，或主评论 + 回复
- 排序：热门、最新、热门 + 最新
- 最大评论数：默认 500，填 `0` 表示不限

TikTok 视频支持：

- 页面格式：`https://www.tiktok.com/@{username}/video/{videoId}`
- 只抓取一级评论，不抓取回复
- 无需登录，优先使用公开评论接口
- 最大评论数填 `0` 表示不限，直到没有更多评论或任务超时

Facebook 帖子支持：

- 页面格式：`https://www.facebook.com/{page}/posts/{postId}`、`/story.php?story_fbid=...`、小组帖子等常见帖子链接
- 通过当前浏览器页面滚动和“查看更多评论”按钮采集可见评论
- 私密帖子、登录墙或权限不足时，需要先在浏览器里打开并确认页面可见

## 构建发布包

```bash
npm install
npm run build
npm run build:zip
```

`npm run build` 会输出到 `dist/`，`npm run build:zip` 会额外生成 `review-exporter.zip`。

## 架构

```text
adapters/
  platform.js          registry + BasePlatformAdapter
  _utils.js            MD5 + cookie helpers
  shopee-th.js         Shopee TH adapter
  lazada-th.js         Lazada TH adapter
  tiktok-th.js         TikTok Shop TH adapter
  youtube-video.js     YouTube video comment adapter
  tiktok-video.js      TikTok video comment adapter
  facebook-post.js     Facebook post comment adapter
content.js             平台无关状态机和导出逻辑
page-bridge.js         拦截 fetch/XHR 并转发接口响应
popup.{html,js,css}    扩展弹窗
background.js          下载文件 service worker
```

新增平台时：

1. 在 `adapters/` 新增 adapter，并继承 `BasePlatformAdapter`
2. 在 `manifest.json` 增加 host permissions 和 content script matches
3. 在 `page-bridge.js` 增加对应评论接口 URL pattern
4. 在 `popup.js/css` 增加平台徽标和平台专属设置

## License

MIT
