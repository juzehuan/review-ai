function round(value) {
    return Number(value.toFixed(1));
}
export function buildDashboardSnapshot(taskId, analyses) {
    const total = analyses.length;
    const negativeCount = analyses.filter((item) => item.review.ratingStar <= 3).length;
    const promoters = analyses.filter((item) => item.review.ratingStar === 5).length;
    const passives = analyses.filter((item) => item.review.ratingStar === 4).length;
    const detractors = analyses.filter((item) => item.review.ratingStar <= 3).length;
    const nps = total ? round(((promoters - detractors) / total) * 100) : 0;
    const npsBreakdown = [
        { label: "批评者 1-3 星", count: detractors, percent: total ? round((detractors / total) * 100) : 0 },
        { label: "中立者 4 星", count: passives, percent: total ? round((passives / total) * 100) : 0 },
        { label: "推荐者 5 星", count: promoters, percent: total ? round((promoters / total) * 100) : 0 }
    ];
    const ratingSentiment = [1, 2, 3, 4, 5].map((ratingStar) => {
        const byStar = analyses.filter((item) => item.review.ratingStar === ratingStar);
        return {
            ratingStar,
            positive: byStar.filter((item) => item.sentiment === "positive").length,
            neutral: byStar.filter((item) => item.sentiment === "neutral").length,
            negative: byStar.filter((item) => item.sentiment === "negative").length
        };
    });
    const sentiments = ["positive", "neutral", "negative"];
    const sentimentDistribution = sentiments.map((sentiment) => {
        const count = analyses.filter((item) => item.sentiment === sentiment).length;
        return {
            sentiment,
            count,
            percent: total ? round((count / total) * 100) : 0
        };
    });
    const sourceMap = new Map();
    const keywordMap = new Map();
    const issueMap = new Map();
    for (const analysis of analyses) {
        sourceMap.set(analysis.review.sourceChannel, (sourceMap.get(analysis.review.sourceChannel) || 0) + 1);
        for (const word of [...analysis.topicLabels, ...analysis.keywords]) {
            const trimmed = word.trim();
            if (!trimmed) {
                continue;
            }
            keywordMap.set(trimmed, (keywordMap.get(trimmed) || 0) + 1);
        }
        for (const issue of analysis.painPoints) {
            const trimmed = issue.trim();
            if (!trimmed) {
                continue;
            }
            const existing = issueMap.get(trimmed) || { count: 0, samples: [] };
            existing.count += 1;
            if (existing.samples.length < 3) {
                existing.samples.push(analysis.reviewId);
            }
            issueMap.set(trimmed, existing);
        }
    }
    return {
        taskId,
        runId: analyses[0]?.runId || null,
        reviewCount: total,
        negativeCount,
        nps,
        npsBreakdown,
        ratingSentiment,
        sentimentDistribution,
        sourceDistribution: [...sourceMap.entries()].map(([source, count]) => ({ source, count })),
        wordCloud: [...keywordMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50)
            .map(([name, value]) => ({ name, value })),
        issues: [...issueMap.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([issueName, value]) => ({
            issueName,
            count: value.count,
            sampleReviewIds: value.samples
        }))
    };
}
