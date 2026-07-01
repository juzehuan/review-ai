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
    "更多": "More",
    "返回": "Back",
    "返回报告": "Back to report",
    "查看全部": "View all",
    "查看分析": "View analysis",
    "分析报告": "Analysis report",
    "评论列表": "Comment list",
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
    "重试": "Retry",
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
    "请选择一个分析任务查看行动项": "Select an analysis task to view action items",
    "帮助中心": "Help center",
    "用户后台": "User console",
    "超管后台": "Admin console",
    "增长运营": "Growth ops",
    "评论采集": "Comment collection",
    "分析记录": "Analysis records",
    "提示词与模型": "Prompts & models",
    "抓取设置": "Crawler settings",
    "评论明细": "Comment details",
    "数据": "Data",
    "平台管理": "Platform admin",
    "模型与抓取": "Models & crawling",
    "评论采集控制台": "Comment collection console",
    "分析任务": "Analysis tasks",
    "全部任务列表": "All tasks",
    "持续监听任务": "Continuous monitors",
    "采集记录": "Crawl records",
    "采集运行观察": "Crawl runtime watch",
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
    "已采集评论": "Collected comments",
    "待处理异常": "Pending exceptions",
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
    "新建一次性采集": "New one-time crawl",
    "开始采集": "Start crawl",
    "最多采集条数": "Max comments",
    "不限": "unlimited",
    "评论采集已关闭": "Comment collection is disabled",
    "暂不支持该链接": "Unsupported link",
    "未采集到评论": "No comments collected",
    "采集超时": "Crawl timed out",
    "链接解析失败": "Link parsing failed",
    "排队中": "Queued",
    "抓取中": "Crawling",
    "已完成": "Completed",
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
    "未处理": "Open",
    "处理中": "In progress",
    "已归档": "Archived",
    "逾期": "Overdue",
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
    "确定删除该行动项？": "Delete this action item?",
    "行动项已保存。": "Action item saved.",
    "负责人已更新。": "Owner updated.",
    "行动项已删除。": "Action item deleted.",
    "超管": "Admin",
    "用户": "User",
    "平台用户": "Platform users",
    "可用邀请码": "Available invites",
    "用户与配额": "Users & quotas",
    "用户管理": "User management",
    "队列健康": "Queue health",
    "AI 分析队列": "AI analysis queue",
    "评论采集队列": "Comment crawl queue",
    "采集任务库": "Crawl task store",
    "AI 分析批次库": "AI analysis run store",
    "任务队列状态": "Task queue status",
    "数据库任务健康": "Database task health",
    "疑似卡住任务": "Likely stalled tasks",
    "最近失败任务": "Recent failed tasks",
    "任务对象": "Task target",
    "失败对象": "Failed target",
    "渠道/模型": "Channel / model",
    "错误摘要": "Error summary",
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
    "刷新简报": "Refresh brief",
    "每日变化简报": "Daily change brief",
    "今日新增": "New today",
    "负面占比": "Negative rate",
    "平均星级": "Average rating",
    "异常预警": "Alerts",
    "竞品/任务对比": "Competitor / task comparison",
    "多任务趋势对比": "Multi-task trend comparison",
    "开始对比": "Start comparison",
    "当前领先": "Current leader",
    "暂无胜出任务": "No winning task",
    "需关注": "Needs attention",
    "健康": "Healthy",
    "AI 纠错与提示词评测": "AI correction & prompt evaluation",
    "提示词评测": "Prompt evaluation",
    "立即评测": "Evaluate now",
    "未配置模型": "Model not configured",
    "默认版本": "Default version",
    "通过": "Passed",
    "待补强": "Needs improvement",
    "AI 结果纠错": "AI result correction",
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
    "打开报告": "Open report",
    "生成交付链接": "Create delivery link",
    "复制链接": "Copy link",
    "打开交付页": "Open delivery page",
    "使用前先确认": "Check before use",
    "用户可能会问到的问题": "Questions users may ask",
    "搜索问题或答案": "Search questions or answers",
    "账号权限": "Account access",
    "持续监听": "Continuous monitoring",
    "AI 分析": "AI analysis",
    "报告复核": "Report review",
    "移动端": "Mobile",
    "数据安全": "Data security",
    "空间与成员": "Workspace & members",
    "AI 设置": "AI settings",
    "爬虫设置": "Crawler settings",
    "当前空间": "Current workspace",
    "我的角色": "My role",
    "当前空间成员": "Current members",
    "可管理": "Manageable",
    "只读": "Read-only",
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
    "Scrapling 评论抓取": "Scrapling comment crawler",
    "保存爬虫设置": "Save crawler settings",
    "启用链接抓取": "Enable link crawling",
    "Python 命令": "Python command",
    "代理地址": "Proxy URL",
    "默认抓取条数": "Default crawl count",
    "超时时间（秒）": "Timeout (seconds)",
    "我的空间": "My workspaces",
    "切换": "Switch",
    "新建租户空间": "New tenant workspace",
    "创建": "Create",
    "空间名称": "Workspace name",
    "空间标识": "Workspace slug",
    "添加空间成员": "Add member",
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
    "情绪": "Sentiment",
    "意图": "Intent",
    "主题": "Topic",
    "摘要": "Summary",
    "建议": "Suggestion",
    "痛点": "Pain points",
    "亮点": "Highlights",
    "报告": "Report",
    "产品洞察报告": "Product insight report",
    "视频内容反馈报告": "Video feedback report",
    "社媒舆情报告": "Social sentiment report",
    "用户声音": "Customer voice",
    "主要问题": "Main issues",
    "趋势": "Trend",
    "词云": "Word cloud",
    "观众支持度": "Audience support",
    "舆情支持度": "Public support",
    "负向评论": "Negative comments",
    "负向/争议观众": "Negative / disputed viewers",
    "反对/风险评论": "Opposition / risk comments"
  },
  "th-TH": {
    "刷新": "รีเฟรช",
    "自动刷新": "รีเฟรชอัตโนมัติ",
    "手动刷新": "รีเฟรชด้วยตนเอง",
    "保存": "บันทึก",
    "取消": "ยกเลิก",
    "删除": "ลบ",
    "删除中": "กำลังลบ",
    "复制": "คัดลอก",
    "打开": "เปิด",
    "更多": "เพิ่มเติม",
    "返回": "กลับ",
    "返回报告": "กลับไปรายงาน",
    "查看全部": "ดูทั้งหมด",
    "查看分析": "ดูการวิเคราะห์",
    "分析报告": "รายงานวิเคราะห์",
    "评论列表": "รายการคอมเมนต์",
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
    "重试": "ลองใหม่",
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
    "请选择一个分析任务查看行动项": "เลือกงานวิเคราะห์เพื่อดูงานติดตาม",
    "帮助中心": "ศูนย์ช่วยเหลือ",
    "用户后台": "คอนโซลผู้ใช้",
    "超管后台": "คอนโซลผู้ดูแล",
    "增长运营": "ปฏิบัติการเติบโต",
    "评论采集": "เก็บคอมเมนต์",
    "分析记录": "ประวัติวิเคราะห์",
    "提示词与模型": "พรอมป์และโมเดล",
    "抓取设置": "ตั้งค่าการเก็บข้อมูล",
    "评论明细": "รายละเอียดคอมเมนต์",
    "数据": "ข้อมูล",
    "平台管理": "จัดการแพลตฟอร์ม",
    "模型与抓取": "โมเดลและการเก็บข้อมูล",
    "评论采集控制台": "คอนโซลเก็บคอมเมนต์",
    "分析任务": "งานวิเคราะห์",
    "全部任务列表": "รายการงานทั้งหมด",
    "持续监听任务": "งานติดตามต่อเนื่อง",
    "采集记录": "ประวัติการเก็บข้อมูล",
    "采集运行观察": "ดูสถานะการเก็บข้อมูล",
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
    "已采集评论": "คอมเมนต์ที่เก็บแล้ว",
    "待处理异常": "ปัญหาที่ต้องจัดการ",
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
    "新建一次性采集": "สร้างการเก็บครั้งเดียว",
    "开始采集": "เริ่มเก็บข้อมูล",
    "最多采集条数": "จำนวนคอมเมนต์สูงสุด",
    "不限": "ไม่จำกัด",
    "评论采集已关闭": "ปิดการเก็บคอมเมนต์อยู่",
    "暂不支持该链接": "ยังไม่รองรับลิงก์นี้",
    "未采集到评论": "ไม่พบคอมเมนต์",
    "采集超时": "หมดเวลาเก็บข้อมูล",
    "链接解析失败": "แยกลิงก์ไม่สำเร็จ",
    "排队中": "รอคิว",
    "抓取中": "กำลังเก็บ",
    "已完成": "เสร็จแล้ว",
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
    "未处理": "ยังไม่จัดการ",
    "处理中": "กำลังดำเนินการ",
    "已归档": "เก็บถาวรแล้ว",
    "逾期": "เกินกำหนด",
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
    "确定删除该行动项？": "ต้องการลบงานติดตามนี้หรือไม่?",
    "行动项已保存。": "บันทึกงานติดตามแล้ว",
    "负责人已更新。": "อัปเดตผู้รับผิดชอบแล้ว",
    "行动项已删除。": "ลบงานติดตามแล้ว",
    "超管": "ผู้ดูแล",
    "用户": "ผู้ใช้",
    "平台用户": "ผู้ใช้แพลตฟอร์ม",
    "可用邀请码": "โค้ดเชิญที่ใช้ได้",
    "用户与配额": "ผู้ใช้และโควตา",
    "用户管理": "จัดการผู้ใช้",
    "队列健康": "สถานะคิว",
    "AI 分析队列": "คิววิเคราะห์ AI",
    "评论采集队列": "คิวเก็บคอมเมนต์",
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
    "刷新简报": "รีเฟรชสรุป",
    "每日变化简报": "สรุปการเปลี่ยนแปลงรายวัน",
    "今日新增": "เพิ่มวันนี้",
    "负面占比": "สัดส่วนเชิงลบ",
    "平均星级": "คะแนนเฉลี่ย",
    "异常预警": "การแจ้งเตือน",
    "竞品/任务对比": "เทียบคู่แข่ง / งาน",
    "多任务趋势对比": "เปรียบเทียบแนวโน้มหลายงาน",
    "开始对比": "เริ่มเปรียบเทียบ",
    "当前领先": "นำอยู่ตอนนี้",
    "暂无胜出任务": "ยังไม่มีงานที่ชนะ",
    "需关注": "ต้องติดตาม",
    "健康": "ปกติ",
    "AI 纠错与提示词评测": "แก้ผล AI และประเมินพรอมป์",
    "提示词评测": "ประเมินพรอมป์",
    "立即评测": "ประเมินทันที",
    "未配置模型": "ยังไม่ได้ตั้งค่าโมเดล",
    "默认版本": "เวอร์ชันเริ่มต้น",
    "通过": "ผ่าน",
    "待补强": "ต้องปรับปรุง",
    "AI 结果纠错": "แก้ผล AI",
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
    "打开报告": "เปิดรายงาน",
    "生成交付链接": "สร้างลิงก์ส่งมอบ",
    "复制链接": "คัดลอกลิงก์",
    "打开交付页": "เปิดหน้าส่งมอบ",
    "使用前先确认": "ตรวจสอบก่อนใช้งาน",
    "用户可能会问到的问题": "คำถามที่ผู้ใช้อาจถาม",
    "搜索问题或答案": "ค้นหาคำถามหรือคำตอบ",
    "账号权限": "สิทธิ์บัญชี",
    "持续监听": "ติดตามต่อเนื่อง",
    "AI 分析": "วิเคราะห์ AI",
    "报告复核": "ตรวจรายงาน",
    "移动端": "มือถือ",
    "数据安全": "ความปลอดภัยข้อมูล",
    "空间与成员": "พื้นที่และสมาชิก",
    "AI 设置": "ตั้งค่า AI",
    "爬虫设置": "ตั้งค่าตัวเก็บข้อมูล",
    "当前空间": "พื้นที่ปัจจุบัน",
    "我的角色": "บทบาทของฉัน",
    "当前空间成员": "สมาชิกในพื้นที่",
    "可管理": "จัดการได้",
    "只读": "อ่านอย่างเดียว",
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
    "Scrapling 评论抓取": "Scrapling comment crawler",
    "保存爬虫设置": "บันทึกการตั้งค่าตัวเก็บข้อมูล",
    "启用链接抓取": "เปิดเก็บจากลิงก์",
    "Python 命令": "คำสั่ง Python",
    "代理地址": "Proxy URL",
    "默认抓取条数": "จำนวนเก็บเริ่มต้น",
    "超时时间（秒）": "หมดเวลา (วินาที)",
    "我的空间": "พื้นที่ของฉัน",
    "切换": "สลับ",
    "新建租户空间": "สร้างพื้นที่ผู้เช่า",
    "创建": "สร้าง",
    "空间名称": "ชื่อพื้นที่",
    "空间标识": "slug พื้นที่",
    "添加空间成员": "เพิ่มสมาชิกพื้นที่",
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
    "情绪": "อารมณ์",
    "意图": "เจตนา",
    "主题": "หัวข้อ",
    "摘要": "สรุป",
    "建议": "คำแนะนำ",
    "痛点": "Pain points",
    "亮点": "Highlights",
    "报告": "รายงาน",
    "产品洞察报告": "รายงานอินไซต์สินค้า",
    "视频内容反馈报告": "รายงานฟีดแบ็กวิดีโอ",
    "社媒舆情报告": "รายงานกระแสโซเชียล",
    "用户声音": "เสียงผู้ใช้",
    "主要问题": "ปัญหาหลัก",
    "趋势": "แนวโน้ม",
    "词云": "Word cloud",
    "观众支持度": "การสนับสนุนผู้ชม",
    "舆情支持度": "การสนับสนุนสาธารณะ",
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

function translatePattern(value: string, locale: Exclude<AppLocale, "zh-CN">) {
  const unlimited = staticText[locale]["不限"];
  const translateUnit = (unit: string) => {
    if (locale === "en-US") {
      return unit === "秒" ? "seconds" : unit === "分钟" ? "minutes" : unit === "小时" ? "hours" : unit === "天" ? "days" : unit;
    }
    return unit === "秒" ? "วินาที" : unit === "分钟" ? "นาที" : unit === "小时" ? "ชั่วโมง" : unit === "天" ? "วัน" : unit;
  };
  const translateDuration = (text: string) => text.replace(/(秒|分钟|小时|天)/g, (unit) => translateUnit(unit));
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
  const commentCount = value.match(/^(\d+)\s*条评论$/);
  if (commentCount) {
    return locale === "en-US" ? `${commentCount[1]} comments` : `${commentCount[1]} คอมเมนต์`;
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
  const silentFor = value.match(/^已静默\s+(.+)$/);
  if (silentFor) {
    const duration = translateDuration(silentFor[1]);
    return locale === "en-US" ? `Silent for ${duration}` : `เงียบมา ${duration}`;
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
  const samples = value.match(/^(.+)\s+条相关评论\s+·\s+(.+)\s+条样本$/);
  if (samples) {
    return locale === "en-US"
      ? `${samples[1]} related comments · ${samples[2]} samples`
      : `${samples[1]} คอมเมนต์ที่เกี่ยวข้อง · ${samples[2]} ตัวอย่าง`;
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
