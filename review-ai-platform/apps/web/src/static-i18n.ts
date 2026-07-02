import { watch } from "vue";
import { currentLocale, type AppLocale } from "@/i18n";

const staticText: Record<Exclude<AppLocale, "zh-CN">, Record<string, string>> = {
  "en-US": {
    "刷新": "Refresh",
    "自动刷新": "Auto refresh",
    "手动刷新": "Manual refresh",
    "保存": "Save",
    "取消": "Cancel",
    "删除": "Delete",
    "删除中": "Deleting",
    "复制": "Copy",
    "打开": "Open",
    "打开采集": "Open crawl",
    "更多": "More",
    "返回": "Back",
    "返回报告": "Back to report",
    "查看全部": "View all",
    "查看分析": "View analysis",
    "分析报告": "Analysis report",
    "评论列表": "Comment list",
    "分析日志": "Analysis logs",
    "追加评论": "Append comments",
    "开始分析": "Start analysis",
    "新建分析": "New analysis",
    "新建分析项目": "New analysis project",
    "新建行动项": "New action item",
    "新建账号": "New account",
    "新建空间": "New workspace",
    "新建监听": "New monitor",
    "一次采集": "One-time crawl",
    "立即运行": "Run now",
    "停止": "Stop",
    "停止当前任务": "Stop current task",
    "停止采集": "Stop crawl",
    "停止分析": "Stop analysis",
    "重试": "Retry",
    "重试当前批次": "Retry current run",
    "重新采集": "Crawl again",
    "重新分析": "Analyze again",
    "下载浏览器插件": "Download browser extension",
    "下载操作手册": "Download manual",
    "任务": "Task",
    "任务名称": "Task name",
    "任务看板": "Task board",
    "任务总数": "Total tasks",
    "来源": "Source",
    "来源渠道": "Source channel",
    "类型": "Type",
    "分析类型": "Analysis type",
    "导入状态": "Import status",
    "分析状态": "Analysis status",
    "创建时间": "Created at",
    "加入时间": "Joined at",
    "开始/结束": "Start / End",
    "操作": "Actions",
    "状态": "Status",
    "时间": "Time",
    "错误": "Error",
    "进度": "Progress",
    "模型": "Model",
    "服务商": "Provider",
    "速度": "Speed",
    "AI 标签": "AI tags",
    "日志": "Logs",
    "实时日志": "Live logs",
    "警告": "Warnings",
    "全部": "All",
    "评论": "Comments",
    "分析": "Analyses",
    "无": "None",
    "未知": "Unknown",
    "未选择任务": "No task selected",
    "未设截止": "No due date",
    "暂无说明": "No description",
    "暂无行动项": "No action items",
    "管理空间内所有任务，进入评论列表、分析报告，并查看实时分析日志。": "Manage all tasks in the workspace, open comment lists and analysis reports, and inspect live analysis logs.",
    "暂无日志，等待 worker 写入": "No logs yet. Waiting for the worker",
    "当前筛选下暂无日志": "No logs under the current filter",
    "该任务暂无分析批次": "No analysis runs for this task",
    "请选择上方任务查看分析批次": "Select a task above to view runs",
    "选择任务后查看批次": "Select a task to view runs",
    "选择任务后查看日志": "Select a task to view logs",
    "AI 分析运行观察": "AI analysis runtime watch",
    "疑似无日志": "Likely no logs",
    "活跃分析量": "Active analysis volume",
    "失败占比": "Failure rate",
    "最近日志": "Latest log",
    "暂无运行批次": "No running runs",
    "没有排队或分析批次": "No queued or analyzing runs",
    "暂无运行中的分析批次": "No running analysis runs",
    "暂无分析批次": "No analysis runs",
    "运行批次正常写入日志": "Running runs are writing logs normally",
    "最长无日志": "Longest without logs",
    "任务仍在排队": "Task is still queued",
    "如果长时间只有 queued 记录，且没有 Worker picked up analysis run，通常说明 worker 没有运行、Redis 队列未连通，或 worker 还没有消费到该任务。": "If only queued logs appear for a long time and there is no Worker picked up analysis run log, the worker is usually offline, Redis is not connected, or the worker has not consumed this task yet.",
    "所属用户/空间": "Owner / workspace",
    "未设置负责人": "Owner not set",
    "推文评论": "Post comments",
    "尚未分析": "Not analyzed yet",
    "删除分析任务": "Delete analysis task",
    "评论、分析结果、报告分享和行动项都会被删除。": "Comments, analysis results, report shares, and action items will all be deleted.",
    "分析任务已删除": "Analysis task deleted",
    "分析任务已加入队列": "Analysis task added to the queue",
    "已发送停止请求": "Stop request sent",
    "请选择一个分析任务查看行动项": "Select an analysis task to view action items",
    "帮助中心": "Help center",
    "真实使用中常见的问题、处理建议和排错口径。适合用户自查，也适合管理员统一回复。": "Common real-world questions, handling advice, and troubleshooting wording for user self-checks and admin replies.",
    "使用前先确认": "Check before use",
    "链接公开可访问，分析类型一定选对，报告结论回到评论原文抽查验证。": "Confirm the link is public, choose the right analysis type, and verify report conclusions against original comments.",
    "大多数用户问题都可以先按这三步判断：链接是否可采、任务类型是否匹配、AI 结论是否有原始评论证据。": "Most user issues can be checked in three steps: whether the link can be collected, whether the task type matches, and whether AI conclusions have original comment evidence.",
    "用户可能会问到的问题": "Questions users may ask",
    "搜索问题或答案": "Search questions or answers",
    "没有匹配的问题，换个关键词试试。": "No matching questions. Try another keyword.",
    "账号权限": "Account permissions",
    "普通用户为什么看不到模型设置、抓取设置？": "Why can't regular users see model or crawler settings?",
    "这是正常的。普通用户只负责采集、分析、查看报告和复核评论；模型、提示词、抓取参数由超管统一配置，避免不同用户配置不一致导致结果混乱。": "This is expected. Regular users handle collection, analysis, reports, and comment review; admins manage models, prompts, and crawler parameters to avoid inconsistent results.",
    "我能不能自己改 AI 分析规则？": "Can I change the AI analysis rules myself?",
    "普通用户不能直接修改。如果发现分析结果明显不符合业务，比如视频评论被当成商品评论分析，需要把任务名称、链接和截图反馈给管理员，由管理员统一调整提示词或模型配置。": "Regular users cannot edit them directly. If results are clearly off, such as video comments being analyzed as product reviews, send the task name, link, and screenshots to an admin so prompts or model settings can be adjusted centrally.",
    "首页的评论额度和分析次数是什么意思？": "What do comment quota and analysis runs on the home page mean?",
    "评论额度表示当前周期内可以采集或处理的评论数量，分析次数表示可以发起 AI 分析的次数。额度不足时需要联系管理员调整。": "Comment quota is the number of comments that can be collected or processed in the current period. Analysis runs are how many AI analyses can be started. Contact an admin if quota is insufficient.",
    "我看到的数据是不是所有人的数据？": "Am I seeing everyone's data?",
    "通常只看到当前账号或当前工作区的数据。不同工作区之间的数据会隔离，具体范围由管理员配置。": "Usually you only see data for your account or current workspace. Workspaces are isolated, and admins configure the exact scope.",
    "一次性采集和持续监听有什么区别？": "What is the difference between one-time collection and continuous monitoring?",
    "一次性采集适合临时分析某条视频或链接；持续监听适合长期跟踪同一条视频的新评论，比如新品发布、投放视频、舆情内容。": "One-time collection is for temporary analysis of a video or link. Continuous monitoring is for long-term tracking of new comments on the same video, such as launches, ads, or public-opinion content.",
    "最多采集条数填多少合适？": "What max collection count should I enter?",
    "首次使用或不确定链接质量时，建议先填 100 到 300 条，确认链接、来源渠道和分析类型都没问题后再加大。填 0 通常表示不限制，但实际数量仍受平台加载、网络、超时和抓取策略影响。": "For first use or uncertain links, start with 100 to 300 comments. Increase after confirming the link, source channel, and analysis type are correct. 0 usually means unlimited, but actual volume still depends on platform loading, network, timeout, and crawler strategy.",
    "为什么视频明明有很多评论，只采集到一部分？": "Why were only some comments collected when the video has many?",
    "常见原因是平台分页加载、评论排序、网络超时、评论需要登录、单次采集上限过低，或者平台限制。可以提高采集条数、重试，或用持续监听分批采集。": "Common causes include platform pagination, comment sorting, network timeout, login-required comments, a low per-run limit, or platform restrictions. Increase the count, retry, or use monitoring to collect in batches.",
    "提示“未采集到评论”怎么办？": "What should I do if it says no comments were collected?",
    "先用浏览器打开链接，确认评论区公开可见、链接没有填错、来源渠道选择正确。如果页面能看到评论但系统仍采不到，再让管理员看抓取日志和服务器网络。": "Open the link in a browser first. Confirm comments are public, the link is correct, and the source channel is right. If comments are visible but still not collected, ask an admin to check crawler logs and server network.",
    "采集任务一直排队怎么办？": "What if a collection task stays queued?",
    "可能是前面还有任务、Worker 没启动、服务器繁忙或抓取服务异常。普通用户先不要重复创建太多任务，超过几分钟没变化就联系管理员。": "There may be earlier tasks, an offline worker, a busy server, or a crawler service issue. Avoid creating many duplicate tasks; contact an admin if nothing changes after a few minutes.",
    "采集失败后应该重试还是删除？": "Should I retry or delete after collection fails?",
    "网络波动、临时超时、平台加载失败适合重试；链接填错、任务建错、内容不再需要适合删除。删除前要看确认弹窗，确认任务名称和影响范围。": "Retry for network fluctuation, temporary timeout, or platform loading failure. Delete when the link or task is wrong, or the content is no longer needed. Read the confirmation dialog before deleting.",
    "持续监听": "Continuous monitoring",
    "监听任务创建后切换页面再回来还在吗？": "Will a monitor still be there after switching pages?",
    "应该还在。监听任务是保存到系统里的，不应该因为切换页面消失。如果刷新后仍看不到，要联系管理员检查接口或数据库记录。": "It should still be there. Monitors are saved in the system and should not disappear after page changes. If it is still missing after refresh, ask an admin to check the API or database record.",
    "监听任务会不会自动分析？": "Will monitor tasks analyze automatically?",
    "看创建时是否开启“自动分析”。开启后每次采集完成会自动进入分析流程；关闭时需要人工确认评论数量后再手动分析。": "It depends on whether Auto analysis was enabled. If enabled, each completed collection enters analysis automatically; otherwise you manually start analysis after checking comment volume.",
    "监听频率怎么设置比较合适？": "How should I set monitor frequency?",
    "热点内容可以更频繁，比如每 1 到 6 小时；普通内容可以每天或每几天一次。频率太高会消耗额度，也可能增加平台访问压力。": "Hot topics can run more often, such as every 1 to 6 hours. Normal content can run daily or every few days. Too much frequency consumes quota and may increase platform pressure.",
    "删除监听任务会删除历史分析吗？": "Does deleting a monitor delete historical analyses?",
    "通常删除的是监听配置，不一定删除历史采集记录和分析任务。实际以删除确认弹窗提示为准。": "Usually it deletes the monitor configuration, not necessarily historical collection records or analysis tasks. Follow the confirmation dialog for the actual impact.",
    "为什么 AI 分析比较慢？": "Why is AI analysis slow?",
    "评论越多，分析越耗时。几千到几万条评论会受模型服务、并发额度、网络和服务器性能影响。建议先小样本验证，再分批处理大任务。": "More comments take longer. Thousands or tens of thousands of comments are affected by model service, concurrency quota, network, and server performance. Validate with a small sample, then process large tasks in batches.",
    "评论很多时怎么提高效率？": "How can I improve efficiency when there are many comments?",
    "先采集一小批看方向是否正确，再扩大数量；大任务尽量分批，不要重复创建多个相同分析；持续监听适合长期增量采集。": "Collect a small batch first to confirm direction, then increase volume. Split large tasks where possible, avoid duplicate analyses, and use monitoring for long-term incremental collection.",
    "为什么 YouTube 视频评论分析结果像商品评论？": "Why do YouTube video comments look like product-review analysis?",
    "通常是分析类型选错，或者提示词配置偏商品评论。视频类评论要选择“视频类评论”，重点看观点、态度、争议点、内容反馈和传播效果，不是物流、包装、售后这些电商维度。": "Usually the analysis type is wrong, or prompts are tuned for product reviews. Video comments should use video analysis, focusing on opinions, attitudes, controversies, content feedback, and reach instead of logistics, packaging, or after-sales topics.",
    "为什么结果全是负向，NPS 一直是 0？": "Why are all results negative and NPS always 0?",
    "可能是样本本身偏负向，也可能是分析规则过度把争议、调侃、中性讨论判成负向。先抽查原始评论，再检查分析类型和提示词配置。": "The sample may truly be negative, or the rules may over-classify controversy, jokes, or neutral discussion as negative. Check original comments first, then verify analysis type and prompt settings.",
    "AI 分析结果能不能完全直接用？": "Can AI analysis results be used directly?",
    "不建议完全不复核。AI 报告适合快速发现趋势和重点，但对外汇报前要回到评论明细抽查原文，确认结论有评论证据支撑。": "Not without review. AI reports are good for quickly finding trends and priorities, but before external reporting, sample original comments to confirm conclusions are supported by evidence.",
    "分析失败怎么看原因？": "How do I check why analysis failed?",
    "进入分析记录，看日志筛选。先切到“错误”，再看是否是模型返回异常、额度不足、评论数据异常或网络问题。": "Open Analysis records and use log filters. Start with Errors, then check for model response issues, insufficient quota, abnormal comment data, or network problems.",
    "报告复核": "Report review",
    "报告里的 NPS 应该怎么理解？": "How should I understand NPS in the report?",
    "NPS 是整体推荐或态度倾向指标。商品评论偏购买推荐，视频评论更偏内容认可、观看体验和态度倾向，不能机械套用电商口径。": "NPS is an overall recommendation or attitude indicator. Product reviews lean toward purchase recommendation; video comments lean toward content approval, viewing experience, and attitude, so e-commerce logic should not be applied mechanically.",
    "用户声音是什么？": "What is user voice?",
    "用户声音是评论里反复出现的观点、需求、痛点、关注点或争议点。它不是单纯关键词堆砌，而是帮助判断用户真正关心什么。": "User voice means recurring opinions, needs, pain points, concerns, or controversies in comments. It is not just keyword counting; it helps identify what users truly care about.",
    "报告结论不准怎么办？": "What if report conclusions are inaccurate?",
    "先到评论明细抽查原文，看是样本问题、采集不完整、分析类型错误，还是提示词需要调整。确认后把任务和截图反馈给管理员。": "Sample original comments in Comment details first. Check whether it is a sample issue, incomplete collection, wrong analysis type, or prompt problem, then send the task and screenshots to an admin.",
    "找不到评分、媒体、来源这些筛选条件？": "Can't find rating, media, or source filters?",
    "新版界面把低频筛选放进“更多筛选”抽屉。评论明细页点击“更多筛选”，可以看到评分、是否含媒体、来源渠道、分组和展示列等条件。": "The new UI puts lower-frequency filters in the More filters drawer. On Comment details, click More filters to find rating, media, source channel, grouping, and visible columns.",
    "评论可以导出吗？": "Can comments be exported?",
    "可以按当前筛选结果导出，用于报告证据、人工复核或二次分析。对外分享前要注意敏感内容和隐私信息。": "Yes. Export the current filtered results for report evidence, manual review, or secondary analysis. Check sensitive content and privacy before external sharing.",
    "移动端": "Mobile",
    "手机端和电脑端为什么界面不一样？": "Why are mobile and desktop interfaces different?",
    "系统会识别当前设备。电脑端适合复杂操作和大表格，手机端更适合查看状态、刷新任务、快速看报告和轻量复核。": "The system detects the current device. Desktop is better for complex operations and large tables; mobile is better for status checks, refreshes, quick reports, and light review.",
    "手机端能不能完成所有操作？": "Can mobile complete all operations?",
    "大部分轻量操作可以完成，但复杂筛选、大量评论复核、批量导出和后台管理更建议在电脑端操作。": "Most light operations are supported, but complex filtering, large comment review, batch export, and admin work are better on desktop.",
    "手机端评论为什么变成卡片？": "Why do comments become cards on mobile?",
    "这是为了适配小屏幕。评论明细在手机上用卡片和分页展示，避免宽表格横向拖动太多。": "This adapts to small screens. Comment details use cards and pagination on mobile to avoid too much horizontal table scrolling.",
    "数据安全": "Data security",
    "删除任务后能恢复吗？": "Can deleted tasks be restored?",
    "通常不能恢复。删除采集记录、监听任务或分析任务前一定要看确认弹窗，确认不再需要后再删除。": "Usually no. Before deleting collection records, monitors, or analysis tasks, read the confirmation dialog and delete only after confirming they are no longer needed.",
    "对外汇报能直接截图系统报告吗？": "Can I screenshot system reports for external presentations?",
    "可以，但建议先检查是否包含敏感评论、用户信息、内部任务名称或未确认结论。重要报告最好先做人工复核。": "Yes, but check for sensitive comments, user information, internal task names, or unverified conclusions first. Important reports should be manually reviewed.",
    "同一个链接能不能多次分析？": "Can the same link be analyzed multiple times?",
    "可以，但不建议无意义重复。重复分析会消耗额度，也可能让列表里出现多个相似任务。需要对比不同时间段时，建议用清晰的任务名称区分。": "Yes, but meaningless repetition is not recommended. Repeated analysis consumes quota and may create similar tasks. Use clear task names when comparing different periods.",
    "真实使用中最重要的注意事项是什么？": "What matters most in real use?",
    "三句话：链接要公开可访问；分析类型一定要选对；报告结论要回到评论原文抽查验证。": "Three things: the link must be public, the analysis type must be correct, and report conclusions must be checked against original comments.",
    "问题清单": "Question list",
    "覆盖模块": "Covered modules",
    "适用对象": "Applies to",
    "普通用户 / 超管": "Regular users / admins",
    "用户后台": "User console",
    "超管后台": "Admin console",
    "管理平台注册入口、普通用户配额和超管账号。普通用户后台只保留分析任务与个人设置。": "Manage platform registration, regular-user quotas, and admin accounts. The regular user console keeps only analysis tasks and personal settings.",
    "增长运营": "Growth ops",
    "评论采集": "Comment collection",
    "分析记录": "Analysis records",
    "提示词与模型": "Prompts & models",
    "抓取设置": "Crawler settings",
    "评论明细": "Comment details",
    "筛选、分组、保存视图，并把 AI 分析结果沉淀为团队可复用的评论视图。": "Filter, group, save views, and turn AI analysis results into reusable team comment views.",
    "刷新状态": "Refresh status",
    "发起分析": "Start analysis",
    "清除筛选": "Clear filters",
    "默认": "Default",
    "临时视图": "Temporary view",
    "筛选结果": "Filtered results",
    "当前载入": "Currently loaded",
    "带媒体评论": "Comments with media",
    "筛选条件": "Filter conditions",
    "有图/视频": "Images / videos",
    "纯文本": "Text only",
    "视图方式": "View mode",
    "按情感分组": "Group by sentiment",
    "按星级分组": "Group by stars",
    "按 AI 标签分组": "Group by AI tags",
    "按评论意图分组": "Group by comment intent",
    "显示列": "Visible columns",
    "视图操作": "View actions",
    "应用筛选": "Apply filters",
    "保存视图": "Save view",
    "导出当前结果": "Export current results",
    "设为默认": "Set as default",
    "转为行动项": "Create action item",
    "更多筛选与视图": "More filters and views",
    "保存筛选视图": "Save filter view",
    "视图名称": "View name",
    "请输入视图名称。": "Enter a view name.",
    "视图已保存。": "View saved.",
    "默认视图已更新。": "Default view updated.",
    "请先选择一个已保存视图。": "Select a saved view first.",
    "评论详情": "Comment details",
    "评论 ID": "Comment ID",
    "评论ID": "Comment ID",
    "编号": "No.",
    "表格": "Table",
    "商品名称": "Product name",
    "用户评价": "User review",
    "评级": "Rating",
    "星级": "Stars",
    "星级情感": "Star sentiment",
    "情感": "Sentiment",
    "情感筛选": "Sentiment filter",
    "AI 情感": "AI sentiment",
    "AI 摘要": "AI summary",
    "评论意图": "Comment intent",
    "未识别意图": "Intent not detected",
    "评论来源": "Comment source",
    "渠道": "Channel",
    "全部评论": "All comments",
    "关键词或标签": "Keyword or tag",
    "动态标签": "Dynamic tags",
    "观点聚类": "Opinion clusters",
    "分组": "Group",
    "规格": "Specification",
    "规格/颜色": "Specification / color",
    "媒体": "Media",
    "有": "Yes",
    "未打标": "Untagged",
    "重复评论": "Duplicate comments",
    "问题点": "Issue",
    "问题证据": "Issue evidence",
    "翻译评论": "Translate comment",
    "例如：负向问题评论 / 5 星好评 / 带图评论": "Example: negative issue comments / 5-star praise / comments with images",
    "先创建分析项目并导入评论 CSV": "Create an analysis project and import a comment CSV first",
    "分析任务已提交，系统会自动轮询状态。": "Analysis task submitted. The system will poll the status automatically.",
    "发起分析失败。": "Failed to start analysis.",
    "分析已完成，列表已刷新。": "Analysis completed. The list has been refreshed.",
    "分析已停止。": "Analysis stopped.",
    "停止分析失败，请稍后重试。": "Failed to stop analysis. Try again later.",
    "已创建行动项。": "Action item created.",
    "导出失败，当前筛选条件可能没有评论。": "Export failed. The current filters may have no comments.",
    "数据": "Data",
    "平台管理": "Platform admin",
    "模型与抓取": "Models & crawling",
    "评论采集控制台": "Comment collection console",
    "把 Shopee、YouTube、TikTok、Facebook 评论变成可持续监听的数据流，新评论自动入库、自动分析，任务状态一眼可见。": "Turn Shopee, YouTube, TikTok, and Facebook comments into continuously monitored data streams. New comments are imported and analyzed automatically, with task status visible at a glance.",
    "分析任务": "Analysis tasks",
    "全部任务列表": "All tasks",
    "持续监听任务": "Continuous monitors",
    "采集记录": "Crawl records",
    "采集运行观察": "Crawl runtime watch",
    "目标上限": "Target limit",
    "已抓取": "Fetched",
    "平台总量": "Platform total",
    "平台剩余": "Platform remaining",
    "未覆盖评论": "Uncovered comments",
    "当前页暂无覆盖缺口": "No coverage gap on this page",
    "重复跳过": "Duplicates skipped",
    "疑似无更新": "Likely no update",
    "活跃采集量": "Active crawl volume",
    "当前速度": "Current speed",
    "最近活动": "Latest activity",
    "运行任务正常更新": "Running tasks are updating normally",
    "暂无运行中的采集任务": "No running crawl tasks",
    "暂无运行任务": "No running tasks",
    "没有排队或抓取任务": "No queued or crawling tasks",
    "等待采集器回传速度": "Waiting for crawler speed",
    "暂无采集记录": "No crawl records yet",
    "最长静默": "Longest silent",
    "监听任务": "Monitor tasks",
    "会按设定频率自动抓取并分析": "Automatically crawls and analyzes on the configured schedule",
    "正在排队或抓取的采集任务": "Crawl tasks currently queued or running",
    "已采集评论": "Collected comments",
    "来自当前账号下的采集记录": "From crawl records under the current account",
    "待处理异常": "Pending exceptions",
    "需要检查链接、网络代理或平台限制": "Check links, network proxy, or platform limits",
    "运行中": "Running",
    "监听对象": "Monitor target",
    "频率": "Frequency",
    "最近运行": "Last run",
    "新建持续监听": "New continuous monitor",
    "创建监听": "Create monitor",
    "监听名称": "Monitor name",
    "内容名称": "Content name",
    "视频链接": "Video URL",
    "每次最多采集": "Max per crawl",
    "监听频率": "Monitor frequency",
    "自动处理": "Automation",
    "采集后自动分析": "Auto analyze after crawl",
    "只采集不分析": "Crawl only",
    "启用": "Enabled",
    "暂停": "Paused",
    "自动分析": "Auto analysis",
    "仅采集": "Crawl only",
    "还没有持续监听任务": "No continuous monitor tasks yet",
    "创建第一个监听任务": "Create first monitor task",
    "新建一次性采集": "New one-time crawl",
    "开始采集": "Start crawl",
    "最多采集条数": "Max comments",
    "不限": "unlimited",
    "评论采集已关闭": "Comment collection is disabled",
    "评论链接": "Comment URL",
    "例如：竞品 TikTok 视频舆情监听": "Example: competitor TikTok video sentiment monitor",
    "例如：新品发布 YouTube 评论采集": "Example: new launch YouTube comment crawl",
    "可选，默认使用视频标题或链接": "Optional; defaults to the video title or link",
    "可选，留空时会尽量从页面标题识别": "Optional; leave blank to infer from the page title when possible",
    "支持 Shopee 商品、YouTube 视频、TikTok 视频、Facebook 帖子/图片/Reel 链接": "Supports Shopee products, YouTube videos, TikTok videos, and Facebook post/photo/Reel links",
    "填 0 表示不限，直到平台没有更多评论或采集超时。": "Enter 0 for unlimited, until the platform has no more comments or the crawl times out.",
    "建议从 6 小时起步，高频任务更容易触发平台限制。": "Start from 6 hours. High-frequency tasks are more likely to trigger platform limits.",
    "填 0 表示不限；采集完成后会自动导入并启动 AI 分析。": "Enter 0 for unlimited. After crawling, comments are imported and AI analysis starts automatically.",
    "部分采集数据刷新失败，已保留上一次成功加载的记录。": "Some crawl data failed to refresh. The last successfully loaded records were kept.",
    "已导入评论并加入分析队列": "Comments imported and added to the analysis queue",
    "已重新加入采集队列": "Added back to the crawl queue",
    "采集记录已删除": "Crawl record deleted",
    "删除采集记录": "Delete crawl record",
    "已生成的分析任务不会被删除。": "Generated analysis tasks will not be deleted.",
    "评论采集已在抓取设置中关闭。": "Comment collection is disabled in crawler settings.",
    "请填写采集任务名称。": "Enter a crawl task name.",
    "请填写监听任务名称。": "Enter a monitor task name.",
    "请填写评论链接。": "Enter a comment URL.",
    "评论采集已加入队列，完成后会自动导入并启动 AI 分析。": "Comment collection has been queued. When complete, it will import comments and start AI analysis automatically.",
    "监听任务已创建，系统会自动发起首次采集。": "Monitor task created. The system will start the first crawl automatically.",
    "监听任务已启用": "Monitor task enabled",
    "监听任务已暂停": "Monitor task paused",
    "已加入采集队列。": "Added to the crawl queue.",
    "监听任务已删除": "Monitor task deleted",
    "请先在用户后台的抓取设置中启用评论采集，然后再创建监听任务或一次性采集任务。": "Enable comment collection in crawler settings before creating monitor tasks or one-time crawl tasks.",
    "切到运行中筛选查看详情": "Switch to the running filter to view details",
    "每 30 分钟": "Every 30 minutes",
    "每 1 小时": "Every 1 hour",
    "每 3 小时": "Every 3 hours",
    "每 6 小时": "Every 6 hours",
    "每 12 小时": "Every 12 hours",
    "每天": "Daily",
    "是": "Yes",
    "否": "No",
    "已分析": "Analyzed",
    "YouTube 视频": "YouTube video",
    "TikTok 视频": "TikTok video",
    "Facebook 评论": "Facebook comments",
    "YouTube 视频评论": "YouTube video comments",
    "TikTok 视频评论": "TikTok video comments",
    "Facebook 帖子评论": "Facebook post comments",
    "Shopee 商品评论": "Shopee product reviews",
    "评论排序": "Comment sorting",
    "已切换所有评论": "All comments selected",
    "未确认所有评论": "All comments not confirmed",
    "已到达": "Reached",
    "未确认": "Not confirmed",
    "达到采集上限": "Crawl limit reached",
    "没有更多评论": "No more comments",
    "游标未推进": "Cursor did not advance",
    "连续无新增": "No new rows after retries",
    "未发现评论": "No comments found",
    "暂不支持该链接": "Unsupported link",
    "未采集到评论": "No comments collected",
    "采集超时": "Crawl timed out",
    "部分结果：采集接近超时，可能未加载完全部评论": "Partial result: crawl neared timeout and may not have loaded all comments",
    "部分结果超时": "Partial result timed out",
    "链接解析失败": "Link parsing failed",
    "排队中": "Queued",
    "抓取中": "Crawling",
    "已完成": "Completed",
    "已重新排队": "Requeued",
    "已恢复": "Recovered",
    "已开始分析": "Analysis started",
    "失败": "Failed",
    "草稿": "Draft",
    "已导入": "Imported",
    "分析中": "Analyzing",
    "部分失败": "Partially failed",
    "未分析": "Not analyzed",
    "视频评论": "Video comments",
    "社媒评论": "Social comments",
    "商品评论": "Product reviews",
    "商品类评论": "Product reviews",
    "视频类评论": "Video comments",
    "推文类评论": "Post comments",
    "行动看板": "Action board",
    "把评论洞察拆成可分派、可跟进、可复盘的团队行动。": "Turn comment insights into assignable, trackable team actions.",
    "全部状态": "All statuses",
    "未处理": "Open",
    "处理中": "In progress",
    "已归档": "Archived",
    "逾期": "Overdue",
    "需要明确负责人和下一步": "Needs an owner and next step",
    "正在推进的风险或机会": "Risks or opportunities in progress",
    "本轮洞察已闭环": "Insights closed this round",
    "超过截止日期且未完成": "Past due and not completed",
    "负责人": "Owner",
    "编辑": "Edit",
    "证据": "Evidence",
    "标题": "Title",
    "说明": "Description",
    "优先级": "Priority",
    "截止日期": "Due date",
    "高": "High",
    "中": "Medium",
    "低": "Low",
    "来自报告问题": "From report issue",
    "AI 建议": "AI suggestion",
    "手动创建": "Manual",
    "编辑行动项": "Edit action item",
    "例如：跟进高频负面反馈": "Example: follow up high-frequency negative feedback",
    "请填写行动项标题。": "Enter an action item title.",
    "选择负责人": "Select owner",
    "确定删除该行动项？": "Delete this action item?",
    "行动项已保存。": "Action item saved.",
    "负责人已更新。": "Owner updated.",
    "行动项已删除。": "Action item deleted.",
    "超管": "Admin",
    "用户": "User",
    "平台用户": "Platform users",
    "包含超管与普通用户": "Includes admins and regular users",
    "可用邀请码": "Available invites",
    "已使用的邀请码无法再次注册": "Used invite codes cannot be reused",
    "全平台累计任务": "Total tasks across the platform",
    "用户与配额": "Users & quotas",
    "用户管理": "User management",
    "队列健康": "Queue health",
    "AI 分析队列": "AI analysis queue",
    "评论采集队列": "Comment crawl queue",
    "采集任务": "Crawl task",
    "采集任务库": "Crawl task store",
    "AI 分析批次库": "AI analysis run store",
    "任务队列状态": "Task queue status",
    "数据库任务健康": "Database task health",
    "队列一致性告警": "Queue integrity alerts",
    "排队对象": "Queued target",
    "队列": "Queue",
    "排队时间": "Queued for",
    "已排队": "Queued for",
    "疑似卡住任务": "Likely stalled tasks",
    "最近失败任务": "Recent failed tasks",
    "任务对象": "Task target",
    "失败对象": "Failed target",
    "渠道/模型": "Channel / model",
    "错误摘要": "Error summary",
    "诊断建议": "Diagnosis",
    "失败时间": "Failed at",
    "最后活动": "Last activity",
    "更新时间": "Updated at",
    "等待": "Waiting",
    "运行": "Running",
    "延迟": "Delayed",
    "已暂停": "Paused",
    "消费中": "Consuming",
    "排队": "Queued",
    "疑似卡住": "Likely stalled",
    "最早活跃": "Oldest active",
    "最近失败": "Latest failure",
    "需要检查": "Needs review",
    "有失败记录": "Has failures",
    "空闲": "Idle",
    "采集": "Crawl",
    "已静默": "Silent for",
    "排队超过阈值，疑似 worker 未消费或队列阻塞": "Queued beyond threshold; worker may not be consuming or the queue is blocked",
    "任务仍在运行态但已有最近错误": "Task is still running but has a recent error",
    "采集器接近或达到超时，任务未正常收尾": "Crawler is near or past timeout and did not finish cleanly",
    "评论排序未确认切换到全部评论": "Comment sorting was not confirmed as all comments",
    "已有评论入缓存，疑似导入或收尾阶段静默": "Comments are cached; import or finalization may be silent",
    "采集器仍有过程指标，但暂未形成有效评论": "Crawler still reports metrics but has not produced valid comments",
    "采集阶段": "Crawl stage",
    "等待 Worker 消费": "Waiting for worker",
    "接口分页采集中": "API pagination crawling",
    "页面滚动加载中": "Page scroll loading",
    "导入/收尾阶段": "Import / finalization",
    "采集启动中": "Starting crawl",
    "已导入并进入分析": "Imported and analyzing",
    "采集完成": "Crawl completed",
    "采集失败": "Crawl failed",
    "加载页数": "Loaded pages",
    "接口请求": "API requests",
    "接口评论": "API comments",
    "页面评论": "Page comments",
    "页面文本": "Page text",
    "加载更多": "Load more",
    "本轮按钮": "This round button",
    "点到": "Clicked",
    "未点到": "Not found",
    "空转轮次": "Idle rounds",
    "本轮新增": "New this round",
    "未见更多": "No-more rounds",
    "排序菜单": "Sort menu",
    "排序标签": "Sort label",
    "已打开": "Opened",
    "未打开": "Not opened",
    "游标": "Cursor",
    "HTTP 状态": "HTTP status",
    "还有更多": "Has more",
    "剩余时间": "Time remaining",
    "末尾状态": "End state",
    "接口已返回评论，但导入数量偏低，建议检查解析字段和去重规则。": "The API returned comments, but imports are low. Check parser fields and deduplication rules.",
    "页面已加载评论但入库偏低，建议检查评论选择器或平台语言。": "The page loaded comments, but stored rows are low. Check comment selectors or platform language.",
    "平台接口返回的分页游标没有继续推进，可能是接口签名、会话或平台限制导致提前停住。": "The platform API returned a pagination cursor that did not advance. It may have stopped early because of API signature, session, or platform limits.",
    "浏览器兜底采集连续多轮没有新增评论，建议确认是否已到底、是否触发平台风控或评论面板未继续加载。": "Browser fallback collection had no new comments for multiple rounds. Confirm whether it reached the end, triggered platform risk control, or the comment panel stopped loading.",
    "平台仍提示还有更多评论，可提高最大采集条数或用监听任务继续补采。": "The platform still reports more comments. Increase the max comments or use monitor tasks to keep collecting.",
    "页面有加载动作但没有识别到评论，建议检查登录态、排序和评论区权限。": "The page loaded more content but no comments were recognized. Check login state, sorting, and comment permissions.",
    "连续多轮没有新增且未点到更多评论，可能已到页尾或按钮文案未匹配。": "No new comments for multiple rounds and the more-comments button was not found. The page may be at the end, or the button text may not match.",
    "连续多轮没有新增评论，建议确认是否已加载到底或触发平台风控。": "No new comments for multiple rounds. Confirm whether the page reached the end or platform risk control was triggered.",
    "采集过程指标暂少，继续等待下一次进度回传。": "Crawler telemetry is still sparse. Wait for the next progress event.",
    "运行超过阈值且没有采集器进度回传": "Running beyond threshold with no crawler progress events",
    "分析批次排队超过阈值，疑似 AI worker 未消费": "Analysis run queued beyond threshold; AI worker may not be consuming",
    "分析批次运行中但已有最近错误": "Analysis run is active but has a recent error",
    "已有部分评论处理完成，但最近无进度日志": "Some comments were processed, but no recent progress logs",
    "分析批次运行超过阈值且没有处理进度": "Analysis run exceeded threshold with no processing progress",
    "检查 crawl-jobs 队列 active/waiting 数、worker 进程和 Redis 连接": "Check crawl-jobs active/waiting counts, worker process, and Redis connection",
    "先查看错误摘要，确认代理、登录态、平台限制或 Python 浏览器依赖": "Review the error summary first; check proxy, login state, platform limits, or Python browser dependencies",
    "降低单次最大采集数或检查平台加载速度，必要时重试": "Lower max comments per crawl or check platform loading speed; retry if needed",
    "稍后重试；若持续出现，降低单次采集上限并检查代理、浏览器参数和接口签名": "Retry later. If it keeps happening, lower the per-crawl limit and check proxy, browser parameters, and API signature",
    "检查登录态、代理稳定性和评论弹窗打开情况；必要时降低单次采集上限后重试": "Check login state, proxy stability, and whether the comment panel opened. Lower the per-crawl limit and retry if needed",
    "检查平台登录态、页面语言和排序按钮文案，避免只抓到相关评论": "Check platform login, page language, and sort-button text to avoid only relevant comments",
    "等待短时间自动收尾；若持续静默，查看 worker 日志后重试": "Wait briefly for finalization; if silence continues, check worker logs and retry",
    "检查平台是否需要登录、评论区是否受限、代理是否触发风控": "Check whether login is required, comments are restricted, or proxy triggered risk control",
    "优先检查 Python/浏览器依赖、worker 进程、代理和目标链接可访问性": "Prioritize Python/browser dependencies, worker process, proxy, and target URL accessibility",
    "检查 analysis-runs 队列、worker 并发和 Redis 连接": "Check analysis-runs queue, worker concurrency, and Redis connection",
    "检查 AI 配置、模型额度、网络超时和最近失败样本": "Check AI settings, model quota, network timeout, and recent failed samples",
    "查看 worker 日志和当前批次大小，必要时降低并发或重试": "Check worker logs and current batch size; reduce concurrency or retry if needed",
    "检查 AI worker 是否在线、模型接口是否可用、任务是否被长请求占用": "Check whether AI worker is online, model API is available, or the task is held by a long request",
    "最新批次已有错误，先打开分析日志并筛选错误，再确认模型额度、网络超时或提示词返回格式。": "The latest run has an error. Open analysis logs, filter errors, then check model quota, network timeout, or prompt output format.",
    "分析批次排队后长时间无日志，可能是 AI worker 未消费或队列阻塞。": "The analysis run has been queued with no logs for a long time. The AI worker may not be consuming, or the queue may be blocked.",
    "分析批次长时间无新日志，建议查看 worker、模型接口和当前并发配置。": "The analysis run has no new logs for a long time. Check the worker, model API, and current concurrency settings.",
    "批次已部分失败，报告可参考但需要复核失败样本，必要时重新分析。": "The run partially failed. The report can be referenced, but failed samples should be reviewed and reanalyzed if needed.",
    "批次已有最近错误，先筛选错误日志，再检查 AI 配置、模型额度、网络超时和提示词返回格式。": "The run has a recent error. Filter error logs first, then check AI settings, model quota, network timeout, and prompt output format.",
    "排队后长时间没有日志，疑似 AI worker 未消费、Redis 队列异常或前面任务积压。": "Queued with no logs for a long time. The AI worker may not be consuming, Redis may be abnormal, or earlier tasks may be backed up.",
    "运行中长时间没有新日志，可能卡在模型请求、网络超时或 worker 并发占用。": "Running with no new logs for a long time. It may be stuck in a model request, network timeout, or occupied worker concurrency.",
    "运行超过 5 分钟仍未处理评论，建议检查模型接口是否响应，以及 worker 是否被长请求占用。": "Running for over 5 minutes without processing comments. Check whether the model API responds and whether the worker is held by a long request.",
    "批次部分失败，已成功的评论可用于报告，但失败样本需要复核或重试。": "The run partially failed. Successful comments can be used in the report, but failed samples need review or retry.",
    "批次失败，确认模型额度、API Key、网络和提示词返回格式后再重试。": "The run failed. Confirm model quota, API key, network, and prompt output format before retrying.",
    "平台拒绝访问，优先检查登录态、账号权限、评论区可见性和代理地区。": "The platform denied access. First check login state, account permissions, comment visibility, and proxy region.",
    "平台触发限流，建议降低单次采集量或频率，更换代理后再重试。": "The platform rate-limited the request. Reduce per-crawl volume or frequency, change proxy, then retry.",
    "平台或代理链路返回服务异常，建议稍后重试并检查代理稳定性。": "The platform or proxy returned a service error. Retry later and check proxy stability.",
    "平台拒绝了本次请求，建议检查链接、接口签名、浏览器环境或登录态。": "The platform rejected this request. Check the link, API signature, browser environment, or login state.",
    "平台接口返回 429，疑似请求过快或代理出口被限流": "Platform API returned 429. Requests may be too frequent, or the proxy exit may be rate-limited.",
    "检查平台账号登录态、Cookie/会话、目标链接权限和代理出口地区": "Check the platform account login state, Cookie/session, target-link permissions, and proxy region.",
    "降低单次最大采集数或采集频率，更换代理出口后重试": "Reduce the max comments per crawl or crawl frequency, change the proxy exit, then retry.",
    "稍后重试；若持续出现，检查代理稳定性和目标平台可访问性": "Retry later. If it keeps happening, check proxy stability and target-platform accessibility.",
    "检查目标链接是否有效、接口签名/浏览器环境是否过期，以及是否需要登录态": "Check whether the target link is valid, whether API signatures/browser context expired, and whether login is required.",
    "评论排序未确认切到全部评论，可能只抓到相关评论；建议检查登录态和页面语言后重试。": "Comment sorting was not confirmed as all comments, so only relevant comments may be collected. Check login state and page language, then retry.",
    "采集接近超时提前返回，建议降低单次最大采集量，或改用监听任务分批采集。": "Crawl returned early near timeout. Lower the max comments per crawl or use monitor tasks to collect in batches.",
    "已达到本次采集上限，如需更多评论可提高最大采集条数后重新采集。": "This crawl reached its limit. Increase the max comments and crawl again if more comments are needed.",
    "TikTok 接口游标未继续推进，疑似分页签名、会话或平台限制": "TikTok API cursor did not advance; pagination signature, session, or platform limits may be blocking it",
    "TikTok 接口游标未继续推进，建议稍后重试；若持续出现，降低单次采集上限并检查代理、浏览器参数和接口签名。": "TikTok API cursor did not advance. Retry later; if it keeps happening, lower the per-crawl limit and check proxy, browser parameters, and API signature.",
    "浏览器兜底采集连续多轮无新增，疑似评论面板未继续加载、代理波动或平台风控": "Browser fallback collection had no new rows for multiple rounds; the comment panel may have stopped loading, the proxy may be unstable, or platform risk control may be active",
    "浏览器兜底采集已连续多轮无新增，建议稍后重试；若经常出现，检查登录态、代理稳定性和评论弹窗是否成功打开。": "Browser fallback collection had no new rows for multiple rounds. Retry later; if it happens often, check login state, proxy stability, and whether the comment panel opened successfully.",
    "任务长时间没有更新，可能卡在页面加载、代理访问或平台风控，建议稍后刷新或联系管理员查看后台诊断。": "The task has not updated for a long time. It may be stuck on page loading, proxy access, or platform risk control. Refresh later or ask an admin to check backend diagnostics.",
    "采集失败，先看错误摘要；确认链接公开、评论区开启、代理和登录态正常后再重试。": "Crawl failed. Check the error summary first; confirm the link is public, comments are enabled, proxy and login state are normal, then retry.",
    "未采集到评论，先确认链接公开可访问、评论区开启，必要时换登录态或代理再试。": "No comments were collected. Confirm the link is public, comments are enabled, and switch login state or proxy if needed.",
    "优先处理队列连接、暂停状态和一致性告警；需要时使用“补回队列”或停止后重新创建任务。": "Prioritize queue connection, paused state, and integrity alerts. Use Restore queue job or stop and recreate tasks if needed.",
    "先看诊断建议和最近错误，再检查 worker、Redis、代理、平台登录态或 AI 模型配置。": "Read the diagnosis and recent error first, then check worker, Redis, proxy, platform login state, or AI model settings.",
    "查看最近失败任务，已恢复的任务可略过；未恢复的采集或分析可以按需重试。": "Check recent failed tasks. Recovered tasks can be ignored; unrecovered crawls or analyses can be retried as needed.",
    "当前未发现一致性告警或卡住任务，保持观察即可。": "No integrity alerts or stalled tasks are currently detected. Keep observing.",
    "队列健康正常": "Queue health is normal",
    "当前没有待处理告警、卡住任务或最近失败记录。": "There are no pending alerts, stalled tasks, or recent failure records.",
    "数据库仍是排队中，但 BullMQ 待处理队列里没有对应采集 job": "Database status is queued, but no matching crawl job exists in BullMQ pending queues",
    "数据库仍是排队中，但 BullMQ 待处理队列里没有对应分析 job": "Database status is queued, but no matching analysis job exists in BullMQ pending queues",
    "优先检查任务是否曾入队失败；确认后可在采集记录里重试，或停止该记录再重新采集": "Check whether enqueue failed; after confirming, retry from crawl records or stop it and crawl again",
    "优先取消该分析批次，再重新发起分析，避免一直显示排队但 worker 无法消费": "Cancel this analysis run first, then start analysis again so it does not remain queued without a consumable job",
    "补回队列": "Restore queue job",
    "队列 job 已补回": "Queue job restored",
    "队列 job 已存在": "Queue job already exists",
    "暂停队列": "Pause queue",
    "恢复队列": "Resume queue",
    "队列已暂停": "Queue paused",
    "队列已恢复": "Queue resumed",
    "暂停队列失败": "Failed to pause queue",
    "恢复队列失败": "Failed to resume queue",
    "待复核": "Needs review",
    "补回队列失败": "Failed to restore queue job",
    "补回队列任务": "Restore queue job",
    "采集任务已重新加入队列": "Crawl task has been requeued",
    "采集任务重试失败": "Failed to retry crawl task",
    "采集任务已停止": "Crawl task has been stopped",
    "停止采集失败": "Failed to stop crawl task",
    "分析任务已重新加入队列": "Analysis task has been requeued",
    "分析任务重试失败": "Failed to retry analysis task",
    "分析任务已停止": "Analysis task has been stopped",
    "停止分析失败": "Failed to stop analysis",
    "保存空间成员": "Save workspace member",
    "更新成员角色": "Update member role",
    "移除空间成员": "Remove workspace member",
    "邀请成员": "Invite member",
    "系统权限": "System permission",
    "普通用户": "Regular user",
    "当前角色没有权限访问用户管理": "Current role cannot access user management",
    "管理当前工作空间的成员、角色和访问权限。": "Manage members, roles, and access for the current workspace.",
    "请填写姓名和邮箱。": "Enter name and email.",
    "成员已保存。": "Member saved.",
    "角色已更新。": "Role updated.",
    "确定移除该成员？": "Remove this member?",
    "成员已移除。": "Member removed.",
    "修改密码": "Change password",
    "创建空间": "Create workspace",
    "删除空间": "Delete workspace",
    "运行提示词评测": "Run prompt evaluation",
    "创建采集任务": "Create crawl task",
    "采集启动分析": "Start analysis from crawl",
    "重试采集任务": "Retry crawl task",
    "停止采集任务": "Stop crawl task",
    "删除采集任务": "Delete crawl task",
    "创建监听任务": "Create monitor task",
    "更新监听任务": "Update monitor task",
    "手动运行监听": "Run monitor manually",
    "删除监听任务": "Delete monitor task",
    "创建分析批次": "Create analysis run",
    "取消分析批次": "Cancel analysis run",
    "分析批次": "Analysis run",
    "导入新任务": "Import new task",
    "评论导入": "Comment import",
    "保存分析视图": "Save analysis view",
    "更新分析视图": "Update analysis view",
    "删除分析视图": "Delete analysis view",
    "分析视图": "Analysis view",
    "创建 AI 纠错": "Create AI correction",
    "AI 纠错": "AI correction",
    "创建行动项": "Create action item",
    "更新行动项": "Update action item",
    "删除行动项": "Delete action item",
    "导入": "Imported",
    "后台权限": "Console role",
    "配额调整": "Quota adjustment",
    "本期用量": "Current usage",
    "注册邀请码": "Invite code",
    "邀请码": "Invite code",
    "邀请码池": "Invite pool",
    "配额": "Quota",
    "使用人": "Used by",
    "创建人": "Created by",
    "生成邀请码": "Generate invite code",
    "生成": "Generate",
    "备注": "Note",
    "评论配额": "Comment quota",
    "分析次数配额": "Analysis quota",
    "过期时间": "Expires at",
    "新建平台账号": "New platform account",
    "保存账号": "Save account",
    "账号状态": "Account status",
    "禁用": "Disabled",
    "重置": "Reset",
    "重置密码": "Reset password",
    "确定将该用户密码重置为 123456？": "Reset this user's password to 123456?",
    "平台级": "Platform level",
    "请填写姓名和邮箱": "Enter name and email",
    "用户已保存，初始密码为 123456": "User saved. Initial password is 123456.",
    "保存用户失败": "Failed to save user",
    "用户状态已更新": "User status updated",
    "用户权限已更新": "User permission updated",
    "用户信息更新失败": "Failed to update user information",
    "密码重置失败": "Failed to reset password",
    "用户配额已更新": "User quota updated",
    "用户配额更新失败": "Failed to update user quota",
    "邀请码已复制": "Invite code copied",
    "生成邀请码失败": "Failed to generate invite code",
    "浏览器未允许自动复制，请手动复制邀请码。": "The browser did not allow automatic copy. Copy the invite code manually.",
    "操作日志": "Audit logs",
    "最近操作": "Recent activity",
    "按动作、对象、操作人和空间定位审计记录": "Find audit records by action, target, actor, and workspace",
    "刷新日志": "Refresh logs",
    "操作类型": "Action type",
    "操作人": "Operator",
    "对象类型": "Object type",
    "对象": "Object",
    "详情": "Details",
    "系统": "System",
    "条数": "Rows",
    "报告分享": "Report share",
    "创建分享": "Create share",
    "撤销分享": "Revoke share",
    "删除任务": "Delete task",
    "更新 AI 设置": "Update AI settings",
    "更新爬虫设置": "Update crawler settings",
    "更新用户": "Update user",
    "行动项": "Action item",
    "加载操作日志失败": "Failed to load audit logs",
    "加载超管数据失败": "Failed to load admin data",
    "队列健康数据加载中": "Loading queue health data",
    "后台会在队列健康页每 10 秒自动刷新一次。": "The queue health page refreshes automatically every 10 seconds.",
    "例如：5 月测试用户 / 某客户试用": "Example: May test user / customer trial",
    "姓名": "Name",
    "邮箱": "Email",
    "设为超管": "Set as admin",
    "已使用": "Used",
    "可使用": "Available",
    "尚未使用": "Not used",
    "需要超管权限": "Admin permission required",
    "当前账号没有平台超管权限。": "This account does not have platform admin permission.",
    "返回用户后台": "Back to user console",
    "增长运营工作台": "Growth operations workspace",
    "每天看变化、看异常、看竞品差距，把 AI 分析沉淀成可交付的经营动作。": "Track daily changes, anomalies, and competitor gaps, then turn AI analysis into deliverable operating actions.",
    "刷新简报": "Refresh brief",
    "每日变化简报": "Daily change brief",
    "今日新增": "New today",
    "负面占比": "Negative rate",
    "平均星级": "Average rating",
    "评论数": "Comment count",
    "首要问题": "Top issue",
    "风险": "Risk",
    "高风险": "High risk",
    "预警": "Warning",
    "稳定": "Stable",
    "紧急": "Urgent",
    "提示": "Tip",
    "选择任务": "Select task",
    "选择一个已完成分析的任务后生成今日简报。": "Select a task with completed analysis to generate today's brief.",
    "还没有分析任务，请先导入或抓取评论。": "No analysis tasks yet. Import or crawl comments first.",
    "简报需要至少完成一次 AI 分析。": "The brief requires at least one completed AI analysis.",
    "需要至少两个已完成分析的任务。": "At least two completed analysis tasks are required.",
    "请选择至少 2 个任务。": "Select at least 2 tasks.",
    "纠错已保存，并会覆盖当前分析结果中的对应字段。": "Correction saved and will override the matching fields in the current analysis result.",
    "交付链接已复制。": "Delivery link copied.",
    "浏览器未允许自动复制，请手动复制输入框中的链接。": "The browser did not allow automatic copy. Copy the link from the input manually.",
    "异常预警": "Alerts",
    "竞品/任务对比": "Competitor / task comparison",
    "多任务趋势对比": "Multi-task trend comparison",
    "选择 2-8 个任务，对比 NPS、负面率、评分和主要风险。": "Select 2-8 tasks to compare NPS, negative rate, rating, and key risks.",
    "开始对比": "Start comparison",
    "当前领先": "Current leader",
    "暂无胜出任务": "No winning task",
    "需关注": "Needs attention",
    "健康": "Healthy",
    "AI 纠错与提示词评测": "AI correction & prompt evaluation",
    "提示词评测": "Prompt evaluation",
    "从结构化输出、证据约束、分类口径和模型配置检查稳定性。": "Check stability through structured output, evidence constraints, classification rules, and model configuration.",
    "立即评测": "Evaluate now",
    "未配置模型": "Model not configured",
    "默认版本": "Default version",
    "通过": "Passed",
    "待补强": "Needs improvement",
    "AI 结果纠错": "AI result correction",
    "抽取当前任务的评论样本，修正情绪、摘要、痛点和建议。": "Sample comments from the current task and correct sentiment, summary, pain points, and suggestions.",
    "加载样本": "Load samples",
    "选择评论样本": "Select comment sample",
    "修正情绪": "Correct sentiment",
    "正向": "Positive",
    "中性": "Neutral",
    "负向": "Negative",
    "标签，逗号分隔": "Tags, separated by commas",
    "修正摘要": "Correct summary",
    "纠错备注": "Correction note",
    "保存纠错": "Save correction",
    "报告交付增强": "Report delivery",
    "客户/老板可读报告": "Client-ready report",
    "一键生成公开报告链接，并支持打开后浏览器打印为 PDF。": "Generate a public report link in one click, then print to PDF from the browser.",
    "打开报告": "Open report",
    "生成交付链接": "Create delivery link",
    "复制链接": "Copy link",
    "打开交付页": "Open delivery page",
    "公开链接可撤销": "Public links can be revoked",
    "报告页面支持打印/PDF": "Report page supports print/PDF",
    "指标、趋势、痛点和行动项完整展示": "Metrics, trends, pain points, and action items are shown completely",
    "AI 分析": "AI analysis",
    "空间与成员": "Workspace & members",
    "管理当前空间、成员角色、我的空间列表和额度使用情况。": "Manage the current workspace, member roles, my workspace list, and quota usage.",
    "空间成员": "Workspace member",
    "成员列表加载失败，请检查权限": "Failed to load members. Check permissions.",
    "成员已添加到当前空间": "Member added to the current workspace",
    "成员保存失败，请检查权限或输入信息": "Failed to save member. Check permissions or input.",
    "成员角色已更新": "Member role updated",
    "角色更新失败，请检查权限": "Failed to update role. Check permissions.",
    "确定从当前空间移除该成员？": "Remove this member from the current workspace?",
    "成员已从当前空间移除": "Member removed from the current workspace",
    "成员移除失败，请检查权限": "Failed to remove member. Check permissions.",
    "AI 设置": "AI settings",
    "配置当前账号的模型供应商、接口密钥和评论分析提示词。": "Configure the model provider, API key, and comment-analysis prompts for the current account.",
    "模型设置加载失败": "Failed to load model settings",
    "AI 设置已保存": "AI settings saved",
    "AI 设置保存失败，请检查权限或输入内容": "Failed to save AI settings. Check permissions or input.",
    "已恢复当前类型默认提示词，保存后生效": "Default prompt for the current type restored. Save to apply it.",
    "爬虫设置": "Crawler settings",
    "配置当前账号的 Shopee、YouTube、TikTok、Facebook 评论抓取代理和默认抓取参数。": "Configure the proxy and default crawl parameters for Shopee, YouTube, TikTok, and Facebook comment collection on the current account.",
    "默认来源渠道": "Default source channel",
    "抓取设置加载失败": "Failed to load crawler settings",
    "爬虫设置已保存": "Crawler settings saved",
    "爬虫设置保存失败，请检查权限或输入内容": "Failed to save crawler settings. Check permissions or input.",
    "python 或 C:\\Python312\\python.exe": "python or C:\\Python312\\python.exe",
    "当前空间": "Current workspace",
    "已选空间": "Selected workspace",
    "我的角色": "My role",
    "所有者和管理员可以管理成员与空间配置": "Owners and admins can manage members and workspace settings",
    "评论额度": "Comment quota",
    "分析次数": "Analysis runs",
    "额度用量": "Quota usage",
    "当前空间成员": "Current members",
    "角色权限矩阵": "Role permission matrix",
    "按当前接口权限": "Current API permissions",
    "平台超管不受空间角色限制；普通成员按所在空间角色执行权限。": "Platform admins are not limited by workspace roles. Regular members follow their workspace role.",
    "权限点": "Permission",
    "查看报告与评论": "View reports and comments",
    "导入/采集评论": "Import/collect comments",
    "启动/停止分析": "Start/stop analysis",
    "创建/撤销分享": "Create/revoke shares",
    "删除任务和采集记录": "Delete tasks and crawl records",
    "管理空间成员": "Manage workspace members",
    "修改模型和爬虫配置": "Edit model and crawler settings",
    "可用": "Allowed",
    "仅超管": "Admin only",
    "无权限": "No access",
    "添加成员": "Add member",
    "可管理": "Manageable",
    "只读": "Read-only",
    "不限额": "Unlimited",
    "超管不限额": "Admin unlimited",
    "未设置重置日期": "No reset date set",
    "空间已切换": "Workspace switched",
    "空间已创建": "Workspace created",
    "空间创建失败，请稍后重试": "Failed to create workspace. Try again later.",
    "请填写空间名称": "Enter a workspace name",
    "确定删除这个工作空间吗？": "Delete this workspace?",
    "删除后空间内的任务、评论、分析结果和成员关系都会被移除。": "Tasks, comments, analysis results, and member relations in this workspace will be removed.",
    "删除工作空间失败，请检查权限或稍后重试": "Failed to delete workspace. Check permissions or try again later.",
    "这里管理的是当前空间成员关系；平台账号、超管权限和租户额度由超管后台管理。": "This area manages current workspace membership. Platform accounts, admin permissions, and tenant quotas are managed in the admin console.",
    "可选，例如：brand-ops": "Optional, for example: brand-ops",
    "例如：品牌运营团队": "Example: Brand operations team",
    "例如：运营同事": "Example: Operations colleague",
    "例如：http://127.0.0.1:7890": "Example: http://127.0.0.1:7890",
    "例如：v2-thai": "Example: v2-thai",
    "已隐藏": "Hidden",
    "已保存（已隐藏），输入新密钥可替换": "Saved (hidden). Enter a new key to replace it",
    "平台超管": "Platform admin",
    "普通账号": "Regular account",
    "移除": "Remove",
    "模型设置": "Model settings",
    "分析模型": "Analysis model",
    "可编辑": "Editable",
    "模型供应商": "Model provider",
    "接口密钥": "API key",
    "接口地址": "API endpoint",
    "模型名称": "Model name",
    "提示词版本": "Prompt version",
    "随机性": "Temperature",
    "提示词设置": "Prompt settings",
    "恢复默认提示词": "Restore default prompt",
    "保存设置": "Save settings",
    "系统提示词": "System prompt",
    "单条评论分析提示词模板": "Single-comment prompt template",
    "总体总结提示词": "Summary prompt",
    "分析报告提示词": "Report prompt",
    "可用变量：{taxonomy}、{ratingStar}、{comment}、{commentTr}": "Available variables: {taxonomy}, {ratingStar}, {comment}, {commentTr}",
    "Scrapling 评论抓取": "Scrapling comment crawler",
    "保存爬虫设置": "Save crawler settings",
    "启用链接抓取": "Enable link crawling",
    "Python 命令": "Python command",
    "代理地址": "Proxy URL",
    "默认抓取条数": "Default crawl count",
    "填 0 表示不限，适用于 Shopee、YouTube、TikTok、Facebook 评论采集。": "Enter 0 for unlimited. Applies to Shopee, YouTube, TikTok, and Facebook comment collection.",
    "超时时间（秒）": "Timeout (seconds)",
    "链接抓取当前支持 Shopee 商品、YouTube 视频、TikTok 视频和 Facebook 帖子/图片/Reel 评论。代理会传给本地 Scrapling 脚本，用于访问公开评论接口。": "Link crawling currently supports Shopee product reviews, YouTube video comments, TikTok video comments, and Facebook post/photo/Reel comments. The proxy is passed to the local Scrapling script for public comment APIs.",
    "我的空间": "My workspaces",
    "切换": "Switch",
    "新建租户空间": "New tenant workspace",
    "创建": "Create",
    "空间名称": "Workspace name",
    "空间标识": "Workspace slug",
    "添加空间成员": "Add member",
    "如果该邮箱尚未注册，系统会先创建占位账号；对方用同一邮箱注册后即可进入此空间。": "If the email is not registered yet, the system creates a placeholder account first. They can enter this workspace after registering with the same email.",
    "空间角色": "Workspace role",
    "空间": "Workspace",
    "角色": "Role",
    "套餐": "Plan",
    "评论用量": "Comment usage",
    "成员": "Member",
    "平台权限": "Platform role",
    "所有者": "Owner",
    "管理员": "Admin",
    "分析师": "Analyst",
    "筛选": "Filters",
    "更多筛选": "More filters",
    "关键词": "Keyword",
    "评分": "Rating",
    "是否含媒体": "Has media",
    "有媒体": "With media",
    "无媒体": "No media",
    "导出": "Export",
    "清空": "Clear",
    "应用": "Apply",
    "原始评论": "Original comment",
    "评论时间": "Comment time",
    "浏览": "Views",
    "情绪": "Sentiment",
    "意图": "Intent",
    "主题": "Topic",
    "摘要": "Summary",
    "建议": "Suggestion",
    "痛点": "Pain points",
    "亮点": "Highlights",
    "报告": "Report",
    "报告不可访问": "Report unavailable",
    "正在加载报告": "Loading report",
    "面向业务复盘和对外汇报的评论洞察报告，支持导出、分享和证据追溯。": "A comment insight report for business reviews and external reporting, with export, sharing, and evidence tracing.",
    "导出报告": "Export report",
    "导出 Markdown": "Export Markdown",
    "导出 HTML": "Export HTML",
    "打印 / 保存 PDF": "Print / save PDF",
    "刷新报告": "Refresh report",
    "分享报告": "Share report",
    "打印/PDF": "Print/PDF",
    "产品洞察报告": "Product insight report",
    "视频内容反馈报告": "Video feedback report",
    "社媒舆情报告": "Social sentiment report",
    "评论分析报告": "Comment analysis report",
    "推文舆情报告": "Post sentiment report",
    "实时报告": "Live report",
    "固定快照": "Snapshot",
    "固定当前版本": "Snapshot current version",
    "分享链接不存在、已撤销或已过期。": "The share link does not exist, has been revoked, or has expired.",
    "分享分析报告": "Share analysis report",
    "只读报告链接": "Read-only report link",
    "外部访问者无需登录，只能查看当前任务的报告汇总和图表。": "External visitors do not need to sign in and can only view this task's report summary and charts.",
    "生成链接": "Create link",
    "还没有分享链接": "No share link yet",
    "已撤销": "Revoked",
    "分享链接已生成并复制。": "Share link generated and copied.",
    "固定快照链接已生成并复制。": "Snapshot link generated and copied.",
    "实时报告链接已生成并复制。": "Live report link generated and copied.",
    "分享链接已生成，但浏览器未允许自动复制，请手动复制输入框中的链接。": "Share link generated, but the browser did not allow automatic copy. Copy the link from the input manually.",
    "分享链接已复制。": "Share link copied.",
    "撤销分享链接": "Revoke share link",
    "撤销后外部访问者将无法继续查看。": "After revoking, external visitors will no longer be able to view it.",
    "撤销": "Revoke",
    "分享链接已撤销。": "Share link revoked.",
    "当前报告还没有生成分析结果，暂时无法导出。": "This report has no analysis result yet and cannot be exported.",
    "Markdown 报告已导出。": "Markdown report exported.",
    "HTML 报告已导出。": "HTML report exported.",
    "当前任务还没有生成分析结果。": "The current task has no analysis result yet.",
    "暂无 AI 总结，请查看下方图表和证据模块。": "No AI summary yet. Check the charts and evidence sections below.",
    "等待评论样本和分析结果": "Waiting for comment samples and analysis results",
    "等待首次分析": "Waiting for first analysis",
    "已生成分析结果": "Analysis result generated",
    "用户声音": "Customer voice",
    "客户声音摘要": "Customer voice summary",
    "观众声音摘要": "Audience voice summary",
    "舆情声音摘要": "Public sentiment summary",
    "主要问题": "Main issues",
    "趋势": "Trend",
    "洞察": "Insights",
    "执行摘要": "Executive summary",
    "核心指标": "Core metrics",
    "评论总量": "Total comments",
    "当前报告": "Current report",
    "共享报告": "Shared report",
    "质量检查": "Quality check",
    "动态话题": "Dynamic topics",
    "噪音控制": "Noise control",
    "策略洞察": "Strategic insights",
    "进入本次报告的样本量": "Samples included in this report",
    "已纳入本次洞察样本": "Included in this insight sample",
    "用户认可和可放大的反馈": "Approved feedback that can be amplified",
    "有效评论": "Valuable comments",
    "AI 总结": "AI summary",
    "语言画像": "Language profile",
    "低价值评论": "Low-value comments",
    "已降权": "downweighted",
    "非中文/混合评论，主语言": "Non-Chinese / mixed comments, primary language",
    "为主": "dominant",
    "条证据": "evidence items",
    "条样本": "samples",
    "情感分布": "Sentiment distribution",
    "整体情感分布": "Overall sentiment distribution",
    "评论意图分布": "Comment intent distribution",
    "评论来源分布": "Comment source distribution",
    "评论语言分布": "Comment language distribution",
    "高频问题": "Frequent issues",
    "用户问题统计": "User issue statistics",
    "高频问题统计": "Frequent issue statistics",
    "正向情感占比": "Positive sentiment share",
    "核心关键词": "Core keywords",
    "动态内容标签": "Dynamic content tags",
    "分析质量提醒": "Analysis quality alerts",
    "重复/相似评论聚合": "Duplicate / similar comment clusters",
    "重复评论占比": "Duplicate comment share",
    "重复评论簇": "Duplicate comment clusters",
    "最大重复簇占比": "Largest duplicate cluster share",
    "观点聚类与证据评论": "Opinion clusters and evidence comments",
    "主要问题证据": "Main issue evidence",
    "问题证据与行动项": "Issue evidence and action items",
    "生成行动项": "Create action item",
    "跟进问题": "Follow up issue",
    "查看证据": "View evidence",
    "代表性评论": "Representative comments",
    "正向代表评论": "Positive representative comments",
    "负向代表评论": "Negative representative comments",
    "暂无意图分布数据": "No intent distribution data",
    "暂无高频问题": "No frequent issues",
    "暂无动态内容标签": "No dynamic content tags",
    "暂无观点聚类": "No opinion clusters",
    "暂无深度洞察": "No deep insights",
    "暂无质量提醒": "No quality alerts",
    "暂无正向代表评论": "No positive representative comments",
    "暂无负向代表评论": "No negative representative comments",
    "暂无代表评论": "No representative comments",
    "评论样本": "Comment samples",
    "导出时间": "Export time",
    "纳入本次报告": "Included in this report",
    "占比": "Share",
    "条": "items",
    "条评论": "comments",
    "条相关评论": "related comments",
    "问题": "Issue",
    "相关评论": "Related comments",
    "证据样本": "Evidence samples",
    "整体": "Overall",
    "严重": "Critical",
    "词云": "Word cloud",
    "用户声音词云": "User voice word cloud",
    "观众支持度": "Audience support",
    "舆情支持度": "Public support",
    "满意度 NPS": "Satisfaction NPS",
    "推荐者与批评者净差": "Promoter and detractor net difference",
    "支持立场占比与反对/风险占比的净差": "Net difference between supportive stance and opposition/risk",
    "正向观众占比与负向争议占比的净差": "Net difference between positive viewers and negative/disputed viewers",
    "各星级情感倾向": "Sentiment by star rating",
    "按 1-5 星评价拆分推荐倾向": "Recommendation tendency split by 1-5 star ratings",
    "按情感与立场拆分支持、观望和争议": "Support, neutral, and dispute split by sentiment and stance",
    "正向占比": "Positive rate",
    "支持/扩散理由": "Support / spread reasons",
    "传播理由": "Spread reasons",
    "传播优势": "Spread strengths",
    "内容优势": "Content strengths",
    "核心理由": "Core reasons",
    "优势信号": "Advantage signals",
    "改进机会": "Improvement opportunities",
    "产品优势": "Product strengths",
    "销售卖点": "Sales points",
    "待改进点": "Improvements",
    "待优化点": "Optimization points",
    "风险与误解": "Risks and misunderstandings",
    "风险/回应类型": "Risk / response type",
    "高频问题类型": "Frequent issue types",
    "争议/澄清类型": "Dispute / clarification types",
    "回应期待": "Response expectations",
    "观众期待": "Audience expectations",
    "用户期待": "User expectations",
    "参与人群": "Participant groups",
    "观众画像": "Audience profile",
    "用户画像": "User profile",
    "观看场景": "Viewing scenarios",
    "使用场景": "Usage scenarios",
    "讨论场景": "Discussion scenarios",
    "内容类别分布": "Content category distribution",
    "话题": "Topic",
    "实体": "Entity",
    "分类": "Category",
    "提问": "Question",
    "玩梗": "Meme / joke",
    "搜索电商词": "Search commerce terms",
    "质量": "Quality",
    "价格": "Price",
    "物流": "Logistics",
    "快递": "Delivery",
    "发货": "Shipping",
    "包装": "Packaging",
    "客服": "Customer service",
    "售后": "After-sales",
    "保修": "Warranty",
    "退换": "Returns/exchanges",
    "数量": "Quantity",
    "立场": "Stance",
    "可放大的认可反馈": "Positive feedback to amplify",
    "需要运营跟进的低分反馈": "Low-score feedback needing operations follow-up",
    "需要澄清或复盘的观众反馈": "Audience feedback needing clarification or review",
    "需要回应或降风险的讨论": "Discussions needing response or risk reduction",
    "需要优先跟进的问题信号": "Issue signals needing priority follow-up",
    "查看高频词评论": "View high-frequency term comments",
    "查看主要意图": "View main intents",
    "查看动态标签": "View dynamic tags",
    "查看有效聚类": "View valid clusters",
    "查看正向评论": "View positive comments",
    "查看中性评论": "View neutral comments",
    "查看负向评论": "View negative comments",
    "查看重复证据": "View duplicate evidence",
    "行动项已创建。": "Action item created.",
    "请先选择分析任务。": "Select an analysis task first.",
    "负向评论": "Negative comments",
    "负向/争议观众": "Negative / disputed viewers",
    "反对/风险评论": "Opposition / risk comments"
  },
  "th-TH": {
    "队列一致性告警": "แจ้งเตือนความสอดคล้องของคิว",
    "排队对象": "เป้าหมายที่รอคิว",
    "队列": "คิว",
    "排队时间": "เวลารอคิว",
    "已排队": "รอคิวแล้ว",
    "数据库仍是排队中，但 BullMQ 待处理队列里没有对应采集 job": "สถานะในฐานข้อมูลยังเป็นรอคิว แต่ไม่พบ job เก็บข้อมูลที่ตรงกันในคิว BullMQ",
    "数据库仍是排队中，但 BullMQ 待处理队列里没有对应分析 job": "สถานะในฐานข้อมูลยังเป็นรอคิว แต่ไม่พบ job วิเคราะห์ที่ตรงกันในคิว BullMQ",
    "优先检查任务是否曾入队失败；确认后可在采集记录里重试，或停止该记录再重新采集": "ตรวจสอบก่อนว่างานเข้าคิวล้มเหลวหรือไม่ จากนั้นลองใหม่จากประวัติเก็บข้อมูล หรือหยุดรายการแล้วเก็บใหม่",
    "优先取消该分析批次，再重新发起分析，避免一直显示排队但 worker 无法消费": "ยกเลิกรอบวิเคราะห์นี้ก่อน แล้วเริ่มวิเคราะห์ใหม่ เพื่อไม่ให้ค้างเป็นรอคิวโดย worker รับงานไม่ได้",
    "补回队列": "กู้คืน job เข้าคิว",
    "队列 job 已补回": "กู้คืน job เข้าคิวแล้ว",
    "队列 job 已存在": "มี job ในคิวอยู่แล้ว",
    "暂停队列": "พักคิว",
    "恢复队列": "เปิดคิวต่อ",
    "队列已暂停": "พักคิวแล้ว",
    "队列已恢复": "เปิดคิวต่อแล้ว",
    "暂停队列失败": "พักคิวไม่สำเร็จ",
    "恢复队列失败": "เปิดคิวต่อไม่สำเร็จ",
    "待复核": "รอตรวจสอบ",
    "补回队列失败": "กู้คืน job เข้าคิวไม่สำเร็จ",
    "补回队列任务": "กู้คืน job เข้าคิว",
    "刷新": "รีเฟรช",
    "自动刷新": "รีเฟรชอัตโนมัติ",
    "手动刷新": "รีเฟรชด้วยตนเอง",
    "保存": "บันทึก",
    "取消": "ยกเลิก",
    "删除": "ลบ",
    "删除中": "กำลังลบ",
    "复制": "คัดลอก",
    "打开": "เปิด",
    "打开采集": "เปิดการเก็บข้อมูล",
    "更多": "เพิ่มเติม",
    "返回": "กลับ",
    "返回报告": "กลับไปรายงาน",
    "查看全部": "ดูทั้งหมด",
    "查看分析": "ดูการวิเคราะห์",
    "分析报告": "รายงานวิเคราะห์",
    "评论列表": "รายการคอมเมนต์",
    "分析日志": "บันทึกวิเคราะห์",
    "追加评论": "เพิ่มคอมเมนต์",
    "开始分析": "เริ่มวิเคราะห์",
    "新建分析": "สร้างการวิเคราะห์",
    "新建分析项目": "สร้างโปรเจกต์วิเคราะห์",
    "新建行动项": "สร้างงานติดตาม",
    "新建账号": "สร้างบัญชี",
    "新建空间": "สร้างพื้นที่",
    "新建监听": "สร้างการติดตาม",
    "一次采集": "เก็บครั้งเดียว",
    "立即运行": "รันทันที",
    "停止": "หยุด",
    "停止当前任务": "หยุดงานปัจจุบัน",
    "停止采集": "หยุดการเก็บข้อมูล",
    "停止分析": "หยุดการวิเคราะห์",
    "重试": "ลองใหม่",
    "重试当前批次": "ลองรอบปัจจุบันใหม่",
    "重新采集": "เก็บข้อมูลใหม่",
    "重新分析": "วิเคราะห์ใหม่",
    "下载浏览器插件": "ดาวน์โหลดส่วนขยายเบราว์เซอร์",
    "下载操作手册": "ดาวน์โหลดคู่มือ",
    "任务": "งาน",
    "任务名称": "ชื่องาน",
    "任务看板": "บอร์ดงาน",
    "任务总数": "งานทั้งหมด",
    "来源": "แหล่งที่มา",
    "来源渠道": "ช่องทางที่มา",
    "类型": "ประเภท",
    "分析类型": "ประเภทการวิเคราะห์",
    "导入状态": "สถานะนำเข้า",
    "分析状态": "สถานะวิเคราะห์",
    "创建时间": "เวลาสร้าง",
    "加入时间": "เวลาเข้าร่วม",
    "开始/结束": "เริ่ม / จบ",
    "操作": "การทำงาน",
    "状态": "สถานะ",
    "时间": "เวลา",
    "错误": "ข้อผิดพลาด",
    "进度": "ความคืบหน้า",
    "模型": "โมเดล",
    "服务商": "ผู้ให้บริการ",
    "速度": "ความเร็ว",
    "AI 标签": "แท็ก AI",
    "日志": "บันทึก",
    "实时日志": "บันทึกสด",
    "警告": "คำเตือน",
    "全部": "ทั้งหมด",
    "评论": "คอมเมนต์",
    "分析": "การวิเคราะห์",
    "无": "ไม่มี",
    "未知": "ไม่ทราบ",
    "未选择任务": "ยังไม่ได้เลือกงาน",
    "未设截止": "ยังไม่กำหนดกำหนดส่ง",
    "暂无说明": "ไม่มีคำอธิบาย",
    "暂无行动项": "ยังไม่มีงานติดตาม",
    "管理空间内所有任务，进入评论列表、分析报告，并查看实时分析日志。": "จัดการงานทั้งหมดใน workspace เปิดรายการคอมเมนต์และรายงานวิเคราะห์ และดูบันทึกวิเคราะห์แบบสด",
    "暂无日志，等待 worker 写入": "ยังไม่มีบันทึก รอ worker เขียนข้อมูล",
    "当前筛选下暂无日志": "ไม่มีบันทึกตามตัวกรองนี้",
    "该任务暂无分析批次": "งานนี้ยังไม่มีรอบวิเคราะห์",
    "请选择上方任务查看分析批次": "เลือกงานด้านบนเพื่อดูรอบวิเคราะห์",
    "选择任务后查看批次": "เลือกงานเพื่อดูรอบ",
    "选择任务后查看日志": "เลือกงานเพื่อดูบันทึก",
    "AI 分析运行观察": "ดูสถานะการวิเคราะห์ AI",
    "疑似无日志": "อาจไม่มีบันทึก",
    "活跃分析量": "ปริมาณวิเคราะห์ที่กำลังทำ",
    "失败占比": "อัตราล้มเหลว",
    "最近日志": "บันทึกล่าสุด",
    "暂无运行批次": "ไม่มีรอบที่กำลังทำงาน",
    "没有排队或分析批次": "ไม่มีรอบรอคิวหรือกำลังวิเคราะห์",
    "暂无运行中的分析批次": "ไม่มีรอบวิเคราะห์ที่กำลังทำงาน",
    "暂无分析批次": "ยังไม่มีรอบวิเคราะห์",
    "运行批次正常写入日志": "รอบที่กำลังทำงานเขียนบันทึกปกติ",
    "最长无日志": "ไม่มีบันทึกนานสุด",
    "任务仍在排队": "งานยังรอคิวอยู่",
    "如果长时间只有 queued 记录，且没有 Worker picked up analysis run，通常说明 worker 没有运行、Redis 队列未连通，或 worker 还没有消费到该任务。": "หากมีแต่บันทึก queued เป็นเวลานานและไม่มี Worker picked up analysis run มักหมายถึง worker ไม่ทำงาน Redis ไม่เชื่อมต่อ หรือ worker ยังไม่ได้รับงานนี้",
    "所属用户/空间": "เจ้าของ / workspace",
    "未设置负责人": "ยังไม่ได้ตั้งเจ้าของ",
    "推文评论": "คอมเมนต์โพสต์",
    "尚未分析": "ยังไม่ได้วิเคราะห์",
    "删除分析任务": "ลบงานวิเคราะห์",
    "评论、分析结果、报告分享和行动项都会被删除。": "คอมเมนต์ ผลวิเคราะห์ ลิงก์แชร์รายงาน และ action item จะถูกลบทั้งหมด",
    "分析任务已删除": "ลบงานวิเคราะห์แล้ว",
    "分析任务已加入队列": "เพิ่มงานวิเคราะห์เข้าคิวแล้ว",
    "已发送停止请求": "ส่งคำขอหยุดแล้ว",
    "请选择一个分析任务查看行动项": "เลือกงานวิเคราะห์เพื่อดูงานติดตาม",
    "帮助中心": "ศูนย์ช่วยเหลือ",
    "真实使用中常见的问题、处理建议和排错口径。适合用户自查，也适合管理员统一回复。": "รวมคำถามที่พบบ่อย วิธีจัดการ และแนวทางตรวจปัญหาจากการใช้งานจริง เหมาะทั้งผู้ใช้ตรวจเองและผู้ดูแลตอบให้เป็นมาตรฐาน",
    "使用前先确认": "ตรวจสอบก่อนใช้งาน",
    "链接公开可访问，分析类型一定选对，报告结论回到评论原文抽查验证。": "ลิงก์ต้องเปิดสาธารณะ เลือกประเภทวิเคราะห์ให้ถูก และตรวจข้อสรุปรายงานกับคอมเมนต์ต้นฉบับ",
    "大多数用户问题都可以先按这三步判断：链接是否可采、任务类型是否匹配、AI 结论是否有原始评论证据。": "ปัญหาส่วนใหญ่ตรวจได้จาก 3 ขั้นตอน: ลิงก์เก็บได้หรือไม่ ประเภทงานตรงหรือไม่ และข้อสรุป AI มีหลักฐานจากคอมเมนต์ต้นฉบับหรือไม่",
    "用户可能会问到的问题": "คำถามที่ผู้ใช้อาจถาม",
    "搜索问题或答案": "ค้นหาคำถามหรือคำตอบ",
    "没有匹配的问题，换个关键词试试。": "ไม่พบคำถามที่ตรงกัน ลองเปลี่ยนคำค้น",
    "账号权限": "สิทธิ์บัญชี",
    "普通用户为什么看不到模型设置、抓取设置？": "ทำไมผู้ใช้ทั่วไปจึงไม่เห็นการตั้งค่าโมเดลหรือการเก็บข้อมูล?",
    "这是正常的。普通用户只负责采集、分析、查看报告和复核评论；模型、提示词、抓取参数由超管统一配置，避免不同用户配置不一致导致结果混乱。": "เป็นเรื่องปกติ ผู้ใช้ทั่วไปดูแลการเก็บข้อมูล วิเคราะห์ ดูรายงาน และตรวจคอมเมนต์ ส่วนโมเดล พรอมป์ และพารามิเตอร์เก็บข้อมูลให้ผู้ดูแลตั้งค่ารวม เพื่อลดผลลัพธ์ที่ไม่สอดคล้องกัน",
    "我能不能自己改 AI 分析规则？": "ฉันแก้กฎวิเคราะห์ AI เองได้ไหม?",
    "普通用户不能直接修改。如果发现分析结果明显不符合业务，比如视频评论被当成商品评论分析，需要把任务名称、链接和截图反馈给管理员，由管理员统一调整提示词或模型配置。": "ผู้ใช้ทั่วไปแก้โดยตรงไม่ได้ หากผลวิเคราะห์ไม่ตรงงาน เช่น คอมเมนต์วิดีโอถูกวิเคราะห์แบบรีวิวสินค้า ให้ส่งชื่องาน ลิงก์ และภาพหน้าจอให้ผู้ดูแลปรับพรอมป์หรือโมเดลกลาง",
    "首页的评论额度和分析次数是什么意思？": "โควตาคอมเมนต์และจำนวนวิเคราะห์ในหน้าแรกหมายถึงอะไร?",
    "评论额度表示当前周期内可以采集或处理的评论数量，分析次数表示可以发起 AI 分析的次数。额度不足时需要联系管理员调整。": "โควตาคอมเมนต์คือจำนวนคอมเมนต์ที่เก็บหรือประมวลผลได้ในรอบปัจจุบัน จำนวนวิเคราะห์คือจำนวนครั้งที่เริ่ม AI analysis ได้ หากโควตาไม่พอให้ติดต่อผู้ดูแล",
    "我看到的数据是不是所有人的数据？": "ข้อมูลที่เห็นเป็นข้อมูลของทุกคนหรือไม่?",
    "通常只看到当前账号或当前工作区的数据。不同工作区之间的数据会隔离，具体范围由管理员配置。": "โดยทั่วไปจะเห็นเฉพาะข้อมูลของบัญชีหรือ workspace ปัจจุบัน ข้อมูลระหว่าง workspace แยกกัน และผู้ดูแลเป็นผู้กำหนดขอบเขต",
    "一次性采集和持续监听有什么区别？": "การเก็บครั้งเดียวกับการติดตามต่อเนื่องต่างกันอย่างไร?",
    "一次性采集适合临时分析某条视频或链接；持续监听适合长期跟踪同一条视频的新评论，比如新品发布、投放视频、舆情内容。": "การเก็บครั้งเดียวเหมาะกับการวิเคราะห์วิดีโอหรือลิงก์แบบชั่วคราว ส่วนการติดตามต่อเนื่องเหมาะกับการติดตามคอมเมนต์ใหม่ระยะยาว เช่น เปิดตัวสินค้า วิดีโอโฆษณา หรือประเด็นกระแส",
    "最多采集条数填多少合适？": "ควรใส่จำนวนเก็บสูงสุดเท่าไร?",
    "首次使用或不确定链接质量时，建议先填 100 到 300 条，确认链接、来源渠道和分析类型都没问题后再加大。填 0 通常表示不限制，但实际数量仍受平台加载、网络、超时和抓取策略影响。": "ครั้งแรกหรือยังไม่แน่ใจคุณภาพลิงก์ แนะนำเริ่ม 100 ถึง 300 รายการ เมื่อยืนยันลิงก์ ช่องทาง และประเภทวิเคราะห์ถูกต้องแล้วค่อยเพิ่ม ใส่ 0 มักหมายถึงไม่จำกัด แต่จำนวนจริงยังขึ้นกับการโหลดแพลตฟอร์ม เครือข่าย timeout และกลยุทธ์เก็บข้อมูล",
    "为什么视频明明有很多评论，只采集到一部分？": "ทำไมวิดีโอมีคอมเมนต์เยอะแต่เก็บได้แค่บางส่วน?",
    "常见原因是平台分页加载、评论排序、网络超时、评论需要登录、单次采集上限过低，或者平台限制。可以提高采集条数、重试，或用持续监听分批采集。": "สาเหตุที่พบบ่อยคือแพลตฟอร์มโหลดแบบแบ่งหน้า การเรียงคอมเมนต์ เครือข่าย timeout ต้องล็อกอิน ขีดจำกัดต่อครั้งต่ำ หรือข้อจำกัดแพลตฟอร์ม ลองเพิ่มจำนวน retry หรือใช้การติดตามต่อเนื่องเพื่อเก็บเป็นชุด",
    "提示“未采集到评论”怎么办？": "ถ้าขึ้นว่าไม่ได้เก็บคอมเมนต์ควรทำอย่างไร?",
    "先用浏览器打开链接，确认评论区公开可见、链接没有填错、来源渠道选择正确。如果页面能看到评论但系统仍采不到，再让管理员看抓取日志和服务器网络。": "เปิดลิงก์ในเบราว์เซอร์ก่อน ตรวจว่าคอมเมนต์เปิดสาธารณะ ลิงก์ไม่ผิด และเลือกช่องทางถูก หากหน้าเว็บเห็นคอมเมนต์แต่ระบบยังเก็บไม่ได้ ให้ผู้ดูแลตรวจ log การเก็บและเครือข่ายเซิร์ฟเวอร์",
    "采集任务一直排队怎么办？": "ถ้างานเก็บข้อมูลค้างอยู่ในคิวทำอย่างไร?",
    "可能是前面还有任务、Worker 没启动、服务器繁忙或抓取服务异常。普通用户先不要重复创建太多任务，超过几分钟没变化就联系管理员。": "อาจมีงานก่อนหน้า worker ไม่ทำงาน เซิร์ฟเวอร์ยุ่ง หรือบริการเก็บข้อมูลผิดปกติ ผู้ใช้ทั่วไปไม่ควรสร้างงานซ้ำหลายงาน หากหลายนาทีแล้วยังไม่เปลี่ยนให้ติดต่อผู้ดูแล",
    "采集失败后应该重试还是删除？": "เก็บข้อมูลล้มเหลวควรลองใหม่หรือลบ?",
    "网络波动、临时超时、平台加载失败适合重试；链接填错、任务建错、内容不再需要适合删除。删除前要看确认弹窗，确认任务名称和影响范围。": "ถ้าเครือข่ายแกว่ง timeout ชั่วคราว หรือแพลตฟอร์มโหลดไม่สำเร็จ เหมาะกับการลองใหม่ หากลิงก์ผิด สร้างงานผิด หรือไม่ต้องใช้แล้วเหมาะกับการลบ ก่อนลบควรอ่านหน้าต่างยืนยัน ชื่องาน และผลกระทบ",
    "持续监听": "ติดตามต่อเนื่อง",
    "监听任务创建后切换页面再回来还在吗？": "สร้างงานติดตามแล้วสลับหน้า กลับมายังอยู่ไหม?",
    "应该还在。监听任务是保存到系统里的，不应该因为切换页面消失。如果刷新后仍看不到，要联系管理员检查接口或数据库记录。": "ควรยังอยู่ งานติดตามถูกบันทึกในระบบ ไม่ควรหายเพราะสลับหน้า หากรีเฟรชแล้วยังไม่เห็น ให้ผู้ดูแลตรวจ API หรือข้อมูลฐานข้อมูล",
    "监听任务会不会自动分析？": "งานติดตามจะวิเคราะห์อัตโนมัติหรือไม่?",
    "看创建时是否开启“自动分析”。开启后每次采集完成会自动进入分析流程；关闭时需要人工确认评论数量后再手动分析。": "ขึ้นกับตอนสร้างว่าเปิดวิเคราะห์อัตโนมัติหรือไม่ หากเปิดไว้ ทุกครั้งที่เก็บเสร็จจะเข้าสู่การวิเคราะห์อัตโนมัติ หากปิดไว้ต้องตรวจจำนวนคอมเมนต์แล้วเริ่มเอง",
    "监听频率怎么设置比较合适？": "ควรตั้งความถี่การติดตามอย่างไร?",
    "热点内容可以更频繁，比如每 1 到 6 小时；普通内容可以每天或每几天一次。频率太高会消耗额度，也可能增加平台访问压力。": "เนื้อหาที่เป็นกระแสตั้งถี่ได้ เช่น ทุก 1 ถึง 6 ชั่วโมง เนื้อหาทั่วไปวันละครั้งหรือหลายวันครั้งก็พอ ความถี่สูงเกินไปใช้โควตาและเพิ่มแรงกดดันต่อแพลตฟอร์ม",
    "删除监听任务会删除历史分析吗？": "ลบงานติดตามจะลบผลวิเคราะห์ย้อนหลังไหม?",
    "通常删除的是监听配置，不一定删除历史采集记录和分析任务。实际以删除确认弹窗提示为准。": "โดยทั่วไปลบเฉพาะการตั้งค่าติดตาม ไม่จำเป็นต้องลบประวัติเก็บข้อมูลหรือวิเคราะห์ ให้ยึดข้อความยืนยันการลบเป็นหลัก",
    "为什么 AI 分析比较慢？": "ทำไม AI วิเคราะห์ช้า?",
    "评论越多，分析越耗时。几千到几万条评论会受模型服务、并发额度、网络和服务器性能影响。建议先小样本验证，再分批处理大任务。": "คอมเมนต์ยิ่งมากยิ่งใช้เวลาวิเคราะห์ งานหลักพันถึงหลักหมื่นขึ้นกับบริการโมเดล โควตา concurrency เครือข่าย และประสิทธิภาพเซิร์ฟเวอร์ แนะนำทดสอบชุดเล็กก่อน แล้วค่อยแบ่งชุดงานใหญ่",
    "评论很多时怎么提高效率？": "ถ้ามีคอมเมนต์มากจะเพิ่มประสิทธิภาพอย่างไร?",
    "先采集一小批看方向是否正确，再扩大数量；大任务尽量分批，不要重复创建多个相同分析；持续监听适合长期增量采集。": "เก็บชุดเล็กก่อนเพื่อดูทิศทาง แล้วค่อยเพิ่มจำนวน งานใหญ่ควรแบ่งชุด ไม่สร้างวิเคราะห์ซ้ำหลายงาน และใช้การติดตามต่อเนื่องสำหรับเก็บเพิ่มระยะยาว",
    "为什么 YouTube 视频评论分析结果像商品评论？": "ทำไมผลวิเคราะห์คอมเมนต์ YouTube เหมือนรีวิวสินค้า?",
    "通常是分析类型选错，或者提示词配置偏商品评论。视频类评论要选择“视频类评论”，重点看观点、态度、争议点、内容反馈和传播效果，不是物流、包装、售后这些电商维度。": "มักเกิดจากเลือกประเภทวิเคราะห์ผิด หรือพรอมป์เอนไปทางรีวิวสินค้า คอมเมนต์วิดีโอควรเลือกประเภทวิดีโอ โดยดูความคิดเห็น ท่าที ประเด็นถกเถียง feedback ต่อเนื้อหา และผลการแพร่กระจาย ไม่ใช่มิติ logistics packaging หรือบริการหลังขาย",
    "为什么结果全是负向，NPS 一直是 0？": "ทำไมผลเป็นลบทั้งหมดและ NPS เป็น 0 ตลอด?",
    "可能是样本本身偏负向，也可能是分析规则过度把争议、调侃、中性讨论判成负向。先抽查原始评论，再检查分析类型和提示词配置。": "อาจเป็นเพราะตัวอย่างลบจริง หรือกฎวิเคราะห์ตีความข้อถกเถียง มุก หรือความเห็นกลางเป็นลบมากเกินไป ให้สุ่มดูคอมเมนต์ต้นฉบับก่อน แล้วตรวจประเภทวิเคราะห์และพรอมป์",
    "AI 分析结果能不能完全直接用？": "ใช้ผลวิเคราะห์ AI ได้ทันทีทั้งหมดไหม?",
    "不建议完全不复核。AI 报告适合快速发现趋势和重点，但对外汇报前要回到评论明细抽查原文，确认结论有评论证据支撑。": "ไม่แนะนำให้ใช้โดยไม่ตรวจ AI report เหมาะกับการหาแนวโน้มและประเด็นเร็ว แต่ก่อนรายงานภายนอกควรกลับไปสุ่มตรวจคอมเมนต์ต้นฉบับเพื่อยืนยันว่าข้อสรุปมีหลักฐานรองรับ",
    "分析失败怎么看原因？": "ถ้าวิเคราะห์ล้มเหลวดูสาเหตุอย่างไร?",
    "进入分析记录，看日志筛选。先切到“错误”，再看是否是模型返回异常、额度不足、评论数据异常或网络问题。": "เข้าไปที่ประวัติวิเคราะห์แล้วดูตัวกรอง log เริ่มจากข้อผิดพลาด จากนั้นดูว่าเป็นโมเดลตอบผิดปกติ โควตาไม่พอ ข้อมูลคอมเมนต์ผิดปกติ หรือปัญหาเครือข่าย",
    "报告复核": "ตรวจรายงาน",
    "报告里的 NPS 应该怎么理解？": "ควรเข้าใจ NPS ในรายงานอย่างไร?",
    "NPS 是整体推荐或态度倾向指标。商品评论偏购买推荐，视频评论更偏内容认可、观看体验和态度倾向，不能机械套用电商口径。": "NPS เป็นตัวชี้วัดแนวโน้มการแนะนำหรือท่าทีโดยรวม รีวิวสินค้าจะใกล้กับการแนะนำซื้อ ส่วนคอมเมนต์วิดีโอใกล้กับการยอมรับเนื้อหา ประสบการณ์ดู และท่าที จึงไม่ควรใช้กรอบ e-commerce แบบตายตัว",
    "用户声音是什么？": "เสียงของผู้ใช้คืออะไร?",
    "用户声音是评论里反复出现的观点、需求、痛点、关注点或争议点。它不是单纯关键词堆砌，而是帮助判断用户真正关心什么。": "เสียงของผู้ใช้คือความคิดเห็น ความต้องการ pain point สิ่งที่สนใจ หรือข้อถกเถียงที่ปรากฏซ้ำในคอมเมนต์ ไม่ใช่แค่รวม keyword แต่ช่วยบอกว่าผู้ใช้สนใจอะไรจริงๆ",
    "报告结论不准怎么办？": "ถ้าข้อสรุปรายงานไม่แม่นทำอย่างไร?",
    "先到评论明细抽查原文，看是样本问题、采集不完整、分析类型错误，还是提示词需要调整。确认后把任务和截图反馈给管理员。": "ไปที่รายละเอียดคอมเมนต์แล้วสุ่มดูต้นฉบับก่อน ดูว่าเป็นปัญหาตัวอย่าง เก็บไม่ครบ เลือกประเภทผิด หรือพรอมป์ต้องปรับ จากนั้นส่งงานและภาพหน้าจอให้ผู้ดูแล",
    "找不到评分、媒体、来源这些筛选条件？": "หา filter คะแนน สื่อ หรือแหล่งที่มาไม่เจอ?",
    "新版界面把低频筛选放进“更多筛选”抽屉。评论明细页点击“更多筛选”，可以看到评分、是否含媒体、来源渠道、分组和展示列等条件。": "หน้าจอใหม่ใส่ filter ที่ใช้น้อยไว้ในลิ้นชักตัวกรองเพิ่มเติม ที่หน้ารายละเอียดคอมเมนต์ให้คลิกตัวกรองเพิ่มเติม จะเห็นคะแนน มีสื่อหรือไม่ ช่องทางแหล่งที่มา การจัดกลุ่ม และคอลัมน์ที่แสดง",
    "评论可以导出吗？": "ส่งออกคอมเมนต์ได้ไหม?",
    "可以按当前筛选结果导出，用于报告证据、人工复核或二次分析。对外分享前要注意敏感内容和隐私信息。": "ได้ สามารถส่งออกผลตามตัวกรองปัจจุบันเพื่อเป็นหลักฐานรายงาน ตรวจด้วยคน หรือวิเคราะห์ต่อ ก่อนแชร์ภายนอกควรตรวจเนื้อหาอ่อนไหวและข้อมูลส่วนตัว",
    "移动端": "มือถือ",
    "手机端和电脑端为什么界面不一样？": "ทำไมหน้าจอมือถือกับคอมพิวเตอร์ไม่เหมือนกัน?",
    "系统会识别当前设备。电脑端适合复杂操作和大表格，手机端更适合查看状态、刷新任务、快速看报告和轻量复核。": "ระบบจะตรวจอุปกรณ์ปัจจุบัน คอมพิวเตอร์เหมาะกับงานซับซ้อนและตารางใหญ่ มือถือเหมาะกับดูสถานะ รีเฟรชงาน ดูรายงานเร็ว และตรวจเบาๆ",
    "手机端能不能完成所有操作？": "มือถือทำงานทั้งหมดได้ไหม?",
    "大部分轻量操作可以完成，但复杂筛选、大量评论复核、批量导出和后台管理更建议在电脑端操作。": "งานเบาส่วนใหญ่ทำได้ แต่การกรองซับซ้อน ตรวจคอมเมนต์จำนวนมาก ส่งออกเป็นชุด และงานผู้ดูแล แนะนำใช้คอมพิวเตอร์",
    "手机端评论为什么变成卡片？": "ทำไมคอมเมนต์บนมือถือกลายเป็นการ์ด?",
    "这是为了适配小屏幕。评论明细在手机上用卡片和分页展示，避免宽表格横向拖动太多。": "เพื่อให้เหมาะกับหน้าจอเล็ก รายละเอียดคอมเมนต์บนมือถือใช้การ์ดและแบ่งหน้า เพื่อลดการลากตารางแนวนอน",
    "数据安全": "ความปลอดภัยข้อมูล",
    "删除任务后能恢复吗？": "ลบงานแล้วกู้คืนได้ไหม?",
    "通常不能恢复。删除采集记录、监听任务或分析任务前一定要看确认弹窗，确认不再需要后再删除。": "โดยทั่วไปกู้คืนไม่ได้ ก่อนลบประวัติเก็บข้อมูล งานติดตาม หรืองานวิเคราะห์ ต้องอ่านหน้าต่างยืนยันและลบเมื่อแน่ใจว่าไม่ต้องใช้แล้ว",
    "对外汇报能直接截图系统报告吗？": "สามารถแคปหน้าจอรายงานระบบไปนำเสนอภายนอกได้ไหม?",
    "可以，但建议先检查是否包含敏感评论、用户信息、内部任务名称或未确认结论。重要报告最好先做人工复核。": "ได้ แต่ควรตรวจว่ามีคอมเมนต์อ่อนไหว ข้อมูลผู้ใช้ ชื่องานภายใน หรือข้อสรุปที่ยังไม่ยืนยันหรือไม่ รายงานสำคัญควรตรวจด้วยคนก่อน",
    "同一个链接能不能多次分析？": "ลิงก์เดียวกันวิเคราะห์หลายครั้งได้ไหม?",
    "可以，但不建议无意义重复。重复分析会消耗额度，也可能让列表里出现多个相似任务。需要对比不同时间段时，建议用清晰的任务名称区分。": "ได้ แต่ไม่แนะนำให้ทำซ้ำโดยไม่มีเหตุผล เพราะใช้โควตาและอาจสร้างงานคล้ายกันหลายรายการ หากต้องเปรียบเทียบคนละช่วงเวลา ควรตั้งชื่องานให้ชัด",
    "真实使用中最重要的注意事项是什么？": "ข้อควรระวังที่สำคัญที่สุดในการใช้งานจริงคืออะไร?",
    "三句话：链接要公开可访问；分析类型一定要选对；报告结论要回到评论原文抽查验证。": "สามข้อ: ลิงก์ต้องเปิดสาธารณะ เลือกประเภทวิเคราะห์ให้ถูก และตรวจข้อสรุปรายงานกับคอมเมนต์ต้นฉบับ",
    "问题清单": "รายการคำถาม",
    "覆盖模块": "โมดูลที่ครอบคลุม",
    "适用对象": "เหมาะสำหรับ",
    "普通用户 / 超管": "ผู้ใช้ทั่วไป / ผู้ดูแล",
    "用户后台": "คอนโซลผู้ใช้",
    "超管后台": "คอนโซลผู้ดูแล",
    "管理平台注册入口、普通用户配额和超管账号。普通用户后台只保留分析任务与个人设置。": "จัดการช่องทางสมัคร โควตาผู้ใช้ทั่วไป และบัญชีผู้ดูแล ส่วนคอนโซลผู้ใช้ทั่วไปจะแสดงเฉพาะงานวิเคราะห์และการตั้งค่าส่วนตัว",
    "增长运营": "ปฏิบัติการเติบโต",
    "评论采集": "เก็บคอมเมนต์",
    "分析记录": "ประวัติวิเคราะห์",
    "提示词与模型": "พรอมป์และโมเดล",
    "抓取设置": "ตั้งค่าการเก็บข้อมูล",
    "评论明细": "รายละเอียดคอมเมนต์",
    "筛选、分组、保存视图，并把 AI 分析结果沉淀为团队可复用的评论视图。": "กรอง จัดกลุ่ม บันทึกมุมมอง และเปลี่ยนผลวิเคราะห์ AI ให้เป็นมุมมองคอมเมนต์ที่ทีมใช้ซ้ำได้",
    "刷新状态": "รีเฟรชสถานะ",
    "发起分析": "เริ่มวิเคราะห์",
    "清除筛选": "ล้างตัวกรอง",
    "默认": "ค่าเริ่มต้น",
    "临时视图": "มุมมองชั่วคราว",
    "筛选结果": "ผลลัพธ์หลังกรอง",
    "当前载入": "โหลดปัจจุบัน",
    "带媒体评论": "คอมเมนต์พร้อมสื่อ",
    "筛选条件": "เงื่อนไขตัวกรอง",
    "有图/视频": "มีรูป/วิดีโอ",
    "纯文本": "ข้อความล้วน",
    "视图方式": "รูปแบบมุมมอง",
    "按情感分组": "จัดกลุ่มตามความรู้สึก",
    "按星级分组": "จัดกลุ่มตามดาว",
    "按 AI 标签分组": "จัดกลุ่มตามแท็ก AI",
    "按评论意图分组": "จัดกลุ่มตามเจตนาคอมเมนต์",
    "显示列": "คอลัมน์ที่แสดง",
    "视图操作": "การทำงานของมุมมอง",
    "应用筛选": "ใช้ตัวกรอง",
    "保存视图": "บันทึกมุมมอง",
    "导出当前结果": "ส่งออกผลลัพธ์ปัจจุบัน",
    "设为默认": "ตั้งเป็นค่าเริ่มต้น",
    "转为行动项": "แปลงเป็นงานติดตาม",
    "更多筛选与视图": "ตัวกรองและมุมมองเพิ่มเติม",
    "保存筛选视图": "บันทึกมุมมองตัวกรอง",
    "视图名称": "ชื่อมุมมอง",
    "请输入视图名称。": "กรุณากรอกชื่อมุมมอง",
    "视图已保存。": "บันทึกมุมมองแล้ว",
    "默认视图已更新。": "อัปเดตมุมมองเริ่มต้นแล้ว",
    "请先选择一个已保存视图。": "กรุณาเลือกมุมมองที่บันทึกไว้ก่อน",
    "评论详情": "รายละเอียดคอมเมนต์",
    "评论 ID": "ID คอมเมนต์",
    "评论ID": "ID คอมเมนต์",
    "编号": "ลำดับ",
    "表格": "ตาราง",
    "商品名称": "ชื่อสินค้า",
    "用户评价": "รีวิวผู้ใช้",
    "评级": "คะแนน",
    "星级": "ดาว",
    "星级情感": "ความรู้สึกตามดาว",
    "情感": "ความรู้สึก",
    "情感筛选": "ตัวกรองความรู้สึก",
    "AI 情感": "ความรู้สึก AI",
    "AI 摘要": "สรุป AI",
    "评论意图": "เจตนาคอมเมนต์",
    "未识别意图": "ยังไม่พบเจตนา",
    "评论来源": "แหล่งคอมเมนต์",
    "渠道": "ช่องทาง",
    "全部评论": "คอมเมนต์ทั้งหมด",
    "关键词或标签": "คีย์เวิร์ดหรือแท็ก",
    "动态标签": "แท็กไดนามิก",
    "观点聚类": "กลุ่มความคิดเห็น",
    "分组": "กลุ่ม",
    "规格": "สเปก",
    "规格/颜色": "สเปก / สี",
    "媒体": "สื่อ",
    "有": "มี",
    "未打标": "ยังไม่ติดแท็ก",
    "重复评论": "คอมเมนต์ซ้ำ",
    "问题点": "ประเด็นปัญหา",
    "问题证据": "หลักฐานปัญหา",
    "翻译评论": "แปลคอมเมนต์",
    "例如：负向问题评论 / 5 星好评 / 带图评论": "เช่น: คอมเมนต์ปัญหาเชิงลบ / รีวิว 5 ดาว / คอมเมนต์พร้อมรูป",
    "先创建分析项目并导入评论 CSV": "สร้างโปรเจกต์วิเคราะห์และนำเข้า CSV คอมเมนต์ก่อน",
    "分析任务已提交，系统会自动轮询状态。": "ส่งงานวิเคราะห์แล้ว ระบบจะตรวจสถานะอัตโนมัติ",
    "发起分析失败。": "เริ่มวิเคราะห์ไม่สำเร็จ",
    "分析已完成，列表已刷新。": "วิเคราะห์เสร็จแล้ว รีเฟรชรายการแล้ว",
    "分析已停止。": "หยุดการวิเคราะห์แล้ว",
    "停止分析失败，请稍后重试。": "หยุดวิเคราะห์ไม่สำเร็จ กรุณาลองใหม่ภายหลัง",
    "已创建行动项。": "สร้าง action item แล้ว",
    "导出失败，当前筛选条件可能没有评论。": "ส่งออกไม่สำเร็จ ตัวกรองปัจจุบันอาจไม่มีคอมเมนต์",
    "数据": "ข้อมูล",
    "平台管理": "จัดการแพลตฟอร์ม",
    "模型与抓取": "โมเดลและการเก็บข้อมูล",
    "评论采集控制台": "คอนโซลเก็บคอมเมนต์",
    "把 Shopee、YouTube、TikTok、Facebook 评论变成可持续监听的数据流，新评论自动入库、自动分析，任务状态一眼可见。": "เปลี่ยนคอมเมนต์จาก Shopee, YouTube, TikTok และ Facebook ให้เป็นสายข้อมูลที่ติดตามต่อเนื่อง คอมเมนต์ใหม่จะนำเข้าและวิเคราะห์อัตโนมัติ พร้อมเห็นสถานะงานได้ทันที",
    "分析任务": "งานวิเคราะห์",
    "全部任务列表": "รายการงานทั้งหมด",
    "持续监听任务": "งานติดตามต่อเนื่อง",
    "采集记录": "ประวัติการเก็บข้อมูล",
    "采集运行观察": "ดูสถานะการเก็บข้อมูล",
    "目标上限": "ขีดจำกัดเป้าหมาย",
    "已抓取": "เก็บได้แล้ว",
    "平台总量": "ทั้งหมดบนแพลตฟอร์ม",
    "平台剩余": "เหลือบนแพลตฟอร์ม",
    "未覆盖评论": "คอมเมนต์ที่ยังไม่ครอบคลุม",
    "当前页暂无覆盖缺口": "หน้านี้ไม่มีช่องว่างความครอบคลุม",
    "重复跳过": "ข้ามรายการซ้ำ",
    "疑似无更新": "อาจไม่มีอัปเดต",
    "活跃采集量": "ปริมาณที่กำลังเก็บ",
    "当前速度": "ความเร็วปัจจุบัน",
    "最近活动": "กิจกรรมล่าสุด",
    "运行任务正常更新": "งานที่กำลังทำงานอัปเดตปกติ",
    "暂无运行中的采集任务": "ไม่มีงานเก็บข้อมูลที่กำลังทำงาน",
    "暂无运行任务": "ไม่มีงานที่กำลังทำงาน",
    "没有排队或抓取任务": "ไม่มีงานรอคิวหรือกำลังเก็บ",
    "等待采集器回传速度": "รอตัวเก็บข้อมูลส่งความเร็วกลับมา",
    "暂无采集记录": "ยังไม่มีประวัติการเก็บข้อมูล",
    "最长静默": "เงียบนานสุด",
    "监听任务": "งานติดตาม",
    "会按设定频率自动抓取并分析": "เก็บและวิเคราะห์อัตโนมัติตามความถี่ที่ตั้งไว้",
    "正在排队或抓取的采集任务": "งานเก็บข้อมูลที่รอคิวหรือกำลังเก็บ",
    "已采集评论": "คอมเมนต์ที่เก็บแล้ว",
    "来自当前账号下的采集记录": "จากประวัติการเก็บข้อมูลของบัญชีปัจจุบัน",
    "待处理异常": "ปัญหาที่ต้องจัดการ",
    "需要检查链接、网络代理或平台限制": "ต้องตรวจลิงก์ proxy เครือข่าย หรือข้อจำกัดแพลตฟอร์ม",
    "运行中": "กำลังทำงาน",
    "监听对象": "เป้าหมายติดตาม",
    "频率": "ความถี่",
    "最近运行": "รันล่าสุด",
    "新建持续监听": "สร้างการติดตามต่อเนื่อง",
    "创建监听": "สร้างการติดตาม",
    "监听名称": "ชื่อการติดตาม",
    "内容名称": "ชื่อเนื้อหา",
    "视频链接": "ลิงก์วิดีโอ",
    "每次最多采集": "จำนวนสูงสุดต่อครั้ง",
    "监听频率": "ความถี่การติดตาม",
    "自动处理": "การทำงานอัตโนมัติ",
    "采集后自动分析": "วิเคราะห์อัตโนมัติหลังเก็บข้อมูล",
    "只采集不分析": "เก็บอย่างเดียว",
    "启用": "เปิดใช้",
    "暂停": "พัก",
    "自动分析": "วิเคราะห์อัตโนมัติ",
    "仅采集": "เก็บอย่างเดียว",
    "还没有持续监听任务": "ยังไม่มีงานติดตามต่อเนื่อง",
    "创建第一个监听任务": "สร้างงานติดตามแรก",
    "新建一次性采集": "สร้างการเก็บครั้งเดียว",
    "开始采集": "เริ่มเก็บข้อมูล",
    "最多采集条数": "จำนวนคอมเมนต์สูงสุด",
    "不限": "ไม่จำกัด",
    "评论采集已关闭": "ปิดการเก็บคอมเมนต์อยู่",
    "评论链接": "ลิงก์คอมเมนต์",
    "例如：竞品 TikTok 视频舆情监听": "เช่น: ติดตามกระแสวิดีโอ TikTok ของคู่แข่ง",
    "例如：新品发布 YouTube 评论采集": "เช่น: เก็บคอมเมนต์ YouTube สำหรับสินค้าใหม่",
    "可选，默认使用视频标题或链接": "ไม่บังคับ ค่าเริ่มต้นใช้ชื่อวิดีโอหรือลิงก์",
    "可选，留空时会尽量从页面标题识别": "ไม่บังคับ หากเว้นว่างจะพยายามอ่านจากชื่อหน้า",
    "支持 Shopee 商品、YouTube 视频、TikTok 视频、Facebook 帖子/图片/Reel 链接": "รองรับสินค้า Shopee, วิดีโอ YouTube, วิดีโอ TikTok และลิงก์โพสต์/รูปภาพ/Reel ของ Facebook",
    "填 0 表示不限，直到平台没有更多评论或采集超时。": "ใส่ 0 หมายถึงไม่จำกัด จนกว่าแพลตฟอร์มไม่มีคอมเมนต์เพิ่มหรือหมดเวลา",
    "建议从 6 小时起步，高频任务更容易触发平台限制。": "แนะนำเริ่มที่ 6 ชั่วโมง งานถี่เกินไปอาจกระตุ้นข้อจำกัดแพลตฟอร์ม",
    "填 0 表示不限；采集完成后会自动导入并启动 AI 分析。": "ใส่ 0 หมายถึงไม่จำกัด หลังเก็บเสร็จจะนำเข้าและเริ่มวิเคราะห์ AI อัตโนมัติ",
    "部分采集数据刷新失败，已保留上一次成功加载的记录。": "ข้อมูลเก็บบางส่วนรีเฟรชไม่สำเร็จ ระบบเก็บรายการที่โหลดสำเร็จครั้งล่าสุดไว้",
    "已导入评论并加入分析队列": "นำเข้าคอมเมนต์และเพิ่มเข้าคิววิเคราะห์แล้ว",
    "已重新加入采集队列": "เพิ่มกลับเข้าคิวเก็บข้อมูลแล้ว",
    "采集记录已删除": "ลบบันทึกการเก็บข้อมูลแล้ว",
    "删除采集记录": "ลบบันทึกการเก็บข้อมูล",
    "已生成的分析任务不会被删除。": "งานวิเคราะห์ที่สร้างแล้วจะไม่ถูกลบ",
    "评论采集已在抓取设置中关闭。": "การเก็บคอมเมนต์ถูกปิดในตั้งค่าตัวเก็บข้อมูล",
    "请填写采集任务名称。": "กรุณากรอกชื่องานเก็บข้อมูล",
    "请填写监听任务名称。": "กรุณากรอกชื่องานติดตาม",
    "请填写评论链接。": "กรุณากรอกลิงก์คอมเมนต์",
    "评论采集已加入队列，完成后会自动导入并启动 AI 分析。": "เพิ่มงานเก็บคอมเมนต์เข้าคิวแล้ว เมื่อเสร็จจะนำเข้าและเริ่มวิเคราะห์ AI อัตโนมัติ",
    "监听任务已创建，系统会自动发起首次采集。": "สร้างงานติดตามแล้ว ระบบจะเริ่มเก็บครั้งแรกอัตโนมัติ",
    "监听任务已启用": "เปิดใช้งานติดตามแล้ว",
    "监听任务已暂停": "พักงานติดตามแล้ว",
    "已加入采集队列。": "เพิ่มเข้าคิวเก็บข้อมูลแล้ว",
    "监听任务已删除": "ลบงานติดตามแล้ว",
    "请先在用户后台的抓取设置中启用评论采集，然后再创建监听任务或一次性采集任务。": "เปิดการเก็บคอมเมนต์ในตั้งค่าตัวเก็บข้อมูลก่อนสร้างงานติดตามหรืองานเก็บครั้งเดียว",
    "切到运行中筛选查看详情": "สลับไปตัวกรองกำลังทำงานเพื่อดูรายละเอียด",
    "每 30 分钟": "ทุก 30 นาที",
    "每 1 小时": "ทุก 1 ชั่วโมง",
    "每 3 小时": "ทุก 3 ชั่วโมง",
    "每 6 小时": "ทุก 6 ชั่วโมง",
    "每 12 小时": "ทุก 12 ชั่วโมง",
    "每天": "ทุกวัน",
    "是": "ใช่",
    "否": "ไม่ใช่",
    "已分析": "วิเคราะห์แล้ว",
    "YouTube 视频": "วิดีโอ YouTube",
    "TikTok 视频": "วิดีโอ TikTok",
    "Facebook 评论": "คอมเมนต์ Facebook",
    "YouTube 视频评论": "คอมเมนต์วิดีโอ YouTube",
    "TikTok 视频评论": "คอมเมนต์วิดีโอ TikTok",
    "Facebook 帖子评论": "คอมเมนต์โพสต์ Facebook",
    "Shopee 商品评论": "รีวิวสินค้า Shopee",
    "评论排序": "การเรียงคอมเมนต์",
    "已切换所有评论": "เลือกคอมเมนต์ทั้งหมดแล้ว",
    "未确认所有评论": "ยังไม่ยืนยันคอมเมนต์ทั้งหมด",
    "已到达": "ถึงแล้ว",
    "未确认": "ยังไม่ยืนยัน",
    "达到采集上限": "ถึงขีดจำกัดการเก็บ",
    "没有更多评论": "ไม่มีคอมเมนต์เพิ่มเติม",
    "游标未推进": "เคอร์เซอร์ไม่ขยับ",
    "连续无新增": "ไม่มีรายการใหม่หลายรอบ",
    "未发现评论": "ไม่พบคอมเมนต์",
    "暂不支持该链接": "ยังไม่รองรับลิงก์นี้",
    "未采集到评论": "ไม่พบคอมเมนต์",
    "采集超时": "หมดเวลาเก็บข้อมูล",
    "部分结果：采集接近超时，可能未加载完全部评论": "ผลลัพธ์บางส่วน: การเก็บข้อมูลใกล้หมดเวลาและอาจโหลดคอมเมนต์ไม่ครบ",
    "部分结果超时": "ผลลัพธ์บางส่วนหมดเวลา",
    "链接解析失败": "แยกลิงก์ไม่สำเร็จ",
    "排队中": "รอคิว",
    "抓取中": "กำลังเก็บ",
    "已完成": "เสร็จแล้ว",
    "已重新排队": "นำกลับเข้าคิวแล้ว",
    "已恢复": "กู้คืนแล้ว",
    "已开始分析": "เริ่มวิเคราะห์แล้ว",
    "失败": "ล้มเหลว",
    "草稿": "ร่าง",
    "已导入": "นำเข้าแล้ว",
    "分析中": "กำลังวิเคราะห์",
    "部分失败": "ล้มเหลวบางส่วน",
    "未分析": "ยังไม่วิเคราะห์",
    "视频评论": "คอมเมนต์วิดีโอ",
    "社媒评论": "คอมเมนต์โซเชียล",
    "商品评论": "รีวิวสินค้า",
    "商品类评论": "รีวิวสินค้า",
    "视频类评论": "คอมเมนต์วิดีโอ",
    "推文类评论": "คอมเมนต์โพสต์",
    "行动看板": "บอร์ดงานติดตาม",
    "把评论洞察拆成可分派、可跟进、可复盘的团队行动。": "เปลี่ยนอินไซต์จากคอมเมนต์ให้เป็นงานทีมที่มอบหมาย ติดตาม และทบทวนได้",
    "全部状态": "ทุกสถานะ",
    "未处理": "ยังไม่จัดการ",
    "处理中": "กำลังดำเนินการ",
    "已归档": "เก็บถาวรแล้ว",
    "逾期": "เกินกำหนด",
    "需要明确负责人和下一步": "ต้องระบุผู้รับผิดชอบและขั้นตอนถัดไป",
    "正在推进的风险或机会": "ความเสี่ยงหรือโอกาสที่กำลังดำเนินการ",
    "本轮洞察已闭环": "อินไซต์รอบนี้ปิดลูปแล้ว",
    "超过截止日期且未完成": "เกินกำหนดและยังไม่เสร็จ",
    "负责人": "ผู้รับผิดชอบ",
    "编辑": "แก้ไข",
    "证据": "หลักฐาน",
    "标题": "หัวข้อ",
    "说明": "คำอธิบาย",
    "优先级": "ความสำคัญ",
    "截止日期": "กำหนดส่ง",
    "高": "สูง",
    "中": "กลาง",
    "低": "ต่ำ",
    "来自报告问题": "จากประเด็นในรายงาน",
    "AI 建议": "คำแนะนำ AI",
    "手动创建": "สร้างเอง",
    "编辑行动项": "แก้ไขงานติดตาม",
    "例如：跟进高频负面反馈": "เช่น: ติดตามฟีดแบ็กเชิงลบความถี่สูง",
    "请填写行动项标题。": "กรุณากรอกชื่อ action item",
    "选择负责人": "เลือกเจ้าของ",
    "确定删除该行动项？": "ต้องการลบงานติดตามนี้หรือไม่?",
    "行动项已保存。": "บันทึกงานติดตามแล้ว",
    "负责人已更新。": "อัปเดตผู้รับผิดชอบแล้ว",
    "行动项已删除。": "ลบงานติดตามแล้ว",
    "超管": "ผู้ดูแล",
    "用户": "ผู้ใช้",
    "平台用户": "ผู้ใช้แพลตฟอร์ม",
    "包含超管与普通用户": "รวมผู้ดูแลและผู้ใช้ทั่วไป",
    "可用邀请码": "โค้ดเชิญที่ใช้ได้",
    "已使用的邀请码无法再次注册": "โค้ดเชิญที่ใช้แล้วไม่สามารถใช้สมัครซ้ำได้",
    "全平台累计任务": "งานสะสมทั้งแพลตฟอร์ม",
    "用户与配额": "ผู้ใช้และโควตา",
    "用户管理": "จัดการผู้ใช้",
    "队列健康": "สถานะคิว",
    "AI 分析队列": "คิววิเคราะห์ AI",
    "评论采集队列": "คิวเก็บคอมเมนต์",
    "采集任务": "งานเก็บข้อมูล",
    "采集任务库": "คลังงานเก็บข้อมูล",
    "AI 分析批次库": "คลังรอบวิเคราะห์ AI",
    "任务队列状态": "สถานะคิวงาน",
    "数据库任务健康": "สถานะงานในฐานข้อมูล",
    "疑似卡住任务": "งานที่อาจค้าง",
    "最近失败任务": "งานที่ล้มเหลวล่าสุด",
    "任务对象": "เป้าหมายงาน",
    "失败对象": "เป้าหมายที่ล้มเหลว",
    "渠道/模型": "ช่องทาง / โมเดล",
    "错误摘要": "สรุปข้อผิดพลาด",
    "诊断建议": "การวินิจฉัย",
    "失败时间": "เวลาที่ล้มเหลว",
    "最后活动": "กิจกรรมล่าสุด",
    "更新时间": "อัปเดตเมื่อ",
    "等待": "รอ",
    "运行": "กำลังทำงาน",
    "延迟": "หน่วงเวลา",
    "已暂停": "หยุดชั่วคราว",
    "消费中": "กำลังประมวลผลคิว",
    "排队": "เข้าคิว",
    "疑似卡住": "อาจค้าง",
    "最早活跃": "ทำงานครั้งแรกสุด",
    "最近失败": "ล้มเหลวล่าสุด",
    "需要检查": "ต้องตรวจสอบ",
    "有失败记录": "มีประวัติล้มเหลว",
    "空闲": "ว่าง",
    "采集": "เก็บข้อมูล",
    "已静默": "เงียบมา",
    "排队超过阈值，疑似 worker 未消费或队列阻塞": "เข้าคิวนานเกินกำหนด อาจไม่มี worker รับงานหรือคิวติดขัด",
    "任务仍在运行态但已有最近错误": "งานยังอยู่สถานะทำงานแต่มีข้อผิดพลาดล่าสุด",
    "采集器接近或达到超时，任务未正常收尾": "ตัวเก็บข้อมูลใกล้หรือถึงเวลาหมดอายุและยังปิดงานไม่สมบูรณ์",
    "评论排序未确认切换到全部评论": "ยังยืนยันไม่ได้ว่าเปลี่ยนการเรียงเป็นคอมเมนต์ทั้งหมด",
    "已有评论入缓存，疑似导入或收尾阶段静默": "มีคอมเมนต์เข้าแคชแล้ว อาจเงียบในช่วงนำเข้าหรือปิดงาน",
    "采集器仍有过程指标，但暂未形成有效评论": "ตัวเก็บข้อมูลยังส่งตัวชี้วัด แต่ยังไม่ได้คอมเมนต์ที่ใช้ได้",
    "采集阶段": "ขั้นตอนการเก็บข้อมูล",
    "等待 Worker 消费": "รอ worker รับงาน",
    "接口分页采集中": "กำลังเก็บผ่าน API pagination",
    "页面滚动加载中": "กำลังโหลดด้วยการเลื่อนหน้า",
    "导入/收尾阶段": "นำเข้า / ปิดงาน",
    "采集启动中": "กำลังเริ่มเก็บข้อมูล",
    "已导入并进入分析": "นำเข้าแล้วและเข้าสู่การวิเคราะห์",
    "采集完成": "เก็บข้อมูลเสร็จแล้ว",
    "采集失败": "เก็บข้อมูลล้มเหลว",
    "加载页数": "จำนวนหน้าที่โหลด",
    "接口请求": "คำขอ API",
    "接口评论": "คอมเมนต์จาก API",
    "页面评论": "คอมเมนต์บนหน้า",
    "页面文本": "ข้อความบนหน้า",
    "加载更多": "โหลดเพิ่มเติม",
    "本轮按钮": "ปุ่มรอบนี้",
    "点到": "คลิกได้",
    "未点到": "ไม่พบ",
    "空转轮次": "รอบว่าง",
    "本轮新增": "เพิ่มรอบนี้",
    "未见更多": "รอบไม่พบเพิ่มเติม",
    "排序菜单": "เมนูเรียง",
    "排序标签": "ป้ายกำกับการเรียง",
    "已打开": "เปิดแล้ว",
    "未打开": "ยังไม่เปิด",
    "游标": "Cursor",
    "HTTP 状态": "สถานะ HTTP",
    "还有更多": "ยังมีเพิ่ม",
    "剩余时间": "เวลาที่เหลือ",
    "末尾状态": "สถานะท้ายรายการ",
    "接口已返回评论，但导入数量偏低，建议检查解析字段和去重规则。": "API ส่งคอมเมนต์กลับมาแล้ว แต่จำนวนที่นำเข้าต่ำ ควรตรวจ field parser และกฎ dedup",
    "页面已加载评论但入库偏低，建议检查评论选择器或平台语言。": "หน้าโหลดคอมเมนต์แล้วแต่จำนวนบันทึกต่ำ ควรตรวจ selector คอมเมนต์หรือภาษาแพลตฟอร์ม",
    "平台接口返回的分页游标没有继续推进，可能是接口签名、会话或平台限制导致提前停住。": "API แพลตฟอร์มส่งเคอร์เซอร์หน้าถัดไปที่ไม่ขยับ อาจหยุดก่อนเพราะลายเซ็น API, session หรือข้อจำกัดของแพลตฟอร์ม",
    "浏览器兜底采集连续多轮没有新增评论，建议确认是否已到底、是否触发平台风控或评论面板未继续加载。": "การเก็บแบบ fallback ผ่านเบราว์เซอร์ไม่มีคอมเมนต์ใหม่หลายรอบ ควรตรวจว่าถึงท้ายรายการแล้ว ถูกระบบป้องกันแพลตฟอร์มหรือไม่ หรือแผงคอมเมนต์หยุดโหลด",
    "平台仍提示还有更多评论，可提高最大采集条数或用监听任务继续补采。": "แพลตฟอร์มยังแจ้งว่ามีคอมเมนต์เพิ่ม ให้เพิ่มจำนวนสูงสุดหรือใช้ monitor task เก็บต่อ",
    "页面有加载动作但没有识别到评论，建议检查登录态、排序和评论区权限。": "หน้ามีการโหลดเพิ่มเติมแต่ไม่พบคอมเมนต์ ควรตรวจสถานะล็อกอิน การเรียง และสิทธิ์คอมเมนต์",
    "连续多轮没有新增且未点到更多评论，可能已到页尾或按钮文案未匹配。": "หลายรอบไม่มีคอมเมนต์ใหม่และไม่พบปุ่มโหลดเพิ่ม อาจถึงท้ายหน้าแล้วหรือข้อความปุ่มไม่ตรง",
    "连续多轮没有新增评论，建议确认是否已加载到底或触发平台风控。": "หลายรอบไม่มีคอมเมนต์ใหม่ ควรตรวจว่าถึงท้ายหน้าแล้วหรือถูกระบบป้องกันแพลตฟอร์มหรือไม่",
    "采集过程指标暂少，继续等待下一次进度回传。": "ตัวชี้วัดการเก็บข้อมูลยังน้อย ให้รอ progress event ถัดไป",
    "运行超过阈值且没有采集器进度回传": "ทำงานเกินกำหนดโดยไม่มีความคืบหน้าจากตัวเก็บข้อมูล",
    "分析批次排队超过阈值，疑似 AI worker 未消费": "รอบวิเคราะห์เข้าคิวนานเกินกำหนด อาจไม่มี AI worker รับงาน",
    "分析批次运行中但已有最近错误": "รอบวิเคราะห์กำลังทำงานแต่มีข้อผิดพลาดล่าสุด",
    "已有部分评论处理完成，但最近无进度日志": "ประมวลผลบางคอมเมนต์แล้ว แต่ไม่มีบันทึกความคืบหน้าล่าสุด",
    "分析批次运行超过阈值且没有处理进度": "รอบวิเคราะห์ทำงานเกินกำหนดโดยไม่มีความคืบหน้า",
    "检查 crawl-jobs 队列 active/waiting 数、worker 进程和 Redis 连接": "ตรวจจำนวน active/waiting ในคิว crawl-jobs, โปรเซส worker และการเชื่อมต่อ Redis",
    "先查看错误摘要，确认代理、登录态、平台限制或 Python 浏览器依赖": "ดูสรุปข้อผิดพลาดก่อน แล้วตรวจ proxy, สถานะล็อกอิน, ข้อจำกัดแพลตฟอร์ม หรือ dependency เบราว์เซอร์ Python",
    "降低单次最大采集数或检查平台加载速度，必要时重试": "ลดจำนวนสูงสุดต่อครั้งหรือตรวจความเร็วโหลดของแพลตฟอร์ม แล้วลองใหม่หากจำเป็น",
    "稍后重试；若持续出现，降低单次采集上限并检查代理、浏览器参数和接口签名": "ลองใหม่ภายหลัง หากยังเกิดซ้ำ ให้ลดจำนวนสูงสุดต่อครั้งและตรวจ proxy, ค่าพารามิเตอร์เบราว์เซอร์ และลายเซ็น API",
    "检查登录态、代理稳定性和评论弹窗打开情况；必要时降低单次采集上限后重试": "ตรวจสถานะล็อกอิน ความเสถียรของ proxy และว่าแผงคอมเมนต์เปิดสำเร็จหรือไม่ หากจำเป็นให้ลดจำนวนสูงสุดต่อครั้งแล้วลองใหม่",
    "检查平台登录态、页面语言和排序按钮文案，避免只抓到相关评论": "ตรวจสถานะล็อกอิน ภาษาเพจ และข้อความปุ่มเรียงลำดับ เพื่อเลี่ยงการเก็บเฉพาะคอมเมนต์ที่เกี่ยวข้อง",
    "等待短时间自动收尾；若持续静默，查看 worker 日志后重试": "รอสักครู่ให้ปิดงานอัตโนมัติ หากยังเงียบให้ดูบันทึก worker แล้วลองใหม่",
    "检查平台是否需要登录、评论区是否受限、代理是否触发风控": "ตรวจว่าต้องล็อกอินหรือไม่ คอมเมนต์ถูกจำกัดหรือไม่ หรือ proxy กระตุ้นระบบป้องกันหรือไม่",
    "优先检查 Python/浏览器依赖、worker 进程、代理和目标链接可访问性": "ตรวจ Python/browser dependencies, โปรเซส worker, proxy และการเข้าถึงลิงก์เป้าหมายก่อน",
    "检查 analysis-runs 队列、worker 并发和 Redis 连接": "ตรวจคิว analysis-runs, concurrency ของ worker และการเชื่อมต่อ Redis",
    "检查 AI 配置、模型额度、网络超时和最近失败样本": "ตรวจการตั้งค่า AI, โควตาโมเดล, timeout เครือข่าย และตัวอย่างที่ล้มเหลวล่าสุด",
    "查看 worker 日志和当前批次大小，必要时降低并发或重试": "ดูบันทึก worker และขนาด batch ปัจจุบัน ลด concurrency หรือลองใหม่หากจำเป็น",
    "检查 AI worker 是否在线、模型接口是否可用、任务是否被长请求占用": "ตรวจว่า AI worker ออนไลน์หรือไม่ API โมเดลใช้ได้หรือไม่ หรืองานติดคำขอยาวอยู่หรือไม่",
    "最新批次已有错误，先打开分析日志并筛选错误，再确认模型额度、网络超时或提示词返回格式。": "รอบล่าสุดมีข้อผิดพลาด เปิดบันทึกวิเคราะห์และกรองข้อผิดพลาดก่อน แล้วตรวจโควตาโมเดล timeout เครือข่าย หรือรูปแบบผลลัพธ์พรอมป์",
    "分析批次排队后长时间无日志，可能是 AI worker 未消费或队列阻塞。": "รอบวิเคราะห์เข้าคิวนานแต่ไม่มีบันทึก อาจเป็นเพราะ AI worker ไม่รับงานหรือคิวติดขัด",
    "分析批次长时间无新日志，建议查看 worker、模型接口和当前并发配置。": "รอบวิเคราะห์ไม่มีบันทึกใหม่เป็นเวลานาน ควรตรวจ worker, API โมเดล และการตั้งค่า concurrency ปัจจุบัน",
    "批次已部分失败，报告可参考但需要复核失败样本，必要时重新分析。": "รอบนี้ล้มเหลวบางส่วน รายงานใช้เป็นข้อมูลอ้างอิงได้ แต่ควรตรวจตัวอย่างที่ล้มเหลวและวิเคราะห์ใหม่หากจำเป็น",
    "批次已有最近错误，先筛选错误日志，再检查 AI 配置、模型额度、网络超时和提示词返回格式。": "รอบนี้มีข้อผิดพลาดล่าสุด ให้กรองบันทึกข้อผิดพลาดก่อน แล้วตรวจการตั้งค่า AI โควตาโมเดล timeout เครือข่าย และรูปแบบผลลัพธ์พรอมป์",
    "排队后长时间没有日志，疑似 AI worker 未消费、Redis 队列异常或前面任务积压。": "เข้าคิวแล้วไม่มีบันทึกเป็นเวลานาน อาจเป็นเพราะ AI worker ไม่รับงาน คิว Redis ผิดปกติ หรืองานก่อนหน้าค้างสะสม",
    "运行中长时间没有新日志，可能卡在模型请求、网络超时或 worker 并发占用。": "กำลังทำงานแต่ไม่มีบันทึกใหม่เป็นเวลานาน อาจค้างที่คำขอโมเดล timeout เครือข่าย หรือ concurrency ของ worker ถูกใช้อยู่",
    "运行超过 5 分钟仍未处理评论，建议检查模型接口是否响应，以及 worker 是否被长请求占用。": "ทำงานเกิน 5 นาทีแล้วยังไม่ประมวลผลคอมเมนต์ ควรตรวจว่า API โมเดลตอบสนองหรือไม่ และ worker ถูกคำขอยาวยึดอยู่หรือไม่",
    "批次部分失败，已成功的评论可用于报告，但失败样本需要复核或重试。": "รอบนี้ล้มเหลวบางส่วน คอมเมนต์ที่สำเร็จใช้ในรายงานได้ แต่ตัวอย่างที่ล้มเหลวต้องตรวจหรือ retry",
    "批次失败，确认模型额度、API Key、网络和提示词返回格式后再重试。": "รอบนี้ล้มเหลว ตรวจโควตาโมเดล API Key เครือข่าย และรูปแบบผลลัพธ์พรอมป์ก่อน retry",
    "平台拒绝访问，优先检查登录态、账号权限、评论区可见性和代理地区。": "แพลตฟอร์มปฏิเสธการเข้าถึง ให้ตรวจสถานะล็อกอิน สิทธิ์บัญชี การมองเห็นคอมเมนต์ และพื้นที่ proxy ก่อน",
    "平台触发限流，建议降低单次采集量或频率，更换代理后再重试。": "แพลตฟอร์มจำกัดอัตรา ควรลดจำนวนหรือความถี่ต่อครั้ง เปลี่ยน proxy แล้วลองใหม่",
    "平台或代理链路返回服务异常，建议稍后重试并检查代理稳定性。": "แพลตฟอร์มหรือ proxy ส่งข้อผิดพลาดบริการ ควรลองใหม่ภายหลังและตรวจความเสถียรของ proxy",
    "平台拒绝了本次请求，建议检查链接、接口签名、浏览器环境或登录态。": "แพลตฟอร์มปฏิเสธคำขอนี้ ควรตรวจลิงก์ ลายเซ็น API สภาพแวดล้อมเบราว์เซอร์ หรือสถานะล็อกอิน",
    "平台接口返回 429，疑似请求过快或代理出口被限流": "API แพลตฟอร์มส่งกลับ 429 อาจส่งคำขอเร็วเกินไปหรือทางออก proxy ถูกจำกัด",
    "检查平台账号登录态、Cookie/会话、目标链接权限和代理出口地区": "ตรวจสถานะล็อกอินบัญชีแพลตฟอร์ม, Cookie/session, สิทธิ์ลิงก์เป้าหมาย และพื้นที่ proxy",
    "降低单次最大采集数或采集频率，更换代理出口后重试": "ลดจำนวนสูงสุดต่อครั้งหรือความถี่การเก็บ เปลี่ยนทางออก proxy แล้วลองใหม่",
    "稍后重试；若持续出现，检查代理稳定性和目标平台可访问性": "ลองใหม่ภายหลัง หากยังเกิดซ้ำให้ตรวจความเสถียร proxy และการเข้าถึงแพลตฟอร์มเป้าหมาย",
    "检查目标链接是否有效、接口签名/浏览器环境是否过期，以及是否需要登录态": "ตรวจว่าลิงก์เป้าหมายใช้ได้หรือไม่ ลายเซ็น API/สภาพแวดล้อมเบราว์เซอร์หมดอายุหรือไม่ และจำเป็นต้องล็อกอินหรือไม่",
    "评论排序未确认切到全部评论，可能只抓到相关评论；建议检查登录态和页面语言后重试。": "ยังยืนยันไม่ได้ว่าเปลี่ยนการเรียงเป็นคอมเมนต์ทั้งหมด อาจเก็บได้เฉพาะคอมเมนต์ที่เกี่ยวข้อง ควรตรวจล็อกอินและภาษาเพจก่อนลองใหม่",
    "采集接近超时提前返回，建议降低单次最大采集量，或改用监听任务分批采集。": "การเก็บข้อมูลใกล้หมดเวลาและคืนผลก่อน ควรลดจำนวนสูงสุดต่อครั้งหรือใช้การติดตามเพื่อเก็บเป็นชุด",
    "已达到本次采集上限，如需更多评论可提高最大采集条数后重新采集。": "ถึงขีดจำกัดการเก็บครั้งนี้แล้ว หากต้องการคอมเมนต์เพิ่มให้เพิ่มจำนวนสูงสุดแล้วเก็บใหม่",
    "TikTok 接口游标未继续推进，疑似分页签名、会话或平台限制": "TikTok API cursor ไม่ขยับ อาจถูกบล็อกจากลายเซ็นแบ่งหน้า, session หรือข้อจำกัดแพลตฟอร์ม",
    "TikTok 接口游标未继续推进，建议稍后重试；若持续出现，降低单次采集上限并检查代理、浏览器参数和接口签名。": "TikTok API cursor ไม่ขยับ ควรลองใหม่ภายหลัง หากยังเกิดซ้ำให้ลดจำนวนสูงสุดต่อครั้งและตรวจ proxy, ค่าพารามิเตอร์เบราว์เซอร์ และลายเซ็น API",
    "浏览器兜底采集连续多轮无新增，疑似评论面板未继续加载、代理波动或平台风控": "การเก็บแบบ fallback ผ่านเบราว์เซอร์ไม่มีรายการใหม่หลายรอบ อาจเป็นเพราะแผงคอมเมนต์หยุดโหลด proxy ไม่นิ่ง หรือระบบป้องกันแพลตฟอร์ม",
    "浏览器兜底采集已连续多轮无新增，建议稍后重试；若经常出现，检查登录态、代理稳定性和评论弹窗是否成功打开。": "การเก็บแบบ fallback ผ่านเบราว์เซอร์ไม่มีรายการใหม่หลายรอบ ควรลองใหม่ภายหลัง หากเกิดบ่อยให้ตรวจล็อกอิน ความเสถียรของ proxy และว่าแผงคอมเมนต์เปิดสำเร็จหรือไม่",
    "任务长时间没有更新，可能卡在页面加载、代理访问或平台风控，建议稍后刷新或联系管理员查看后台诊断。": "งานไม่อัปเดตเป็นเวลานาน อาจค้างที่การโหลดหน้า proxy หรือระบบป้องกันแพลตฟอร์ม ควรรีเฟรชภายหลังหรือติดต่อผู้ดูแลเพื่อตรวจ backend",
    "采集失败，先看错误摘要；确认链接公开、评论区开启、代理和登录态正常后再重试。": "เก็บข้อมูลล้มเหลว ให้ดูสรุปข้อผิดพลาดก่อน ตรวจว่าลิงก์สาธารณะ เปิดคอมเมนต์ proxy และล็อกอินปกติ แล้วลองใหม่",
    "未采集到评论，先确认链接公开可访问、评论区开启，必要时换登录态或代理再试。": "ไม่พบคอมเมนต์ ให้ยืนยันว่าลิงก์เข้าถึงได้และเปิดคอมเมนต์ หากจำเป็นให้เปลี่ยนล็อกอินหรือ proxy แล้วลองใหม่",
    "优先处理队列连接、暂停状态和一致性告警；需要时使用“补回队列”或停止后重新创建任务。": "จัดการการเชื่อมต่อคิว สถานะหยุดชั่วคราว และ alert ความสอดคล้องก่อน ใช้การกู้คิวหรือหยุดแล้วสร้างงานใหม่หากจำเป็น",
    "先看诊断建议和最近错误，再检查 worker、Redis、代理、平台登录态或 AI 模型配置。": "ดูคำแนะนำวินิจฉัยและข้อผิดพลาดล่าสุดก่อน แล้วตรวจ worker, Redis, proxy, สถานะล็อกอินแพลตฟอร์ม หรือการตั้งค่าโมเดล AI",
    "查看最近失败任务，已恢复的任务可略过；未恢复的采集或分析可以按需重试。": "ดูงานที่ล้มเหลวล่าสุด งานที่กู้คืนแล้วข้ามได้ ส่วนงานเก็บหรือวิเคราะห์ที่ยังไม่กู้คืนสามารถ retry ตามต้องการ",
    "当前未发现一致性告警或卡住任务，保持观察即可。": "ยังไม่พบ alert ความสอดคล้องหรืองานค้าง แค่ติดตามต่อก็พอ",
    "队列健康正常": "สถานะคิวปกติ",
    "当前没有待处理告警、卡住任务或最近失败记录。": "ไม่มี alert ที่ต้องจัดการ งานค้าง หรือประวัติล้มเหลวล่าสุด",
    "采集任务已重新加入队列": "นำงานเก็บข้อมูลกลับเข้าคิวแล้ว",
    "采集任务重试失败": "ลองงานเก็บข้อมูลใหม่ไม่สำเร็จ",
    "采集任务已停止": "หยุดงานเก็บข้อมูลแล้ว",
    "停止采集失败": "หยุดการเก็บข้อมูลไม่สำเร็จ",
    "分析任务已重新加入队列": "นำงานวิเคราะห์กลับเข้าคิวแล้ว",
    "分析任务重试失败": "ลองงานวิเคราะห์ใหม่ไม่สำเร็จ",
    "分析任务已停止": "หยุดงานวิเคราะห์แล้ว",
    "停止分析失败": "หยุดการวิเคราะห์ไม่สำเร็จ",
    "保存空间成员": "บันทึกสมาชิกพื้นที่",
    "更新成员角色": "อัปเดตบทบาทสมาชิก",
    "移除空间成员": "ลบสมาชิกพื้นที่",
    "邀请成员": "เชิญสมาชิก",
    "系统权限": "สิทธิ์ระบบ",
    "普通用户": "ผู้ใช้ทั่วไป",
    "当前角色没有权限访问用户管理": "บทบาทปัจจุบันไม่มีสิทธิ์เข้าถึงการจัดการผู้ใช้",
    "管理当前工作空间的成员、角色和访问权限。": "จัดการสมาชิก บทบาท และสิทธิ์เข้าถึงของ workspace ปัจจุบัน",
    "请填写姓名和邮箱。": "กรุณากรอกชื่อและอีเมล",
    "成员已保存。": "บันทึกสมาชิกแล้ว",
    "角色已更新。": "อัปเดตบทบาทแล้ว",
    "确定移除该成员？": "ยืนยันลบสมาชิกนี้หรือไม่?",
    "成员已移除。": "ลบสมาชิกแล้ว",
    "修改密码": "เปลี่ยนรหัสผ่าน",
    "创建空间": "สร้างพื้นที่",
    "删除空间": "ลบพื้นที่",
    "运行提示词评测": "รันการประเมินพรอมป์",
    "创建采集任务": "สร้างงานเก็บข้อมูล",
    "采集启动分析": "เริ่มวิเคราะห์จากงานเก็บข้อมูล",
    "重试采集任务": "ลองงานเก็บข้อมูลใหม่",
    "停止采集任务": "หยุดงานเก็บข้อมูล",
    "删除采集任务": "ลบงานเก็บข้อมูล",
    "创建监听任务": "สร้างงานติดตาม",
    "更新监听任务": "อัปเดตงานติดตาม",
    "手动运行监听": "รันการติดตามด้วยตนเอง",
    "删除监听任务": "ลบงานติดตาม",
    "创建分析批次": "สร้างรอบวิเคราะห์",
    "取消分析批次": "ยกเลิกรอบวิเคราะห์",
    "分析批次": "รอบวิเคราะห์",
    "导入新任务": "นำเข้าเป็นงานใหม่",
    "评论导入": "นำเข้าคอมเมนต์",
    "保存分析视图": "บันทึกมุมมองวิเคราะห์",
    "更新分析视图": "อัปเดตมุมมองวิเคราะห์",
    "删除分析视图": "ลบมุมมองวิเคราะห์",
    "分析视图": "มุมมองวิเคราะห์",
    "创建 AI 纠错": "สร้างการแก้ไข AI",
    "AI 纠错": "การแก้ไข AI",
    "创建行动项": "สร้างรายการปฏิบัติการ",
    "更新行动项": "อัปเดตรายการปฏิบัติการ",
    "删除行动项": "ลบรายการปฏิบัติการ",
    "导入": "นำเข้า",
    "后台权限": "สิทธิ์คอนโซล",
    "配额调整": "ปรับโควตา",
    "本期用量": "การใช้งานรอบนี้",
    "注册邀请码": "โค้ดเชิญสมัคร",
    "邀请码": "โค้ดเชิญ",
    "邀请码池": "คลังโค้ดเชิญ",
    "配额": "โควตา",
    "使用人": "ผู้ใช้",
    "创建人": "ผู้สร้าง",
    "生成邀请码": "สร้างโค้ดเชิญ",
    "生成": "สร้าง",
    "备注": "หมายเหตุ",
    "评论配额": "โควตาคอมเมนต์",
    "分析次数配额": "โควตาวิเคราะห์",
    "过期时间": "วันหมดอายุ",
    "新建平台账号": "สร้างบัญชีแพลตฟอร์ม",
    "保存账号": "บันทึกบัญชี",
    "账号状态": "สถานะบัญชี",
    "禁用": "ปิดใช้",
    "重置": "รีเซ็ต",
    "重置密码": "รีเซ็ตรหัสผ่าน",
    "确定将该用户密码重置为 123456？": "รีเซ็ตรหัสผ่านผู้ใช้นี้เป็น 123456 หรือไม่?",
    "平台级": "ระดับแพลตฟอร์ม",
    "请填写姓名和邮箱": "กรุณากรอกชื่อและอีเมล",
    "用户已保存，初始密码为 123456": "บันทึกผู้ใช้แล้ว รหัสผ่านเริ่มต้นคือ 123456",
    "保存用户失败": "บันทึกผู้ใช้ไม่สำเร็จ",
    "用户状态已更新": "อัปเดตสถานะผู้ใช้แล้ว",
    "用户权限已更新": "อัปเดตสิทธิ์ผู้ใช้แล้ว",
    "用户信息更新失败": "อัปเดตข้อมูลผู้ใช้ไม่สำเร็จ",
    "密码重置失败": "รีเซ็ตรหัสผ่านไม่สำเร็จ",
    "用户配额已更新": "อัปเดตโควตาผู้ใช้แล้ว",
    "用户配额更新失败": "อัปเดตโควตาผู้ใช้ไม่สำเร็จ",
    "邀请码已复制": "คัดลอกโค้ดเชิญแล้ว",
    "生成邀请码失败": "สร้างโค้ดเชิญไม่สำเร็จ",
    "浏览器未允许自动复制，请手动复制邀请码。": "เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ กรุณาคัดลอกโค้ดเชิญเอง",
    "操作日志": "บันทึกการดำเนินการ",
    "最近操作": "การดำเนินการล่าสุด",
    "按动作、对象、操作人和空间定位审计记录": "ค้นหาบันทึก audit ตาม action, เป้าหมาย, ผู้ดำเนินการ และ workspace",
    "刷新日志": "รีเฟรชบันทึก",
    "操作类型": "ประเภทการดำเนินการ",
    "操作人": "ผู้ดำเนินการ",
    "对象类型": "ประเภทเป้าหมาย",
    "对象": "เป้าหมาย",
    "详情": "รายละเอียด",
    "系统": "ระบบ",
    "条数": "จำนวนแถว",
    "报告分享": "แชร์รายงาน",
    "创建分享": "สร้างการแชร์",
    "撤销分享": "ยกเลิกการแชร์",
    "删除任务": "ลบงาน",
    "更新 AI 设置": "อัปเดตการตั้งค่า AI",
    "更新爬虫设置": "อัปเดตการตั้งค่าตัวเก็บข้อมูล",
    "更新用户": "อัปเดตผู้ใช้",
    "行动项": "รายการปฏิบัติการ",
    "加载操作日志失败": "โหลดบันทึกการดำเนินการไม่สำเร็จ",
    "加载超管数据失败": "โหลดข้อมูลผู้ดูแลไม่สำเร็จ",
    "队列健康数据加载中": "กำลังโหลดสถานะคิว",
    "后台会在队列健康页每 10 秒自动刷新一次。": "หน้าสถานะคิวจะรีเฟรชอัตโนมัติทุก 10 วินาที",
    "例如：5 月测试用户 / 某客户试用": "เช่น: ผู้ใช้ทดสอบเดือนพฤษภาคม / ลูกค้าทดลอง",
    "姓名": "ชื่อ",
    "邮箱": "อีเมล",
    "设为超管": "ตั้งเป็นผู้ดูแล",
    "已使用": "ใช้แล้ว",
    "可使用": "ใช้ได้",
    "尚未使用": "ยังไม่ได้ใช้",
    "需要超管权限": "ต้องมีสิทธิ์ผู้ดูแล",
    "当前账号没有平台超管权限。": "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลแพลตฟอร์ม",
    "返回用户后台": "กลับคอนโซลผู้ใช้",
    "增长运营工作台": "พื้นที่ปฏิบัติการเติบโต",
    "每天看变化、看异常、看竞品差距，把 AI 分析沉淀成可交付的经营动作。": "ดูการเปลี่ยนแปลง ความผิดปกติ และช่องว่างกับคู่แข่งทุกวัน แล้วเปลี่ยนผลวิเคราะห์ AI เป็นงานปฏิบัติการที่ส่งมอบได้",
    "刷新简报": "รีเฟรชสรุป",
    "每日变化简报": "สรุปการเปลี่ยนแปลงรายวัน",
    "今日新增": "เพิ่มวันนี้",
    "负面占比": "สัดส่วนเชิงลบ",
    "平均星级": "คะแนนเฉลี่ย",
    "评论数": "จำนวนคอมเมนต์",
    "首要问题": "ปัญหาหลัก",
    "风险": "ความเสี่ยง",
    "高风险": "ความเสี่ยงสูง",
    "预警": "เตือนภัย",
    "稳定": "เสถียร",
    "紧急": "เร่งด่วน",
    "提示": "คำแนะนำ",
    "选择任务": "เลือกงาน",
    "选择一个已完成分析的任务后生成今日简报。": "เลือกงานที่วิเคราะห์เสร็จแล้วเพื่อสร้างสรุปรายวัน",
    "还没有分析任务，请先导入或抓取评论。": "ยังไม่มีงานวิเคราะห์ กรุณานำเข้าหรือเก็บคอมเมนต์ก่อน",
    "简报需要至少完成一次 AI 分析。": "สรุปต้องมีการวิเคราะห์ AI ที่เสร็จแล้วอย่างน้อยหนึ่งครั้ง",
    "需要至少两个已完成分析的任务。": "ต้องมีงานที่วิเคราะห์เสร็จแล้วอย่างน้อยสองงาน",
    "请选择至少 2 个任务。": "กรุณาเลือกอย่างน้อย 2 งาน",
    "纠错已保存，并会覆盖当前分析结果中的对应字段。": "บันทึกการแก้ไขแล้ว และจะเขียนทับฟิลด์ที่ตรงกันในผลวิเคราะห์ปัจจุบัน",
    "交付链接已复制。": "คัดลอกลิงก์ส่งมอบแล้ว",
    "浏览器未允许自动复制，请手动复制输入框中的链接。": "เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ กรุณาคัดลอกลิงก์จากช่องกรอกเอง",
    "异常预警": "การแจ้งเตือน",
    "竞品/任务对比": "เทียบคู่แข่ง / งาน",
    "多任务趋势对比": "เปรียบเทียบแนวโน้มหลายงาน",
    "选择 2-8 个任务，对比 NPS、负面率、评分和主要风险。": "เลือก 2-8 งานเพื่อเปรียบเทียบ NPS อัตราเชิงลบ คะแนน และความเสี่ยงหลัก",
    "开始对比": "เริ่มเปรียบเทียบ",
    "当前领先": "นำอยู่ตอนนี้",
    "暂无胜出任务": "ยังไม่มีงานที่ชนะ",
    "需关注": "ต้องติดตาม",
    "健康": "ปกติ",
    "AI 纠错与提示词评测": "แก้ผล AI และประเมินพรอมป์",
    "提示词评测": "ประเมินพรอมป์",
    "从结构化输出、证据约束、分类口径和模型配置检查稳定性。": "ตรวจความเสถียรจากผลลัพธ์แบบโครงสร้าง ข้อกำหนดหลักฐาน เกณฑ์การจัดหมวดหมู่ และการตั้งค่าโมเดล",
    "立即评测": "ประเมินทันที",
    "未配置模型": "ยังไม่ได้ตั้งค่าโมเดล",
    "默认版本": "เวอร์ชันเริ่มต้น",
    "通过": "ผ่าน",
    "待补强": "ต้องปรับปรุง",
    "AI 结果纠错": "แก้ผล AI",
    "抽取当前任务的评论样本，修正情绪、摘要、痛点和建议。": "สุ่มตัวอย่างคอมเมนต์จากงานปัจจุบัน แล้วแก้อารมณ์ สรุป pain point และข้อเสนอแนะ",
    "加载样本": "โหลดตัวอย่าง",
    "选择评论样本": "เลือกตัวอย่างคอมเมนต์",
    "修正情绪": "แก้อารมณ์",
    "正向": "เชิงบวก",
    "中性": "กลาง",
    "负向": "เชิงลบ",
    "标签，逗号分隔": "แท็ก คั่นด้วยจุลภาค",
    "修正摘要": "แก้สรุป",
    "纠错备注": "หมายเหตุการแก้ไข",
    "保存纠错": "บันทึกการแก้ไข",
    "报告交付增强": "การส่งมอบรายงาน",
    "客户/老板可读报告": "รายงานสำหรับลูกค้า/ผู้บริหาร",
    "一键生成公开报告链接，并支持打开后浏览器打印为 PDF。": "สร้างลิงก์รายงานสาธารณะในคลิกเดียว และพิมพ์เป็น PDF จากเบราว์เซอร์ได้",
    "打开报告": "เปิดรายงาน",
    "生成交付链接": "สร้างลิงก์ส่งมอบ",
    "复制链接": "คัดลอกลิงก์",
    "打开交付页": "เปิดหน้าส่งมอบ",
    "公开链接可撤销": "ลิงก์สาธารณะยกเลิกได้",
    "报告页面支持打印/PDF": "หน้ารายงานรองรับการพิมพ์/PDF",
    "指标、趋势、痛点和行动项完整展示": "แสดงตัวชี้วัด แนวโน้ม pain point และ action item ครบถ้วน",
    "AI 分析": "วิเคราะห์ AI",
    "空间与成员": "พื้นที่และสมาชิก",
    "管理当前空间、成员角色、我的空间列表和额度使用情况。": "จัดการพื้นที่ปัจจุบัน บทบาทสมาชิก รายการพื้นที่ของฉัน และการใช้โควตา",
    "空间成员": "สมาชิกพื้นที่",
    "成员列表加载失败，请检查权限": "โหลดรายชื่อสมาชิกไม่สำเร็จ กรุณาตรวจสิทธิ์",
    "成员已添加到当前空间": "เพิ่มสมาชิกเข้าพื้นที่ปัจจุบันแล้ว",
    "成员保存失败，请检查权限或输入信息": "บันทึกสมาชิกไม่สำเร็จ กรุณาตรวจสิทธิ์หรือข้อมูลที่กรอก",
    "成员角色已更新": "อัปเดตบทบาทสมาชิกแล้ว",
    "角色更新失败，请检查权限": "อัปเดตบทบาทไม่สำเร็จ กรุณาตรวจสิทธิ์",
    "确定从当前空间移除该成员？": "ยืนยันลบสมาชิกนี้ออกจากพื้นที่ปัจจุบันหรือไม่?",
    "成员已从当前空间移除": "ลบสมาชิกออกจากพื้นที่ปัจจุบันแล้ว",
    "成员移除失败，请检查权限": "ลบสมาชิกไม่สำเร็จ กรุณาตรวจสิทธิ์",
    "AI 设置": "ตั้งค่า AI",
    "配置当前账号的模型供应商、接口密钥和评论分析提示词。": "ตั้งค่าผู้ให้บริการโมเดล API key และพรอมป์วิเคราะห์คอมเมนต์ของบัญชีปัจจุบัน",
    "模型设置加载失败": "โหลดการตั้งค่าโมเดลไม่สำเร็จ",
    "AI 设置已保存": "บันทึกการตั้งค่า AI แล้ว",
    "AI 设置保存失败，请检查权限或输入内容": "บันทึกการตั้งค่า AI ไม่สำเร็จ กรุณาตรวจสิทธิ์หรือข้อมูลที่กรอก",
    "已恢复当前类型默认提示词，保存后生效": "คืนค่าพรอมป์เริ่มต้นของประเภทปัจจุบันแล้ว บันทึกเพื่อให้มีผล",
    "爬虫设置": "ตั้งค่าตัวเก็บข้อมูล",
    "配置当前账号的 Shopee、YouTube、TikTok、Facebook 评论抓取代理和默认抓取参数。": "ตั้งค่า proxy และพารามิเตอร์เริ่มต้นสำหรับเก็บคอมเมนต์ Shopee, YouTube, TikTok และ Facebook ของบัญชีปัจจุบัน",
    "默认来源渠道": "ช่องทางเริ่มต้น",
    "抓取设置加载失败": "โหลดการตั้งค่าเก็บข้อมูลไม่สำเร็จ",
    "爬虫设置已保存": "บันทึกการตั้งค่าตัวเก็บข้อมูลแล้ว",
    "爬虫设置保存失败，请检查权限或输入内容": "บันทึกการตั้งค่าตัวเก็บข้อมูลไม่สำเร็จ กรุณาตรวจสิทธิ์หรือข้อมูลที่กรอก",
    "python 或 C:\\Python312\\python.exe": "python หรือ C:\\Python312\\python.exe",
    "当前空间": "พื้นที่ปัจจุบัน",
    "已选空间": "พื้นที่ที่เลือก",
    "我的角色": "บทบาทของฉัน",
    "所有者和管理员可以管理成员与空间配置": "เจ้าของและผู้ดูแลสามารถจัดการสมาชิกและการตั้งค่าพื้นที่ได้",
    "评论额度": "โควตาคอมเมนต์",
    "分析次数": "จำนวนครั้งวิเคราะห์",
    "额度用量": "การใช้โควตา",
    "当前空间成员": "สมาชิกในพื้นที่",
    "角色权限矩阵": "ตารางสิทธิ์ตามบทบาท",
    "按当前接口权限": "ตามสิทธิ์ API ปัจจุบัน",
    "平台超管不受空间角色限制；普通成员按所在空间角色执行权限。": "ผู้ดูแลแพลตฟอร์มไม่ถูกจำกัดด้วยบทบาทพื้นที่ สมาชิกทั่วไปใช้สิทธิ์ตามบทบาทในพื้นที่",
    "权限点": "สิทธิ์",
    "查看报告与评论": "ดูรายงานและคอมเมนต์",
    "导入/采集评论": "นำเข้า/เก็บคอมเมนต์",
    "启动/停止分析": "เริ่ม/หยุดวิเคราะห์",
    "创建/撤销分享": "สร้าง/ยกเลิกแชร์",
    "删除任务和采集记录": "ลบงานและบันทึกการเก็บข้อมูล",
    "管理空间成员": "จัดการสมาชิกพื้นที่",
    "修改模型和爬虫配置": "แก้ไขการตั้งค่าโมเดลและตัวเก็บข้อมูล",
    "可用": "ใช้ได้",
    "仅超管": "เฉพาะผู้ดูแล",
    "无权限": "ไม่มีสิทธิ์",
    "添加成员": "เพิ่มสมาชิก",
    "可管理": "จัดการได้",
    "只读": "อ่านอย่างเดียว",
    "不限额": "ไม่จำกัดโควตา",
    "超管不限额": "ผู้ดูแลไม่จำกัดโควตา",
    "未设置重置日期": "ยังไม่ได้ตั้งวันรีเซ็ต",
    "空间已切换": "สลับพื้นที่แล้ว",
    "空间已创建": "สร้างพื้นที่แล้ว",
    "空间创建失败，请稍后重试": "สร้างพื้นที่ไม่สำเร็จ กรุณาลองใหม่ภายหลัง",
    "请填写空间名称": "กรุณากรอกชื่อพื้นที่",
    "确定删除这个工作空间吗？": "ยืนยันลบพื้นที่ทำงานนี้หรือไม่?",
    "删除后空间内的任务、评论、分析结果和成员关系都会被移除。": "หลังลบ งาน คอมเมนต์ ผลวิเคราะห์ และความสัมพันธ์สมาชิกในพื้นที่นี้จะถูกลบ",
    "删除工作空间失败，请检查权限或稍后重试": "ลบพื้นที่ทำงานไม่สำเร็จ กรุณาตรวจสิทธิ์หรือลองใหม่ภายหลัง",
    "这里管理的是当前空间成员关系；平台账号、超管权限和租户额度由超管后台管理。": "ส่วนนี้จัดการสมาชิกของพื้นที่ปัจจุบัน บัญชีแพลตฟอร์ม สิทธิ์ผู้ดูแล และโควตาผู้เช่าจัดการในคอนโซลผู้ดูแล",
    "可选，例如：brand-ops": "ไม่บังคับ เช่น brand-ops",
    "例如：品牌运营团队": "เช่น ทีมปฏิบัติการแบรนด์",
    "例如：运营同事": "เช่น เพื่อนร่วมงานฝ่ายปฏิบัติการ",
    "例如：http://127.0.0.1:7890": "เช่น http://127.0.0.1:7890",
    "例如：v2-thai": "เช่น v2-thai",
    "已隐藏": "ซ่อนแล้ว",
    "已保存（已隐藏），输入新密钥可替换": "บันทึกแล้ว (ซ่อนอยู่) กรอก key ใหม่เพื่อแทนที่",
    "平台超管": "ผู้ดูแลแพลตฟอร์ม",
    "普通账号": "บัญชีทั่วไป",
    "移除": "ลบออก",
    "模型设置": "ตั้งค่าโมเดล",
    "分析模型": "โมเดลวิเคราะห์",
    "可编辑": "แก้ไขได้",
    "模型供应商": "ผู้ให้บริการโมเดล",
    "接口密钥": "API key",
    "接口地址": "API endpoint",
    "模型名称": "ชื่อโมเดล",
    "提示词版本": "เวอร์ชันพรอมป์",
    "随机性": "Temperature",
    "提示词设置": "ตั้งค่าพรอมป์",
    "恢复默认提示词": "คืนค่าพรอมป์เริ่มต้น",
    "保存设置": "บันทึกการตั้งค่า",
    "系统提示词": "System prompt",
    "单条评论分析提示词模板": "เทมเพลตวิเคราะห์คอมเมนต์เดี่ยว",
    "总体总结提示词": "พรอมป์สรุปรวม",
    "分析报告提示词": "พรอมป์รายงานวิเคราะห์",
    "可用变量：{taxonomy}、{ratingStar}、{comment}、{commentTr}": "ตัวแปรที่ใช้ได้: {taxonomy}, {ratingStar}, {comment}, {commentTr}",
    "Scrapling 评论抓取": "Scrapling comment crawler",
    "保存爬虫设置": "บันทึกการตั้งค่าตัวเก็บข้อมูล",
    "启用链接抓取": "เปิดเก็บจากลิงก์",
    "Python 命令": "คำสั่ง Python",
    "代理地址": "Proxy URL",
    "默认抓取条数": "จำนวนเก็บเริ่มต้น",
    "填 0 表示不限，适用于 Shopee、YouTube、TikTok、Facebook 评论采集。": "ใส่ 0 หมายถึงไม่จำกัด ใช้กับการเก็บคอมเมนต์ Shopee, YouTube, TikTok และ Facebook",
    "超时时间（秒）": "หมดเวลา (วินาที)",
    "链接抓取当前支持 Shopee 商品、YouTube 视频、TikTok 视频和 Facebook 帖子/图片/Reel 评论。代理会传给本地 Scrapling 脚本，用于访问公开评论接口。": "การเก็บจากลิงก์รองรับรีวิวสินค้า Shopee คอมเมนต์วิดีโอ YouTube/TikTok และคอมเมนต์โพสต์/รูปภาพ/Reel ของ Facebook โดยส่ง proxy ให้สคริปต์ Scrapling ในเครื่องเพื่อเข้าถึง API คอมเมนต์สาธารณะ",
    "我的空间": "พื้นที่ของฉัน",
    "切换": "สลับ",
    "新建租户空间": "สร้างพื้นที่ผู้เช่า",
    "创建": "สร้าง",
    "空间名称": "ชื่อพื้นที่",
    "空间标识": "slug พื้นที่",
    "添加空间成员": "เพิ่มสมาชิกพื้นที่",
    "如果该邮箱尚未注册，系统会先创建占位账号；对方用同一邮箱注册后即可进入此空间。": "หากอีเมลนี้ยังไม่ได้ลงทะเบียน ระบบจะสร้างบัญชีชั่วคราวก่อน เมื่อลงทะเบียนด้วยอีเมลเดียวกันก็จะเข้า workspace นี้ได้",
    "空间角色": "บทบาทพื้นที่",
    "空间": "พื้นที่",
    "角色": "บทบาท",
    "套餐": "แพ็กเกจ",
    "评论用量": "การใช้คอมเมนต์",
    "成员": "สมาชิก",
    "平台权限": "สิทธิ์แพลตฟอร์ม",
    "所有者": "เจ้าของ",
    "管理员": "ผู้ดูแล",
    "分析师": "นักวิเคราะห์",
    "筛选": "ตัวกรอง",
    "更多筛选": "ตัวกรองเพิ่มเติม",
    "关键词": "คำค้น",
    "评分": "คะแนน",
    "是否含媒体": "มีสื่อหรือไม่",
    "有媒体": "มีสื่อ",
    "无媒体": "ไม่มีสื่อ",
    "导出": "ส่งออก",
    "清空": "ล้าง",
    "应用": "ใช้",
    "原始评论": "คอมเมนต์ต้นฉบับ",
    "评论时间": "เวลาคอมเมนต์",
    "浏览": "ยอดดู",
    "情绪": "อารมณ์",
    "意图": "เจตนา",
    "主题": "หัวข้อ",
    "摘要": "สรุป",
    "建议": "คำแนะนำ",
    "痛点": "Pain points",
    "亮点": "Highlights",
    "报告": "รายงาน",
    "报告不可访问": "ไม่สามารถเข้าถึงรายงานได้",
    "正在加载报告": "กำลังโหลดรายงาน",
    "面向业务复盘和对外汇报的评论洞察报告，支持导出、分享和证据追溯。": "รายงานอินไซต์คอมเมนต์สำหรับทบทวนธุรกิจและนำเสนอภายนอก รองรับส่งออก แชร์ และย้อนดูหลักฐาน",
    "导出报告": "ส่งออกรายงาน",
    "导出 Markdown": "ส่งออก Markdown",
    "导出 HTML": "ส่งออก HTML",
    "打印 / 保存 PDF": "พิมพ์ / บันทึก PDF",
    "刷新报告": "รีเฟรชรายงาน",
    "分享报告": "แชร์รายงาน",
    "打印/PDF": "พิมพ์/PDF",
    "产品洞察报告": "รายงานอินไซต์สินค้า",
    "视频内容反馈报告": "รายงานฟีดแบ็กวิดีโอ",
    "社媒舆情报告": "รายงานกระแสโซเชียล",
    "评论分析报告": "รายงานวิเคราะห์คอมเมนต์",
    "推文舆情报告": "รายงานกระแสโพสต์",
    "实时报告": "รายงานเรียลไทม์",
    "固定快照": "snapshot คงที่",
    "固定当前版本": "เก็บ snapshot เวอร์ชันปัจจุบัน",
    "分享链接不存在、已撤销或已过期。": "ลิงก์แชร์ไม่มีอยู่ ถูกยกเลิก หรือหมดอายุแล้ว",
    "分享分析报告": "แชร์รายงานวิเคราะห์",
    "只读报告链接": "ลิงก์รายงานแบบอ่านอย่างเดียว",
    "外部访问者无需登录，只能查看当前任务的报告汇总和图表。": "ผู้เข้าชมภายนอกไม่ต้องเข้าสู่ระบบ และดูได้เฉพาะสรุปรายงานกับกราฟของงานนี้",
    "生成链接": "สร้างลิงก์",
    "还没有分享链接": "ยังไม่มีลิงก์แชร์",
    "已撤销": "ยกเลิกแล้ว",
    "分享链接已生成并复制。": "สร้างและคัดลอกลิงก์แชร์แล้ว",
    "固定快照链接已生成并复制。": "สร้างและคัดลอกลิงก์ snapshot แล้ว",
    "实时报告链接已生成并复制。": "สร้างและคัดลอกลิงก์รายงานเรียลไทม์แล้ว",
    "分享链接已生成，但浏览器未允许自动复制，请手动复制输入框中的链接。": "สร้างลิงก์แชร์แล้ว แต่เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ กรุณาคัดลอกลิงก์จากช่องกรอกเอง",
    "分享链接已复制。": "คัดลอกลิงก์แชร์แล้ว",
    "撤销分享链接": "ยกเลิกลิงก์แชร์",
    "撤销后外部访问者将无法继续查看。": "หลังยกเลิก ผู้เข้าชมภายนอกจะดูต่อไม่ได้",
    "撤销": "ยกเลิก",
    "分享链接已撤销。": "ยกเลิกลิงก์แชร์แล้ว",
    "当前报告还没有生成分析结果，暂时无法导出。": "รายงานนี้ยังไม่มีผลวิเคราะห์ จึงยังส่งออกไม่ได้",
    "Markdown 报告已导出。": "ส่งออกรายงาน Markdown แล้ว",
    "HTML 报告已导出。": "ส่งออกรายงาน HTML แล้ว",
    "当前任务还没有生成分析结果。": "งานปัจจุบันยังไม่มีผลวิเคราะห์",
    "暂无 AI 总结，请查看下方图表和证据模块。": "ยังไม่มีสรุป AI กรุณาดูกราฟและหลักฐานด้านล่าง",
    "等待评论样本和分析结果": "รอตัวอย่างคอมเมนต์และผลวิเคราะห์",
    "等待首次分析": "รอการวิเคราะห์ครั้งแรก",
    "已生成分析结果": "สร้างผลวิเคราะห์แล้ว",
    "用户声音": "เสียงผู้ใช้",
    "客户声音摘要": "สรุปเสียงลูกค้า",
    "观众声音摘要": "สรุปเสียงผู้ชม",
    "舆情声音摘要": "สรุปเสียงกระแสสาธารณะ",
    "主要问题": "ปัญหาหลัก",
    "趋势": "แนวโน้ม",
    "洞察": "อินไซต์",
    "执行摘要": "สรุปผู้บริหาร",
    "核心指标": "ตัวชี้วัดหลัก",
    "评论总量": "จำนวนคอมเมนต์ทั้งหมด",
    "当前报告": "รายงานปัจจุบัน",
    "共享报告": "รายงานที่แชร์",
    "质量检查": "ตรวจคุณภาพ",
    "动态话题": "หัวข้อแบบไดนามิก",
    "噪音控制": "ควบคุมสัญญาณรบกวน",
    "策略洞察": "อินไซต์เชิงกลยุทธ์",
    "进入本次报告的样本量": "จำนวนตัวอย่างในรายงานนี้",
    "已纳入本次洞察样本": "รวมในตัวอย่างอินไซต์ครั้งนี้",
    "用户认可和可放大的反馈": "ฟีดแบ็กที่ผู้ใช้ยอมรับและขยายผลได้",
    "有效评论": "คอมเมนต์ที่มีคุณค่า",
    "AI 总结": "สรุป AI",
    "语言画像": "โปรไฟล์ภาษา",
    "低价值评论": "คอมเมนต์มูลค่าต่ำ",
    "已降权": "ลดน้ำหนักแล้ว",
    "非中文/混合评论，主语言": "คอมเมนต์ไม่ใช่จีน/ผสม ภาษาหลัก",
    "为主": "เป็นหลัก",
    "条证据": "หลักฐาน",
    "条样本": "ตัวอย่าง",
    "情感分布": "การกระจายความรู้สึก",
    "整体情感分布": "การกระจายความรู้สึกโดยรวม",
    "评论意图分布": "การกระจายเจตนาคอมเมนต์",
    "评论来源分布": "การกระจายแหล่งคอมเมนต์",
    "评论语言分布": "การกระจายภาษาคอมเมนต์",
    "高频问题": "ปัญหาความถี่สูง",
    "用户问题统计": "สถิติปัญหาผู้ใช้",
    "高频问题统计": "สถิติปัญหาที่พบบ่อย",
    "正向情感占比": "สัดส่วนความรู้สึกเชิงบวก",
    "核心关键词": "คีย์เวิร์ดหลัก",
    "动态内容标签": "แท็กเนื้อหาแบบไดนามิก",
    "分析质量提醒": "แจ้งเตือนคุณภาพการวิเคราะห์",
    "重复/相似评论聚合": "การรวมคอมเมนต์ซ้ำ/คล้ายกัน",
    "重复评论占比": "สัดส่วนคอมเมนต์ซ้ำ",
    "重复评论簇": "กลุ่มคอมเมนต์ซ้ำ",
    "最大重复簇占比": "สัดส่วนกลุ่มซ้ำที่ใหญ่ที่สุด",
    "观点聚类与证据评论": "กลุ่มความคิดเห็นและคอมเมนต์หลักฐาน",
    "主要问题证据": "หลักฐานประเด็นหลัก",
    "问题证据与行动项": "หลักฐานปัญหาและงานติดตาม",
    "生成行动项": "สร้างงานติดตาม",
    "跟进问题": "ติดตามปัญหา",
    "查看证据": "ดูหลักฐาน",
    "代表性评论": "คอมเมนต์ตัวแทน",
    "正向代表评论": "คอมเมนต์ตัวแทนเชิงบวก",
    "负向代表评论": "คอมเมนต์ตัวแทนเชิงลบ",
    "暂无意图分布数据": "ยังไม่มีข้อมูลการกระจายเจตนา",
    "暂无高频问题": "ยังไม่มีปัญหาความถี่สูง",
    "暂无动态内容标签": "ยังไม่มีแท็กเนื้อหาแบบไดนามิก",
    "暂无观点聚类": "ยังไม่มีกลุ่มความคิดเห็น",
    "暂无深度洞察": "ยังไม่มีอินไซต์เชิงลึก",
    "暂无质量提醒": "ยังไม่มีแจ้งเตือนคุณภาพ",
    "暂无正向代表评论": "ยังไม่มีคอมเมนต์ตัวแทนเชิงบวก",
    "暂无负向代表评论": "ยังไม่มีคอมเมนต์ตัวแทนเชิงลบ",
    "暂无代表评论": "ยังไม่มีคอมเมนต์ตัวแทน",
    "评论样本": "ตัวอย่างคอมเมนต์",
    "导出时间": "เวลาส่งออก",
    "纳入本次报告": "รวมในรายงานนี้",
    "占比": "สัดส่วน",
    "条": "รายการ",
    "条评论": "คอมเมนต์",
    "条相关评论": "คอมเมนต์ที่เกี่ยวข้อง",
    "问题": "ปัญหา",
    "相关评论": "คอมเมนต์ที่เกี่ยวข้อง",
    "证据样本": "ตัวอย่างหลักฐาน",
    "整体": "โดยรวม",
    "严重": "ร้ายแรง",
    "词云": "Word cloud",
    "用户声音词云": "word cloud เสียงผู้ใช้",
    "观众支持度": "การสนับสนุนผู้ชม",
    "舆情支持度": "การสนับสนุนสาธารณะ",
    "满意度 NPS": "NPS ความพึงพอใจ",
    "推荐者与批评者净差": "ส่วนต่างสุทธิระหว่างผู้แนะนำและผู้วิจารณ์",
    "支持立场占比与反对/风险占比的净差": "ส่วนต่างสุทธิระหว่างจุดยืนสนับสนุนกับคัดค้าน/เสี่ยง",
    "正向观众占比与负向争议占比的净差": "ส่วนต่างสุทธิระหว่างผู้ชมเชิงบวกกับเชิงลบ/ถกเถียง",
    "各星级情感倾向": "แนวโน้มความรู้สึกตามดาว",
    "按 1-5 星评价拆分推荐倾向": "แยกแนวโน้มการแนะนำตามคะแนน 1-5 ดาว",
    "按情感与立场拆分支持、观望和争议": "แยกสนับสนุน เฝ้าดู และถกเถียงตามความรู้สึกและจุดยืน",
    "正向占比": "สัดส่วนเชิงบวก",
    "支持/扩散理由": "เหตุผลสนับสนุน/กระจายต่อ",
    "传播理由": "เหตุผลในการกระจาย",
    "传播优势": "ข้อได้เปรียบในการกระจาย",
    "内容优势": "จุดแข็งของเนื้อหา",
    "核心理由": "เหตุผลหลัก",
    "优势信号": "สัญญาณจุดแข็ง",
    "改进机会": "โอกาสปรับปรุง",
    "产品优势": "จุดแข็งของสินค้า",
    "销售卖点": "จุดขาย",
    "待改进点": "จุดที่ควรปรับปรุง",
    "待优化点": "จุดที่ควรเพิ่มประสิทธิภาพ",
    "风险与误解": "ความเสี่ยงและความเข้าใจผิด",
    "风险/回应类型": "ประเภทความเสี่ยง/การตอบสนอง",
    "高频问题类型": "ประเภทปัญหาความถี่สูง",
    "争议/澄清类型": "ประเภทข้อโต้แย้ง/การชี้แจง",
    "回应期待": "ความคาดหวังต่อการตอบกลับ",
    "观众期待": "ความคาดหวังของผู้ชม",
    "用户期待": "ความคาดหวังของผู้ใช้",
    "参与人群": "กลุ่มผู้มีส่วนร่วม",
    "观众画像": "โปรไฟล์ผู้ชม",
    "用户画像": "โปรไฟล์ผู้ใช้",
    "观看场景": "บริบทการรับชม",
    "使用场景": "บริบทการใช้งาน",
    "讨论场景": "บริบทการสนทนา",
    "内容类别分布": "การกระจายประเภทเนื้อหา",
    "话题": "หัวข้อ",
    "实体": "เอนทิตี",
    "分类": "หมวดหมู่",
    "提问": "คำถาม",
    "玩梗": "มุก/มีม",
    "搜索电商词": "ค้นหาคำเชิงพาณิชย์",
    "质量": "คุณภาพ",
    "价格": "ราคา",
    "物流": "โลจิสติกส์",
    "快递": "ขนส่ง",
    "发货": "จัดส่ง",
    "包装": "บรรจุภัณฑ์",
    "客服": "บริการลูกค้า",
    "售后": "หลังการขาย",
    "保修": "ประกัน",
    "退换": "คืน/เปลี่ยน",
    "数量": "จำนวน",
    "立场": "จุดยืน",
    "可放大的认可反馈": "ฟีดแบ็กเชิงบวกที่ควรขยาย",
    "需要运营跟进的低分反馈": "ฟีดแบ็กคะแนนต่ำที่ทีมปฏิบัติการควรติดตาม",
    "需要澄清或复盘的观众反馈": "ฟีดแบ็กผู้ชมที่ควรชี้แจงหรือทบทวน",
    "需要回应或降风险的讨论": "การสนทนาที่ควรตอบกลับหรือลดความเสี่ยง",
    "需要优先跟进的问题信号": "สัญญาณปัญหาที่ควรติดตามก่อน",
    "查看高频词评论": "ดูคอมเมนต์คำถี่สูง",
    "查看主要意图": "ดูเจตนาหลัก",
    "查看动态标签": "ดูแท็กไดนามิก",
    "查看有效聚类": "ดูกลุ่มที่ใช้ได้",
    "查看正向评论": "ดูคอมเมนต์เชิงบวก",
    "查看中性评论": "ดูคอมเมนต์กลาง",
    "查看负向评论": "ดูคอมเมนต์เชิงลบ",
    "查看重复证据": "ดูหลักฐานซ้ำ",
    "行动项已创建。": "สร้าง action item แล้ว",
    "请先选择分析任务。": "กรุณาเลือกงานวิเคราะห์ก่อน",
    "负向评论": "คอมเมนต์เชิงลบ",
    "负向/争议观众": "ผู้ชมเชิงลบ/ถกเถียง",
    "反对/风险评论": "คอมเมนต์คัดค้าน/เสี่ยง"
  }
};

const textOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Record<string, string>>();
const translatedAttrs = ["placeholder", "title", "aria-label", "aria-placeholder", "data-placeholder"] as const;
const skippedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);

let observer: MutationObserver | null = null;
let queued = false;
let started = false;

function dict(locale: AppLocale) {
  return locale === "zh-CN" ? null : staticText[locale];
}

function withWhitespace(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] || "";
  const trailing = source.match(/\s*$/)?.[0] || "";
  return `${leading}${translated}${trailing}`;
}

function replaceKnownParts(value: string, locale: Exclude<AppLocale, "zh-CN">) {
  const localeDict = staticText[locale];
  let result = value;
  const entries = Object.entries(localeDict).sort((a, b) => b[0].length - a[0].length);
  for (const [source, target] of entries) {
    if (source.length < 2 || !result.includes(source)) {
      continue;
    }
    result = result.split(source).join(target);
  }
  return result;
}

function translatePattern(value: string, locale: Exclude<AppLocale, "zh-CN">): string | null {
  const unlimited = staticText[locale]["不限"];
  const quotaReset = value.match(/^剩余\s+(\d+)\s+天\s+·\s+(.+)\s+重置$/);
  if (quotaReset) {
    return locale === "en-US" ? `${quotaReset[1]} days left · resets ${quotaReset[2]}` : `เหลือ ${quotaReset[1]} วัน · รีเซ็ต ${quotaReset[2]}`;
  }
  const translateUnit = (unit: string) => {
    if (locale === "en-US") {
      return unit === "秒" ? "seconds" : unit === "分钟" ? "minutes" : unit === "小时" ? "hours" : unit === "天" ? "days" : unit;
    }
    return unit === "秒" ? "วินาที" : unit === "分钟" ? "นาที" : unit === "小时" ? "ชั่วโมง" : unit === "天" ? "วัน" : unit;
  };
  const translateDuration = (text: string) => text.replace(/(秒|分钟|小时|天)/g, (unit) => translateUnit(unit));
  const translateStopReasonCode = (reason: string) => {
    const labels: Record<string, string> = {
      max_reviews: staticText[locale]["达到采集上限"],
      no_more_comments: staticText[locale]["没有更多评论"],
      cursor_stalled: staticText[locale]["游标未推进"],
      idle_no_progress: staticText[locale]["连续无新增"],
      timeout: staticText[locale]["采集超时"],
      no_comments_found: staticText[locale]["未发现评论"],
      no_rows: locale === "en-US" ? "No valid rows" : "ไม่มีรายการที่ใช้ได้"
    };
    return labels[reason] || reason;
  };
  const translateChannelErrorDetail = (text: string) =>
    text
      .split("，")
      .map((part) => {
        const apiRequests = part.match(/^请求\s+(\d+)$/);
        if (apiRequests) return locale === "en-US" ? `requests ${apiRequests[1]}` : `คำขอ ${apiRequests[1]}`;
        const apiComments = part.match(/^接口评论\s+(\d+)$/);
        if (apiComments) return locale === "en-US" ? `API comments ${apiComments[1]}` : `คอมเมนต์ API ${apiComments[1]}`;
        const cursor = part.match(/^游标\s+(.+)$/);
        if (cursor) return locale === "en-US" ? `cursor ${cursor[1]}` : `เคอร์เซอร์ ${cursor[1]}`;
        const hasMore = part.match(/^还有更多\s+(是|否)$/);
        if (hasMore) {
          const value = hasMore[1] === "是";
          return locale === "en-US" ? `has more ${value ? "yes" : "no"}` : `ยังมีต่อ ${value ? "ใช่" : "ไม่ใช่"}`;
        }
        return translateStopReasonCode(part);
      })
      .join(locale === "en-US" ? ", " : ", ");
  const translateQueueIssuePart = (part: string) => {
    const queueError = part.match(/^(\d+)\s+个队列连接异常$/);
    if (queueError) return locale === "en-US" ? `${queueError[1]} queue connection errors` : `คิวเชื่อมต่อผิดปกติ ${queueError[1]} รายการ`;
    const pausedQueue = part.match(/^(\d+)\s+个队列暂停$/);
    if (pausedQueue) return locale === "en-US" ? `${pausedQueue[1]} paused queues` : `คิวหยุดชั่วคราว ${pausedQueue[1]} รายการ`;
    const integrity = part.match(/^(\d+)\s+个一致性告警$/);
    if (integrity) return locale === "en-US" ? `${integrity[1]} integrity alerts` : `alert ความสอดคล้อง ${integrity[1]} รายการ`;
    const stalled = part.match(/^(\d+)\s+个疑似卡住任务$/);
    if (stalled) return locale === "en-US" ? `${stalled[1]} likely stalled tasks` : `งานที่อาจค้าง ${stalled[1]} รายการ`;
    const bullFailed = part.match(/^BullMQ 失败\s+(\d+)\s+个$/);
    if (bullFailed) return locale === "en-US" ? `BullMQ failed ${bullFailed[1]}` : `BullMQ ล้มเหลว ${bullFailed[1]} รายการ`;
    const dbFailed = part.match(/^数据库失败\s+(\d+)\s+个$/);
    if (dbFailed) return locale === "en-US" ? `Database failed ${dbFailed[1]}` : `ฐานข้อมูลล้มเหลว ${dbFailed[1]} รายการ`;
    const recentFailed = part.match(/^最近失败\s+(\d+)\s+个$/);
    if (recentFailed) return locale === "en-US" ? `Recent failures ${recentFailed[1]}` : `ล้มเหลวล่าสุด ${recentFailed[1]} รายการ`;
    return part;
  };
  const translateQueueIssueList = (text: string) => text.split("，").map(translateQueueIssuePart).join(locale === "en-US" ? ", " : "、");
  const taskCount = value.match(/^(\d+)\s*个任务$/);
  if (taskCount) {
    return locale === "en-US" ? `${taskCount[1]} tasks` : `${taskCount[1]} งาน`;
  }
  const enabledCount = value.match(/^(\d+)\s*个已启用$/);
  if (enabledCount) {
    return locale === "en-US" ? `${enabledCount[1]} enabled` : `เปิดใช้ ${enabledCount[1]} รายการ`;
  }
  const questionCount = value.match(/^(\d+)\s*个问题$/);
  if (questionCount) {
    return locale === "en-US" ? `${questionCount[1]} questions` : `${questionCount[1]} คำถาม`;
  }
  const categoryCount = value.match(/^(\d+)\s*类$/);
  if (categoryCount) {
    return locale === "en-US" ? `${categoryCount[1]} categories` : `${categoryCount[1]} หมวดหมู่`;
  }
  const commentCount = value.match(/^(\d+)\s*条评论$/);
  if (commentCount) {
    return locale === "en-US" ? `${commentCount[1]} comments` : `${commentCount[1]} คอมเมนต์`;
  }
  const sampleCount = value.match(/^(\d+)\s*条样本$/);
  if (sampleCount) {
    return locale === "en-US" ? `${sampleCount[1]} samples` : `${sampleCount[1]} ตัวอย่าง`;
  }
  const relatedCommentCount = value.match(/^(\d+)\s*条相关评论$/);
  if (relatedCommentCount) {
    return locale === "en-US" ? `${relatedCommentCount[1]} related comments` : `${relatedCommentCount[1]} คอมเมนต์ที่เกี่ยวข้อง`;
  }
  const viewCount = value.match(/^浏览\s+([\d,]+)\s+次$/);
  if (viewCount) {
    return locale === "en-US" ? `${viewCount[1]} views` : `ดู ${viewCount[1]} ครั้ง`;
  }
  const snapshotAt = value.match(/^快照\s+(.+)$/);
  if (snapshotAt) {
    return locale === "en-US" ? `Snapshot ${snapshotAt[1]}` : `snapshot ${snapshotAt[1]}`;
  }
  const generatedAt = value.match(/^生成时间\s+(.+)$/);
  if (generatedAt) {
    return locale === "en-US" ? `Generated ${generatedAt[1]}` : `สร้างเมื่อ ${generatedAt[1]}`;
  }
  const lowValueDownweighted = value.match(/^低价值评论\s+([\d.]+)%\s+已降权$/);
  if (lowValueDownweighted) {
    return locale === "en-US"
      ? `Low-value comments ${lowValueDownweighted[1]}% downweighted`
      : `คอมเมนต์มูลค่าต่ำ ${lowValueDownweighted[1]}% ถูกลดน้ำหนัก`;
  }
  const reportLanguageProfile = value.match(/^主语言\s+(.+)\s+·\s+翻译覆盖\s+([\d.]+)%\s+·\s+混合\s+([\d.]+)%$/);
  if (reportLanguageProfile) {
    return locale === "en-US"
      ? `Primary language ${reportLanguageProfile[1]} · translation coverage ${reportLanguageProfile[2]}% · mixed ${reportLanguageProfile[3]}%`
      : `ภาษาหลัก ${reportLanguageProfile[1]} · ครอบคลุมการแปล ${reportLanguageProfile[2]}% · ผสม ${reportLanguageProfile[3]}%`;
  }
  const starCount = value.match(/^(\d+)\s*星$/);
  if (starCount) {
    return locale === "en-US" ? `${starCount[1]} star${starCount[1] === "1" ? "" : "s"}` : `${starCount[1]} ดาว`;
  }
  const starSentiment = value.match(/^(\d+)\s*星(正向|中性|负向)$/);
  if (starSentiment) {
    const sentiment = staticText[locale][starSentiment[2]] || starSentiment[2];
    return locale === "en-US"
      ? `${starSentiment[1]} star${starSentiment[1] === "1" ? "" : "s"} ${sentiment}`
      : `${starSentiment[1]} ดาว ${sentiment}`;
  }
  const activeFilterCount = value.match(/^已启用\s+(\d+)\s+个筛选$/);
  if (activeFilterCount) {
    return locale === "en-US" ? `${activeFilterCount[1]} filters enabled` : `เปิดใช้ตัวกรอง ${activeFilterCount[1]} รายการ`;
  }
  const reportIssueAction = value.match(/^报告中发现\s+([\d,]+)\s+条相关评论。建议定位样本证据、确认影响范围，并安排负责人跟进解决。$/);
  if (reportIssueAction) {
    return locale === "en-US"
      ? `The report found ${reportIssueAction[1]} related comments. Review sample evidence, confirm the impact scope, and assign an owner to follow up.`
      : `รายงานพบคอมเมนต์ที่เกี่ยวข้อง ${reportIssueAction[1]} รายการ ควรตรวจหลักฐานตัวอย่าง ยืนยันขอบเขตผลกระทบ และมอบหมายผู้รับผิดชอบติดตาม`;
  }
  const linkedEvidenceCount = value.match(/^正在查看「(.+)」关联的\s+([\d,]+)\s+条评论证据$/);
  if (linkedEvidenceCount) {
    const label = staticText[locale][linkedEvidenceCount[1]] || linkedEvidenceCount[1];
    return locale === "en-US"
      ? `Viewing ${linkedEvidenceCount[2]} comment evidence items linked to "${label}"`
      : `กำลังดูหลักฐานคอมเมนต์ ${linkedEvidenceCount[2]} รายการที่เกี่ยวข้องกับ "${label}"`;
  }
  const evidenceCount = value.match(/^正在查看\s+([\d,]+)\s+条评论证据$/);
  if (evidenceCount) {
    return locale === "en-US" ? `Viewing ${evidenceCount[1]} comment evidence items` : `กำลังดูหลักฐานคอมเมนต์ ${evidenceCount[1]} รายการ`;
  }
  const relatedEvidence = value.match(/^正在查看「(.+)」相关评论证据$/);
  if (relatedEvidence) {
    const label = staticText[locale][relatedEvidence[1]] || relatedEvidence[1];
    return locale === "en-US" ? `Viewing comment evidence related to "${label}"` : `กำลังดูหลักฐานคอมเมนต์ที่เกี่ยวข้องกับ "${label}"`;
  }
  const headerComments = value.match(/^评论\s+([\d,]+)$/);
  if (headerComments) {
    return locale === "en-US" ? `Comments: ${headerComments[1]}` : `คอมเมนต์ ${headerComments[1]}`;
  }
  const headerViews = value.match(/^浏览\s+([\d,]+)$/);
  if (headerViews) {
    return locale === "en-US" ? `Views: ${headerViews[1]}` : `ยอดดู ${headerViews[1]}`;
  }
  const alertCount = value.match(/^(\d+)\s*条$/);
  if (alertCount) {
    return locale === "en-US" ? `${alertCount[1]} items` : `${alertCount[1]} รายการ`;
  }
  const groupSampleCount = value.match(/^全量\s+(\d+)\s+条，当前样本\s+(\d+)\s+条$/);
  if (groupSampleCount) {
    return locale === "en-US"
      ? `Total ${groupSampleCount[1]}, current sample ${groupSampleCount[2]}`
      : `ทั้งหมด ${groupSampleCount[1]} รายการ, ตัวอย่างปัจจุบัน ${groupSampleCount[2]} รายการ`;
  }
  const activeCrawlJobs = value.match(/^(\d+)\s*个任务正在排队或抓取$/);
  if (activeCrawlJobs) {
    return locale === "en-US" ? `${activeCrawlJobs[1]} tasks queued or crawling` : `${activeCrawlJobs[1]} งานรอคิวหรือกำลังเก็บ`;
  }
  const speedReports = value.match(/^(\d+)\s*个任务有速度回传$/);
  if (speedReports) {
    return locale === "en-US" ? `${speedReports[1]} tasks reporting speed` : `${speedReports[1]} งานส่งความเร็วกลับมา`;
  }
  const sourceFacetCount = value.match(/^覆盖该任务全部\s+(\d+)\s+个来源$/);
  if (sourceFacetCount) {
    return locale === "en-US"
      ? `Covers all ${sourceFacetCount[1]} sources in this task`
      : `ครอบคลุมแหล่งที่มาทั้งหมด ${sourceFacetCount[1]} รายการในงานนี้`;
  }
  const activeAnalysisRuns = value.match(/^(\d+)\s*个批次正在排队或分析$/);
  if (activeAnalysisRuns) {
    return locale === "en-US" ? `${activeAnalysisRuns[1]} runs queued or analyzing` : `${activeAnalysisRuns[1]} รอบรอคิวหรือกำลังวิเคราะห์`;
  }
  const activeRunFailures = value.match(/^运行批次失败\s+(\d+)\s+条$/);
  if (activeRunFailures) {
    return locale === "en-US" ? `Running runs failed ${activeRunFailures[1]} items` : `รอบที่กำลังทำงานล้มเหลว ${activeRunFailures[1]} รายการ`;
  }
  const analysisStatusFilter = value.match(/^(全部|草稿|已导入|分析中|已完成|失败)\s+([\d,]+)$/);
  if (analysisStatusFilter) {
    const labels: Record<string, Record<Exclude<AppLocale, "zh-CN">, string>> = {
      全部: { "en-US": "All", "th-TH": "ทั้งหมด" },
      草稿: { "en-US": "Draft", "th-TH": "ฉบับร่าง" },
      已导入: { "en-US": "Imported", "th-TH": "นำเข้าแล้ว" },
      分析中: { "en-US": "Analyzing", "th-TH": "กำลังวิเคราะห์" },
      已完成: { "en-US": "Completed", "th-TH": "เสร็จแล้ว" },
      失败: { "en-US": "Failed", "th-TH": "ล้มเหลว" }
    };
    return `${labels[analysisStatusFilter[1]][locale]} ${analysisStatusFilter[2]}`;
  }
  const latestAnalysis = value.match(/^最新分析：(.+)$/);
  if (latestAnalysis) {
    const status = staticText[locale][latestAnalysis[1]] || latestAnalysis[1];
    return locale === "en-US" ? `Latest analysis: ${status}` : `วิเคราะห์ล่าสุด: ${status}`;
  }
  const processedProgress = value.match(/^已处理\s+([\d,]+)\/([\d,]+)$/);
  if (processedProgress) {
    return locale === "en-US"
      ? `Processed ${processedProgress[1]}/${processedProgress[2]}`
      : `ประมวลผลแล้ว ${processedProgress[1]}/${processedProgress[2]}`;
  }
  const processedSuccessFailure = value.match(/^已处理\s+([\d,]+)\/([\d,]+)，成功\s+([\d,]+)，失败\s+([\d,]+)$/);
  if (processedSuccessFailure) {
    return locale === "en-US"
      ? `Processed ${processedSuccessFailure[1]}/${processedSuccessFailure[2]}, succeeded ${processedSuccessFailure[3]}, failed ${processedSuccessFailure[4]}`
      : `ประมวลผลแล้ว ${processedSuccessFailure[1]}/${processedSuccessFailure[2]}, สำเร็จ ${processedSuccessFailure[3]}, ล้มเหลว ${processedSuccessFailure[4]}`;
  }
  const successCount = value.match(/^成功\s+([\d,]+)$/);
  if (successCount) {
    return locale === "en-US" ? `Succeeded ${successCount[1]}` : `สำเร็จ ${successCount[1]}`;
  }
  const failedCount = value.match(/^失败\s+([\d,]+)$/);
  if (failedCount) {
    return locale === "en-US" ? `Failed ${failedCount[1]}` : `ล้มเหลว ${failedCount[1]}`;
  }
  const queuePosition = value.match(/^排队第\s+([\d,]+)\s+位$/);
  if (queuePosition) {
    return locale === "en-US" ? `Queue position ${queuePosition[1]}` : `ลำดับคิว ${queuePosition[1]}`;
  }
  const failureRate = value.match(/^失败率\s+([\d.]+)%$/);
  if (failureRate) {
    return locale === "en-US" ? `Failure rate ${failureRate[1]}%` : `อัตราล้มเหลว ${failureRate[1]}%`;
  }
  const taskFailureAdvice = value.match(/^失败率\s+([\d.]+)%，建议抽查错误日志和失败样本，必要时降低批次大小后重试。$/);
  if (taskFailureAdvice) {
    return locale === "en-US"
      ? `Failure rate ${taskFailureAdvice[1]}%. Review error logs and failed samples, then lower batch size and retry if needed.`
      : `อัตราล้มเหลว ${taskFailureAdvice[1]}% ควรตรวจบันทึกข้อผิดพลาดและตัวอย่างที่ล้มเหลว ลด batch แล้ว retry หากจำเป็น`;
  }
  const runFailureAdvice = value.match(/^失败率\s+([\d.]+)%，建议查看错误日志，必要时降低批次大小或改用更稳定模型重试。$/);
  if (runFailureAdvice) {
    return locale === "en-US"
      ? `Failure rate ${runFailureAdvice[1]}%. Check error logs, then lower batch size or retry with a more stable model if needed.`
      : `อัตราล้มเหลว ${runFailureAdvice[1]}% ควรดูบันทึกข้อผิดพลาด ลด batch หรือเปลี่ยนเป็นโมเดลที่เสถียรกว่าแล้ว retry หากจำเป็น`;
  }
  const requestException = value.match(/^请求异常\s+(\d+)$/);
  if (requestException) {
    return locale === "en-US" ? `Request error ${requestException[1]}` : `คำขอผิดปกติ ${requestException[1]}`;
  }
  const requestAuthStatus = value.match(/^平台接口返回\s+(\d+)，疑似登录态失效、权限不足或评论区不可公开访问$/);
  if (requestAuthStatus) {
    return locale === "en-US"
      ? `Platform API returned ${requestAuthStatus[1]}. Login may be invalid, permissions may be insufficient, or the comment area may not be public.`
      : `API แพลตฟอร์มส่งกลับ ${requestAuthStatus[1]} สถานะล็อกอินอาจหมดอายุ สิทธิ์ไม่พอ หรือพื้นที่คอมเมนต์ไม่เปิดสาธารณะ`;
  }
  const requestServerStatus = value.match(/^平台接口返回\s+(\d+)，疑似平台服务异常、代理链路异常或临时风控$/);
  if (requestServerStatus) {
    return locale === "en-US"
      ? `Platform API returned ${requestServerStatus[1]}. The platform service, proxy path, or temporary risk control may be abnormal.`
      : `API แพลตฟอร์มส่งกลับ ${requestServerStatus[1]} บริการแพลตฟอร์ม เส้นทาง proxy หรือระบบป้องกันชั่วคราวอาจผิดปกติ`;
  }
  const requestRejectedStatus = value.match(/^平台接口返回\s+(\d+)，请求已被平台拒绝或参数不被接受$/);
  if (requestRejectedStatus) {
    return locale === "en-US"
      ? `Platform API returned ${requestRejectedStatus[1]}. The request was rejected by the platform, or the parameters were not accepted.`
      : `API แพลตฟอร์มส่งกลับ ${requestRejectedStatus[1]} คำขอถูกแพลตฟอร์มปฏิเสธ หรือพารามิเตอร์ไม่ถูกยอมรับ`;
  }
  const uncovered = value.match(/^平台仍约有\s+([\d,]+)\s+条未覆盖，可提高采集上限或用监听任务继续补采。$/);
  if (uncovered) {
    return locale === "en-US"
      ? `About ${uncovered[1]} platform comments remain uncovered. Increase the crawl limit or use monitor tasks to continue collection.`
      : `ยังมีคอมเมนต์บนแพลตฟอร์มประมาณ ${uncovered[1]} รายการที่ยังไม่ครอบคลุม เพิ่มขีดจำกัดหรือใช้การติดตามเพื่อเก็บต่อ`;
  }
  const approximateRows = value.match(/^约\s+([\d,]+)\s+条$/);
  if (approximateRows) {
    return locale === "en-US" ? `About ${approximateRows[1]}` : `ประมาณ ${approximateRows[1]} รายการ`;
  }
  const queueHealthError = value.match(/^队列健康异常：(.+)$/);
  if (queueHealthError) {
    return locale === "en-US" ? `Queue health issue: ${translateQueueIssueList(queueHealthError[1])}` : `สถานะคิวผิดปกติ: ${translateQueueIssueList(queueHealthError[1])}`;
  }
  const stalledSummary = value.match(/^发现\s+(\d+)\s+个疑似卡住任务$/);
  if (stalledSummary) {
    return locale === "en-US" ? `Found ${stalledSummary[1]} likely stalled tasks` : `พบงานที่อาจค้าง ${stalledSummary[1]} รายการ`;
  }
  const queueFailureSummary = value.match(/^队列可消费，但仍有失败记录：(.+)$/);
  if (queueFailureSummary) {
    return locale === "en-US"
      ? `Queue is consuming, but failures remain: ${translateQueueIssueList(queueFailureSummary[1])}`
      : `คิวยังประมวลผลได้ แต่ยังมีประวัติล้มเหลว: ${translateQueueIssueList(queueFailureSummary[1])}`;
  }
  const queueActive = value.match(/^队列正在正常处理\s+(\d+)\s+个待消费任务$/);
  if (queueActive) {
    return locale === "en-US" ? `Queue is processing ${queueActive[1]} pending tasks normally` : `คิวกำลังประมวลผลงานรอ ${queueActive[1]} รายการตามปกติ`;
  }
  const ratePerMinute = value.match(/^([\d.]+)\/分钟$/);
  if (ratePerMinute) {
    return locale === "en-US" ? `${ratePerMinute[1]}/min` : `${ratePerMinute[1]}/นาที`;
  }
  const longestSilent = value.match(/^最长静默\s+(.+)\s+·\s+(.+)$/);
  if (longestSilent) {
    const duration = translateDuration(longestSilent[1]);
    return locale === "en-US" ? `Longest silent ${duration} · ${longestSilent[2]}` : `เงียบนานสุด ${duration} · ${longestSilent[2]}`;
  }
  const longestNoLogs = value.match(/^最长无日志\s+(.+)\s+·\s+(.+)$/);
  if (longestNoLogs) {
    const duration = translateDuration(longestNoLogs[1]);
    return locale === "en-US" ? `Longest without logs ${duration} · ${longestNoLogs[2]}` : `ไม่มีบันทึกนานสุด ${duration} · ${longestNoLogs[2]}`;
  }
  const likelyNoLogs = value.match(/^疑似无日志\s+(.+)$/);
  if (likelyNoLogs) {
    const duration = translateDuration(likelyNoLogs[1]);
    return locale === "en-US" ? `Likely no logs ${duration}` : `อาจไม่มีบันทึก ${duration}`;
  }
  const durationAgo = value.match(/^(\d+\s*(?:秒|分钟|小时|天)(?:\s+\d+\s*(?:秒|分钟|小时|天))?)前$/);
  if (durationAgo) {
    const duration = translateDuration(durationAgo[1]);
    return locale === "en-US" ? `${duration} ago` : `${duration}ที่แล้ว`;
  }
  const bareDuration = value.match(/^(\d+\s*(?:秒|分钟|小时|天)(?:\s+\d+\s*(?:秒|分钟|小时|天))?)$/);
  if (bareDuration) {
    return translateDuration(bareDuration[1]);
  }
  const lastLog = value.match(/^最后日志\s+(.+)前$/);
  if (lastLog) {
    return locale === "en-US" ? `Last log ${translateDuration(lastLog[1])} ago` : `บันทึกล่าสุด ${translateDuration(lastLog[1])}ที่แล้ว`;
  }
  const silentFor = value.match(/^已静默\s+(.+)$/);
  if (silentFor) {
    const duration = translateDuration(silentFor[1]);
    return locale === "en-US" ? `Silent for ${duration}` : `เงียบมา ${duration}`;
  }
  const fetchedWithImportAndDuplicate = value.match(/^已抓取\s+(.+)\/(.+)，导入\s+(.+)，重复跳过\s+(.+)$/);
  if (fetchedWithImportAndDuplicate) {
    const max = fetchedWithImportAndDuplicate[2] === "不限" ? unlimited : fetchedWithImportAndDuplicate[2];
    return locale === "en-US"
      ? `Fetched ${fetchedWithImportAndDuplicate[1]}/${max}, imported ${fetchedWithImportAndDuplicate[3]}, duplicates skipped ${fetchedWithImportAndDuplicate[4]}`
      : `เก็บแล้ว ${fetchedWithImportAndDuplicate[1]}/${max}, นำเข้า ${fetchedWithImportAndDuplicate[3]}, ข้ามซ้ำ ${fetchedWithImportAndDuplicate[4]}`;
  }
  const fetchedWithImport = value.match(/^已抓取\s+(.+)\/(.+)，导入\s+(.+)$/);
  if (fetchedWithImport) {
    const max = fetchedWithImport[2] === "不限" ? unlimited : fetchedWithImport[2];
    return locale === "en-US"
      ? `Fetched ${fetchedWithImport[1]}/${max}, imported ${fetchedWithImport[3]}`
      : `เก็บแล้ว ${fetchedWithImport[1]}/${max}, นำเข้า ${fetchedWithImport[3]}`;
  }
  const fetched = value.match(/^已抓取\s+(.+)\/(.+)$/);
  if (fetched) {
    const max = fetched[2] === "不限" ? unlimited : fetched[2];
    return locale === "en-US" ? `Fetched ${fetched[1]}/${max}` : `เก็บแล้ว ${fetched[1]}/${max}`;
  }
  const targetCoverage = value.match(/^目标覆盖\s+(\d+)%$/);
  if (targetCoverage) {
    return locale === "en-US" ? `Target coverage ${targetCoverage[1]}%` : `ครอบคลุมเป้าหมาย ${targetCoverage[1]}%`;
  }
  const platformCoverage = value.match(/^平台覆盖\s+(\d+)%$/);
  if (platformCoverage) {
    return locale === "en-US" ? `Platform coverage ${platformCoverage[1]}%` : `ครอบคลุมแพลตฟอร์ม ${platformCoverage[1]}%`;
  }
  const approxRows = value.match(/^约\s+([\d,]+)\s+条$/);
  if (approxRows) {
    return locale === "en-US" ? `about ${approxRows[1]} rows` : `ประมาณ ${approxRows[1]} รายการ`;
  }
  const processedWithFailures = value.match(/^已处理\s+(.+)\/(.+)，失败\s+(.+)$/);
  if (processedWithFailures) {
    return locale === "en-US"
      ? `Processed ${processedWithFailures[1]}/${processedWithFailures[2]}, failed ${processedWithFailures[3]}`
      : `ประมวลผลแล้ว ${processedWithFailures[1]}/${processedWithFailures[2]}, ล้มเหลว ${processedWithFailures[3]}`;
  }
  const failedProgress = value.match(/^(.+)\/(.+)，失败\s+(.+)$/);
  if (failedProgress) {
    return locale === "en-US"
      ? `${failedProgress[1]}/${failedProgress[2]}, failed ${failedProgress[3]}`
      : `${failedProgress[1]}/${failedProgress[2]}, ล้มเหลว ${failedProgress[3]}`;
  }
  const nextRun = value.match(/^下次：(.+)$/);
  if (nextRun) {
    return locale === "en-US" ? `Next: ${nextRun[1]}` : `ครั้งถัดไป: ${nextRun[1]}`;
  }
  const createdAt = value.match(/^创建于\s+(.+)$/);
  if (createdAt) {
    return locale === "en-US" ? `Created ${createdAt[1]}` : `สร้างเมื่อ ${createdAt[1]}`;
  }
  const every = value.match(/^每\s+(\d+)\s+(分钟|小时|天)$/);
  if (every) {
    return locale === "en-US" ? `Every ${every[1]} ${translateUnit(every[2])}` : `ทุก ${every[1]} ${translateUnit(every[2])}`;
  }
  const related = value.match(/^关联\s+(\d+)\s+条评论$/);
  if (related) {
    return locale === "en-US" ? `${related[1]} related comments` : `เกี่ยวข้อง ${related[1]} คอมเมนต์`;
  }
  const countPercent = value.match(/^([\d,]+)\s+条\s+·\s+([\d.]+)%$/);
  if (countPercent) {
    return locale === "en-US" ? `${countPercent[1]} items · ${countPercent[2]}%` : `${countPercent[1]} รายการ · ${countPercent[2]}%`;
  }
  const lowValueDemoted = value.match(/^低价值评论\s+([\d.]+)%\s+已降权$/);
  if (lowValueDemoted) {
    return locale === "en-US"
      ? `Low-value comments ${lowValueDemoted[1]}% downweighted`
      : `ลดน้ำหนักคอมเมนต์มูลค่าต่ำ ${lowValueDemoted[1]}%`;
  }
  const languageProfile = value.match(/^非中文\/混合评论，主语言\s+(.+)$/);
  if (languageProfile) {
    return locale === "en-US"
      ? `Non-Chinese / mixed comments, primary language ${languageProfile[1]}`
      : `คอมเมนต์ไม่ใช่จีน/ผสม ภาษาหลัก ${languageProfile[1]}`;
  }
  const dominantEvidence = value.match(/^(正向|中性|负向)为主\s+·\s+([\d,]+)\s+条证据$/);
  if (dominantEvidence) {
    const sentiment = staticText[locale][dominantEvidence[1]] || dominantEvidence[1];
    return locale === "en-US"
      ? `Mostly ${sentiment} · ${dominantEvidence[2]} evidence items`
      : `ส่วนใหญ่${sentiment} · หลักฐาน ${dominantEvidence[2]} รายการ`;
  }
  const commentClusterMeta = value.match(/^([\d,]+)\s+条评论\s+·\s+([\d.]+)%\s+·\s+(.+)$/);
  if (commentClusterMeta) {
    const sentiment = staticText[locale][commentClusterMeta[3]] || commentClusterMeta[3];
    return locale === "en-US"
      ? `${commentClusterMeta[1]} comments · ${commentClusterMeta[2]}% · ${sentiment}`
      : `${commentClusterMeta[1]} คอมเมนต์ · ${commentClusterMeta[2]}% · ${sentiment}`;
  }
  const updatedTo = value.match(/^已更新为(.+)。$/);
  if (updatedTo) {
    const status = staticText[locale][updatedTo[1]] || updatedTo[1];
    return locale === "en-US" ? `Updated to ${status}.` : `อัปเดตเป็น${status}แล้ว`;
  }
  const totalTasks = value.match(/^共\s+([\d,]+)\s+个任务$/);
  if (totalTasks) {
    return locale === "en-US" ? `Total ${totalTasks[1]} tasks` : `ทั้งหมด ${totalTasks[1]} งาน`;
  }
  const activePageCrawlJobs = value.match(/^([\d,]+)\s+个当前页任务正在排队或抓取$/);
  if (activePageCrawlJobs) {
    return locale === "en-US"
      ? `${activePageCrawlJobs[1]} tasks on this page are queued or crawling`
      : `งานในหน้านี้ ${activePageCrawlJobs[1]} งานกำลังรอคิวหรือเก็บข้อมูล`;
  }
  const uncoveredPageCrawlJobs = value.match(/^([\d,]+)\s+个当前页任务未覆盖完$/);
  if (uncoveredPageCrawlJobs) {
    return locale === "en-US"
      ? `${uncoveredPageCrawlJobs[1]} tasks on this page still have uncovered comments`
      : `งานในหน้านี้ ${uncoveredPageCrawlJobs[1]} งานยังมีคอมเมนต์ที่ไม่ครอบคลุม`;
  }
  const runningJobs = value.match(/^([\d,]+)\s+个运行中$/);
  if (runningJobs) {
    return locale === "en-US" ? `${runningJobs[1]} running` : `กำลังทำงาน ${runningJobs[1]} งาน`;
  }
  const deleteMonitorConfirm = value.match(/^确定删除监听任务「(.+)」吗？历史采集记录和分析任务不会被删除。$/);
  if (deleteMonitorConfirm) {
    return locale === "en-US"
      ? `Delete monitor task "${deleteMonitorConfirm[1]}"? Historical crawl records and analysis tasks will not be deleted.`
      : `ลบงานติดตาม "${deleteMonitorConfirm[1]}" หรือไม่? ประวัติการเก็บข้อมูลและงานวิเคราะห์จะไม่ถูกลบ`;
  }
  const passwordReset = value.match(/^密码已重置为\s+(.+)$/);
  if (passwordReset) {
    return locale === "en-US" ? `Password reset to ${passwordReset[1]}` : `รีเซ็ตรหัสผ่านเป็น ${passwordReset[1]} แล้ว`;
  }
  const inviteCreated = value.match(/^邀请码已生成：(.+)$/);
  if (inviteCreated) {
    return locale === "en-US" ? `Invite code generated: ${inviteCreated[1]}` : `สร้างโค้ดเชิญแล้ว: ${inviteCreated[1]}`;
  }
  const workspaceDeleted = value.match(/^工作空间「(.+)」已删除$/);
  if (workspaceDeleted) {
    return locale === "en-US" ? `Workspace "${workspaceDeleted[1]}" deleted` : `ลบพื้นที่ทำงาน "${workspaceDeleted[1]}" แล้ว`;
  }
  const savedApiKeyPlaceholder = value.match(/^已保存（(.+)），输入新密钥可替换$/);
  if (savedApiKeyPlaceholder) {
    const keyLabel = staticText[locale][savedApiKeyPlaceholder[1]] || savedApiKeyPlaceholder[1];
    return locale === "en-US" ? `Saved (${keyLabel}). Enter a new key to replace it` : `บันทึกแล้ว (${keyLabel}) กรอก key ใหม่เพื่อแทนที่`;
  }
  const samples = value.match(/^(.+)\s+条相关评论\s+·\s+(.+)\s+条样本$/);
  if (samples) {
    return locale === "en-US"
      ? `${samples[1]} related comments · ${samples[2]} samples`
      : `${samples[1]} คอมเมนต์ที่เกี่ยวข้อง · ${samples[2]} ตัวอย่าง`;
  }
  const recentError = value.match(/^最近错误：(.+)$/);
  if (recentError) {
    return locale === "en-US" ? `Recent error: ${recentError[1]}` : `ข้อผิดพลาดล่าสุด: ${recentError[1]}`;
  }
  const tiktokDirectFallback = value.match(/^TikTok 直连接口：直连接口未返回有效评论（(.+)），已切换浏览器兜底$/);
  if (tiktokDirectFallback) {
    const detail = translateChannelErrorDetail(tiktokDirectFallback[1]);
    return locale === "en-US"
      ? `TikTok direct API: no valid comments returned (${detail}); switched to browser fallback`
      : `TikTok direct API: ไม่พบคอมเมนต์ที่ใช้ได้ (${detail}); สลับไปใช้ browser fallback`;
  }
  const tiktokDirectError = value.match(/^TikTok 直连接口：(.+)$/);
  if (tiktokDirectError) {
    return locale === "en-US"
      ? `TikTok direct API: ${tiktokDirectError[1]}`
      : `TikTok direct API: ${tiktokDirectError[1]}`;
  }
  const channelErrors = value.match(/^通道异常\s+(\d+)\s+条$/);
  if (channelErrors) {
    return locale === "en-US" ? `${channelErrors[1]} channel issues` : `ปัญหาช่องทาง ${channelErrors[1]} รายการ`;
  }
  const firstChannelError = value.match(/^首条通道异常\s+(.+)$/);
  if (firstChannelError) {
    const detail: string = translatePattern(firstChannelError[1], locale) || replaceKnownParts(firstChannelError[1], locale);
    return locale === "en-US" ? `First channel issue ${detail}` : `ปัญหาช่องทางรายการแรก ${detail}`;
  }
  const crawlMetricPart = (part: string) => {
    if (part === "部分结果超时") {
      return locale === "en-US" ? "Partial result timed out" : "ผลลัพธ์บางส่วนหมดเวลา";
    }
    const total = part.match(/^平台总量\s+(\d+)$/);
    if (total) return locale === "en-US" ? `Platform total ${total[1]}` : `ทั้งหมดบนแพลตฟอร์ม ${total[1]}`;
    const platformRemaining = part.match(/^平台剩余约\s+(\d+)\s+条$/);
    if (platformRemaining) {
      return locale === "en-US" ? `Platform remaining about ${platformRemaining[1]}` : `เหลือบนแพลตฟอร์มประมาณ ${platformRemaining[1]}`;
    }
    const loadedPages = part.match(/^加载页数\s+(\d+)$/);
    if (loadedPages) return locale === "en-US" ? `Loaded pages ${loadedPages[1]}` : `โหลดแล้ว ${loadedPages[1]} หน้า`;
    const apiRequests = part.match(/^接口请求\s+(\d+)$/);
    if (apiRequests) return locale === "en-US" ? `API requests ${apiRequests[1]}` : `คำขอ API ${apiRequests[1]}`;
    const apiComments = part.match(/^接口评论\s+(\d+)$/);
    if (apiComments) return locale === "en-US" ? `API comments ${apiComments[1]}` : `คอมเมนต์จาก API ${apiComments[1]}`;
    const domComments = part.match(/^DOM 评论\s+(\d+)$/);
    if (domComments) return locale === "en-US" ? `DOM comments ${domComments[1]}` : `คอมเมนต์ DOM ${domComments[1]}`;
    const domTexts = part.match(/^DOM 文本\s+(\d+)$/);
    if (domTexts) return locale === "en-US" ? `DOM texts ${domTexts[1]}` : `ข้อความ DOM ${domTexts[1]}`;
    const loadMore = part.match(/^加载更多\s+(\d+)$/);
    if (loadMore) return locale === "en-US" ? `Load more clicks ${loadMore[1]}` : `คลิกโหลดเพิ่ม ${loadMore[1]}`;
    const cursor = part.match(/^游标\s+(.+)$/);
    if (cursor) return locale === "en-US" ? `Cursor ${cursor[1]}` : `เคอร์เซอร์ ${cursor[1]}`;
    const hasMore = part.match(/^还有更多\s+(是|否)$/);
    if (hasMore) {
      const value = hasMore[1] === "是";
      return locale === "en-US" ? `Has more ${value ? "yes" : "no"}` : `ยังมีต่อ ${value ? "ใช่" : "ไม่ใช่"}`;
    }
    const requestStatus = part.match(/^请求状态\s+(\d+)$/);
    if (requestStatus) return locale === "en-US" ? `HTTP status ${requestStatus[1]}` : `สถานะ HTTP ${requestStatus[1]}`;
    const imported = part.match(/^导入\s+(\d+)$/);
    if (imported) return locale === "en-US" ? `Imported ${imported[1]}` : `นำเข้า ${imported[1]}`;
    const skippedDuplicate = part.match(/^重复跳过\s+(\d+)$/);
    if (skippedDuplicate) return locale === "en-US" ? `Duplicates skipped ${skippedDuplicate[1]}` : `ข้ามซ้ำ ${skippedDuplicate[1]}`;
    const duplicate = part.match(/^重复\s+(\d+)$/);
    if (duplicate) return locale === "en-US" ? `Duplicates ${duplicate[1]}` : `ซ้ำ ${duplicate[1]}`;
    const elapsed = part.match(/^耗时\s+(.+)$/);
    if (elapsed) return locale === "en-US" ? `Elapsed ${translateDuration(elapsed[1])}` : `ใช้เวลา ${translateDuration(elapsed[1])}`;
    const speed = part.match(/^速度\s+([\d.]+)\/分钟$/);
    if (speed) return locale === "en-US" ? `Speed ${speed[1]}/min` : `ความเร็ว ${speed[1]}/นาที`;
    const remaining = part.match(/^预计剩余\s+(.+)$/);
    if (remaining) {
      return locale === "en-US" ? `Est. remaining ${translateDuration(remaining[1])}` : `เหลือประมาณ ${translateDuration(remaining[1])}`;
    }
    const progressEvent = part.match(/^进度回传\s+(.+)$/);
    if (progressEvent) return locale === "en-US" ? `Progress event ${progressEvent[1]}` : `ความคืบหน้า ${progressEvent[1]}`;
    const stopReason = part.match(/^停止原因\s+(.+)$/);
    if (stopReason) {
      const reason = staticText[locale][stopReason[1]] || stopReason[1];
      return locale === "en-US" ? `Stop reason ${reason}` : `เหตุผลที่หยุด ${reason}`;
    }
    const updated = part.match(/^更新于\s+(.+)前$/);
    if (updated) return locale === "en-US" ? `Updated ${translateDuration(updated[1])} ago` : `อัปเดตเมื่อ ${translateDuration(updated[1])}ที่แล้ว`;
    return null;
  };
  const singleCrawlMetric = crawlMetricPart(value);
  if (singleCrawlMetric) {
    return singleCrawlMetric;
  }
  if (value.includes(" · ")) {
    const translatedParts = value.split(" · ").map(crawlMetricPart);
    if (translatedParts.every(Boolean)) {
      return translatedParts.join(" · ");
    }
  }
  return null;
}

function translateText(value: string, locale: AppLocale) {
  const targetLocale = locale === "zh-CN" ? null : locale;
  if (!targetLocale) {
    return value;
  }
  const localeDict = staticText[targetLocale];
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact || !/[\u4e00-\u9fff]/.test(compact)) {
    return value;
  }
  const exact = localeDict[compact];
  if (exact) {
    return withWhitespace(value, exact);
  }
  const patterned = translatePattern(compact, targetLocale);
  if (patterned) {
    return withWhitespace(value, patterned);
  }
  const replaced = replaceKnownParts(compact, targetLocale);
  return replaced !== compact ? withWhitespace(value, replaced) : value;
}

export function translateStaticText(value: string, locale: AppLocale = currentLocale.value) {
  return translateText(value, locale);
}

function shouldSkipNode(node: Node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!element) {
    return true;
  }
  return Boolean(element.closest("script,style,noscript,textarea,code,pre,[data-no-i18n='true']")) || skippedTags.has(element.tagName);
}

function translateAttributes(element: Element, locale: AppLocale) {
  let originals = attrOriginals.get(element);
  for (const attr of translatedAttrs) {
    const current = element.getAttribute(attr);
    if (!current) {
      continue;
    }
    if (!originals) {
      originals = {};
      attrOriginals.set(element, originals);
    }
    if (!originals[attr] || current === originals[attr] || current === translateText(originals[attr], currentLocale.value)) {
      originals[attr] = originals[attr] || current;
    }
    const next = locale === "zh-CN" ? originals[attr] : translateText(originals[attr], locale);
    if (next !== current) {
      element.setAttribute(attr, next);
    }
  }
}

function translateTextNode(node: Text, locale: AppLocale) {
  const current = node.nodeValue || "";
  if (!current.trim() || shouldSkipNode(node)) {
    return;
  }
  const original = textOriginals.get(node) || current;
  textOriginals.set(node, original);
  const next = locale === "zh-CN" ? original : translateText(original, locale);
  if (next !== current) {
    node.nodeValue = next;
  }
}

function translateRoot(root: ParentNode, locale: AppLocale) {
  if (root instanceof Element) {
    translateAttributes(root, locale);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      translateTextNode(current as Text, locale);
    } else if (current.nodeType === Node.ELEMENT_NODE && !shouldSkipNode(current)) {
      translateAttributes(current as Element, locale);
    }
    current = walker.nextNode();
  }
}

function queueTranslate() {
  if (queued) {
    return;
  }
  queued = true;
  window.requestAnimationFrame(() => {
    queued = false;
    translateRoot(document.body, currentLocale.value);
  });
}

export function startStaticTextTranslator() {
  if (started || typeof window === "undefined") {
    return;
  }
  started = true;
  watch(currentLocale, queueTranslate, { immediate: true });
  observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === "childList" || mutation.type === "characterData" || mutation.type === "attributes")) {
      queueTranslate();
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...translatedAttrs]
  });
}
