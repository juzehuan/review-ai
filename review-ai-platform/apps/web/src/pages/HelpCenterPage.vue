<template>
  <div class="help-page">
    <div class="page-toolbar help-hero">
      <div class="toolbar-title-block">
        <div class="toolbar-title">帮助中心</div>
        <div class="toolbar-subtitle">真实使用中常见的问题、处理建议和排错口径。适合用户自查，也适合管理员统一回复。</div>
      </div>
      <a-space wrap>
        <a-button href="/downloads/ReviewIQ-ordinary-user-manual.docx" download="ReviewIQ-普通用户操作手册.docx">
          <template #icon><DownloadOutlined /></template>
          下载操作手册
        </a-button>
        <a-button @click="router.push('/crawl-jobs')">
          <template #icon><CloudDownloadOutlined /></template>
          评论采集
        </a-button>
        <a-button type="primary" @click="router.push('/analysis-runs')">
          <template #icon><UnorderedListOutlined /></template>
          分析记录
        </a-button>
      </a-space>
    </div>

    <section class="help-band">
      <div>
        <div class="overview-kicker">使用前先确认</div>
        <h2>链接公开可访问，分析类型一定选对，报告结论回到评论原文抽查验证。</h2>
        <p>大多数用户问题都可以先按这三步判断：链接是否可采、任务类型是否匹配、AI 结论是否有原始评论证据。</p>
      </div>
      <div class="help-quick-grid">
        <div v-for="item in quickStats" :key="item.label" class="help-quick-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </section>

    <section class="help-panel">
      <div class="help-panel-head">
        <div>
          <div class="panel-label">FAQ</div>
          <div class="settings-section-title">用户可能会问到的问题</div>
        </div>
        <a-input-search v-model:value="keyword" allow-clear placeholder="搜索问题或答案" class="help-search" />
      </div>

      <div class="help-filter-row">
        <a-segmented v-model:value="activeCategory" :options="categoryOptions" />
        <span>{{ filteredFaqs.length }} 个问题</span>
      </div>

      <div v-if="filteredFaqs.length" class="help-faq-list">
        <article v-for="faq in filteredFaqs" :key="faq.id" class="help-qa-card">
          <div class="help-qa-meta">
            <a-tag>{{ faq.category }}</a-tag>
            <span>#{{ faq.id.toString().padStart(2, "0") }}</span>
          </div>
          <h3>{{ faq.question }}</h3>
          <p>{{ faq.answer }}</p>
        </article>
      </div>
      <a-empty v-else description="没有匹配的问题，换个关键词试试。" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { CloudDownloadOutlined, DownloadOutlined, UnorderedListOutlined } from "@ant-design/icons-vue";

type FaqItem = {
  id: number;
  category: string;
  question: string;
  answer: string;
};

const router = useRouter();
const keyword = ref("");
const activeCategory = ref("全部");

const faqs: FaqItem[] = [
  {
    id: 1,
    category: "账号权限",
    question: "普通用户为什么看不到模型设置、抓取设置？",
    answer: "这是正常的。普通用户只负责采集、分析、查看报告和复核评论；模型、提示词、抓取参数由超管统一配置，避免不同用户配置不一致导致结果混乱。"
  },
  {
    id: 2,
    category: "账号权限",
    question: "我能不能自己改 AI 分析规则？",
    answer: "普通用户不能直接修改。如果发现分析结果明显不符合业务，比如视频评论被当成商品评论分析，需要把任务名称、链接和截图反馈给管理员，由管理员统一调整提示词或模型配置。"
  },
  {
    id: 3,
    category: "账号权限",
    question: "首页的评论额度和分析次数是什么意思？",
    answer: "评论额度表示当前周期内可以采集或处理的评论数量，分析次数表示可以发起 AI 分析的次数。额度不足时需要联系管理员调整。"
  },
  {
    id: 4,
    category: "账号权限",
    question: "我看到的数据是不是所有人的数据？",
    answer: "通常只看到当前账号或当前工作区的数据。不同工作区之间的数据会隔离，具体范围由管理员配置。"
  },
  {
    id: 5,
    category: "评论采集",
    question: "一次性采集和持续监听有什么区别？",
    answer: "一次性采集适合临时分析某条视频或链接；持续监听适合长期跟踪同一条视频的新评论，比如新品发布、投放视频、舆情内容。"
  },
  {
    id: 6,
    category: "评论采集",
    question: "最多采集条数填多少合适？",
    answer: "首次使用或不确定链接质量时，建议先填 100 到 300 条，确认链接、来源渠道和分析类型都没问题后再加大。填 0 通常表示不限制，但实际数量仍受平台加载、网络、超时和抓取策略影响。"
  },
  {
    id: 7,
    category: "评论采集",
    question: "为什么视频明明有很多评论，只采集到一部分？",
    answer: "常见原因是平台分页加载、评论排序、网络超时、评论需要登录、单次采集上限过低，或者平台限制。可以提高采集条数、重试，或用持续监听分批采集。"
  },
  {
    id: 8,
    category: "评论采集",
    question: "提示“未采集到评论”怎么办？",
    answer: "先用浏览器打开链接，确认评论区公开可见、链接没有填错、来源渠道选择正确。如果页面能看到评论但系统仍采不到，再让管理员看抓取日志和服务器网络。"
  },
  {
    id: 9,
    category: "评论采集",
    question: "采集任务一直排队怎么办？",
    answer: "可能是前面还有任务、Worker 没启动、服务器繁忙或抓取服务异常。普通用户先不要重复创建太多任务，超过几分钟没变化就联系管理员。"
  },
  {
    id: 10,
    category: "评论采集",
    question: "采集失败后应该重试还是删除？",
    answer: "网络波动、临时超时、平台加载失败适合重试；链接填错、任务建错、内容不再需要适合删除。删除前要看确认弹窗，确认任务名称和影响范围。"
  },
  {
    id: 11,
    category: "持续监听",
    question: "监听任务创建后切换页面再回来还在吗？",
    answer: "应该还在。监听任务是保存到系统里的，不应该因为切换页面消失。如果刷新后仍看不到，要联系管理员检查接口或数据库记录。"
  },
  {
    id: 12,
    category: "持续监听",
    question: "监听任务会不会自动分析？",
    answer: "看创建时是否开启“自动分析”。开启后每次采集完成会自动进入分析流程；关闭时需要人工确认评论数量后再手动分析。"
  },
  {
    id: 13,
    category: "持续监听",
    question: "监听频率怎么设置比较合适？",
    answer: "热点内容可以更频繁，比如每 1 到 6 小时；普通内容可以每天或每几天一次。频率太高会消耗额度，也可能增加平台访问压力。"
  },
  {
    id: 14,
    category: "持续监听",
    question: "删除监听任务会删除历史分析吗？",
    answer: "通常删除的是监听配置，不一定删除历史采集记录和分析任务。实际以删除确认弹窗提示为准。"
  },
  {
    id: 15,
    category: "AI 分析",
    question: "为什么 AI 分析比较慢？",
    answer: "评论越多，分析越耗时。几千到几万条评论会受模型服务、并发额度、网络和服务器性能影响。建议先小样本验证，再分批处理大任务。"
  },
  {
    id: 16,
    category: "AI 分析",
    question: "评论很多时怎么提高效率？",
    answer: "先采集一小批看方向是否正确，再扩大数量；大任务尽量分批，不要重复创建多个相同分析；持续监听适合长期增量采集。"
  },
  {
    id: 17,
    category: "AI 分析",
    question: "为什么 YouTube 视频评论分析结果像商品评论？",
    answer: "通常是分析类型选错，或者提示词配置偏商品评论。视频类评论要选择“视频类评论”，重点看观点、态度、争议点、内容反馈和传播效果，不是物流、包装、售后这些电商维度。"
  },
  {
    id: 18,
    category: "AI 分析",
    question: "为什么结果全是负向，NPS 一直是 0？",
    answer: "可能是样本本身偏负向，也可能是分析规则过度把争议、调侃、中性讨论判成负向。先抽查原始评论，再检查分析类型和提示词配置。"
  },
  {
    id: 19,
    category: "AI 分析",
    question: "AI 分析结果能不能完全直接用？",
    answer: "不建议完全不复核。AI 报告适合快速发现趋势和重点，但对外汇报前要回到评论明细抽查原文，确认结论有评论证据支撑。"
  },
  {
    id: 20,
    category: "AI 分析",
    question: "分析失败怎么看原因？",
    answer: "进入分析记录，看日志筛选。先切到“错误”，再看是否是模型返回异常、额度不足、评论数据异常或网络问题。"
  },
  {
    id: 21,
    category: "报告复核",
    question: "报告里的 NPS 应该怎么理解？",
    answer: "NPS 是整体推荐或态度倾向指标。商品评论偏购买推荐，视频评论更偏内容认可、观看体验和态度倾向，不能机械套用电商口径。"
  },
  {
    id: 22,
    category: "报告复核",
    question: "用户声音是什么？",
    answer: "用户声音是评论里反复出现的观点、需求、痛点、关注点或争议点。它不是单纯关键词堆砌，而是帮助判断用户真正关心什么。"
  },
  {
    id: 23,
    category: "报告复核",
    question: "报告结论不准怎么办？",
    answer: "先到评论明细抽查原文，看是样本问题、采集不完整、分析类型错误，还是提示词需要调整。确认后把任务和截图反馈给管理员。"
  },
  {
    id: 24,
    category: "报告复核",
    question: "找不到评分、媒体、来源这些筛选条件？",
    answer: "新版界面把低频筛选放进“更多筛选”抽屉。评论明细页点击“更多筛选”，可以看到评分、是否含媒体、来源渠道、分组和展示列等条件。"
  },
  {
    id: 25,
    category: "报告复核",
    question: "评论可以导出吗？",
    answer: "可以按当前筛选结果导出，用于报告证据、人工复核或二次分析。对外分享前要注意敏感内容和隐私信息。"
  },
  {
    id: 26,
    category: "移动端",
    question: "手机端和电脑端为什么界面不一样？",
    answer: "系统会识别当前设备。电脑端适合复杂操作和大表格，手机端更适合查看状态、刷新任务、快速看报告和轻量复核。"
  },
  {
    id: 27,
    category: "移动端",
    question: "手机端能不能完成所有操作？",
    answer: "大部分轻量操作可以完成，但复杂筛选、大量评论复核、批量导出和后台管理更建议在电脑端操作。"
  },
  {
    id: 28,
    category: "移动端",
    question: "手机端评论为什么变成卡片？",
    answer: "这是为了适配小屏幕。评论明细在手机上用卡片和分页展示，避免宽表格横向拖动太多。"
  },
  {
    id: 29,
    category: "数据安全",
    question: "删除任务后能恢复吗？",
    answer: "通常不能恢复。删除采集记录、监听任务或分析任务前一定要看确认弹窗，确认不再需要后再删除。"
  },
  {
    id: 30,
    category: "数据安全",
    question: "对外汇报能直接截图系统报告吗？",
    answer: "可以，但建议先检查是否包含敏感评论、用户信息、内部任务名称或未确认结论。重要报告最好先做人工复核。"
  },
  {
    id: 31,
    category: "数据安全",
    question: "同一个链接能不能多次分析？",
    answer: "可以，但不建议无意义重复。重复分析会消耗额度，也可能让列表里出现多个相似任务。需要对比不同时间段时，建议用清晰的任务名称区分。"
  },
  {
    id: 32,
    category: "数据安全",
    question: "真实使用中最重要的注意事项是什么？",
    answer: "三句话：链接要公开可访问；分析类型一定要选对；报告结论要回到评论原文抽查验证。"
  }
];

const categories = Array.from(new Set(faqs.map((faq) => faq.category)));
const categoryOptions = computed(() => ["全部", ...categories]);
const quickStats = computed(() => [
  { label: "问题清单", value: `${faqs.length} 条` },
  { label: "覆盖模块", value: `${categories.length} 类` },
  { label: "适用对象", value: "普通用户 / 超管" }
]);

const filteredFaqs = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase();
  return faqs.filter((faq) => {
    const matchesCategory = activeCategory.value === "全部" || faq.category === activeCategory.value;
    const searchable = `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase();
    return matchesCategory && (!normalizedKeyword || searchable.includes(normalizedKeyword));
  });
});
</script>

<style scoped>
.help-page {
  width: min(1480px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.help-hero {
  min-height: 112px;
  align-items: center;
}

.help-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.45fr);
  gap: 18px;
  align-items: center;
  min-height: 148px;
  padding: 28px 30px;
  border: 1px solid #172033;
  border-radius: 12px;
  color: #ffffff;
  background: #172033;
  box-shadow: var(--shadow-md);
}

.help-band h2 {
  margin: 7px 0 8px;
  max-width: 920px;
  color: #ffffff;
  font-size: 26px;
  line-height: 1.28;
}

.help-band p {
  margin: 0;
  color: #d4dae6;
  line-height: 1.7;
}

.help-quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.help-quick-item {
  min-height: 74px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
}

.help-quick-item span {
  display: block;
  color: rgba(226, 235, 248, 0.68);
  font-size: 12px;
  font-weight: 850;
}

.help-quick-item strong {
  display: block;
  margin-top: 8px;
  color: #ffffff;
  font-size: 17px;
  line-height: 1.2;
}

.help-panel {
  padding: 18px;
  border: 1px solid rgba(116, 139, 174, 0.22);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(18px);
}

.help-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.help-search {
  width: min(360px, 100%);
}

.help-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
  overflow-x: auto;
}

.help-filter-row > span {
  flex: 0 0 auto;
  color: #697386;
  font-size: 13px;
  font-weight: 800;
}

.help-faq-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.help-qa-card {
  min-height: 178px;
  padding: 18px;
  border: 1px solid #e4e7ee;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
}

.help-qa-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.help-qa-meta span {
  color: #8a94a6;
  font-size: 12px;
  font-weight: 900;
}

.help-qa-card h3 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  line-height: 1.45;
}

.help-qa-card p {
  margin: 10px 0 0;
  color: #5f6b7c;
  font-size: 14px;
  line-height: 1.75;
}

@media (max-width: 980px) {
  .help-band,
  .help-panel-head {
    grid-template-columns: 1fr;
  }

  .help-band {
    display: block;
  }

  .help-quick-grid {
    margin-top: 18px;
  }

  .help-faq-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .help-page {
    gap: 16px;
  }

  .help-band,
  .help-panel {
    padding: 16px;
  }

  .help-band h2 {
    font-size: 20px;
  }

  .help-quick-grid {
    grid-template-columns: 1fr;
  }

  .help-panel-head,
  .help-filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .help-search {
    width: 100%;
  }

  .help-qa-card {
    min-height: 0;
  }
}
</style>
