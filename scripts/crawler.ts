/**
 * scripts/crawler.ts
 * 精确抓取广告门案例库，包含详情页正文提取
 * 从卡片中提取真实品牌名称（优先取“品牌公司”）
 * 抓取前 10 条
 */
import { chromium } from 'playwright';
import { prisma } from '../lib/prisma';

const BASE_URL = 'https://www.adquan.com';
const MAX_ITEMS = 10;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDate(raw: string): Date {
  const s = raw.trim();
  if (!s) return new Date();
  const normalized = s.replace(/[\/．]/g, '-').replace(/(\d{4}-\d{1,2}-\d{1,2}).*/, '$1');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

async function main() {
  console.log('▶ 广告门爬虫启动（含品牌提取）');
  console.log(`  目标: ${BASE_URL}/case_library/index`);
  console.log(`  最多抓取 ${MAX_ITEMS} 条`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(() => {
    // @ts-ignore
    if (typeof window !== 'undefined' && !window.__name) {
      // @ts-ignore
      window.__name = (func: Function) => func;
    }
  });

  const page = await context.newPage();
  let stored = 0;

  try {
    await page.goto(`${BASE_URL}/case_library/index`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // 多次滚动加载更多
    console.log('  开始滚动加载...');
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 30;

    while (scrollAttempts < maxScrollAttempts) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1500);
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === previousHeight) {
        console.log(`  滚动停止，总高度 ${newHeight}px`);
        break;
      }
      previousHeight = newHeight;
      scrollAttempts++;
      console.log(`  滚动第 ${scrollAttempts} 次，高度 ${newHeight}px`);
    }

    await page.waitForSelector('div.article_1', { timeout: 30000 });

    // ---- 提取列表卡片信息 ----
    const cards = await page.evaluate(() => {
      const results: any[] = [];
      const items = document.querySelectorAll('div.article_1');

      items.forEach((el) => {
        // 标题
        const titleEl = el.querySelector('a.article_2_href p.article_2_p');
        const title = titleEl?.textContent?.trim() || '';

        // 详情链接
        const linkEl = el.querySelector('a.article_2_href');
        const href = linkEl?.getAttribute('href') || '';

        // 封面图
        const imgEl = el.querySelector('img.article_1_img');
        const cover = imgEl?.getAttribute('src') || '';

        // 简介和日期
        const fuDiv = el.querySelector('.article_1_fu');
        const pTags = fuDiv?.querySelectorAll('p') || [];
        const brief = pTags.length >= 1 ? pTags[0].textContent?.trim() || '' : '';
        const dateRaw = pTags.length >= 2 ? pTags[1].textContent?.trim() || '' : '';

        // ★ 提取品牌名称（优先取“品牌公司”）★
        let brand = '未知品牌';
        const brandItems = el.querySelectorAll('.article_3 .article_4');
        for (let j = 0; j < brandItems.length; j++) {
          const subItem = brandItems[j];
          const normalEl = subItem.querySelector('normal');
          if (normalEl && normalEl.textContent?.trim() === '品牌公司') {
            const spanEl = subItem.querySelector('span');
            if (spanEl && spanEl.textContent?.trim()) {
              brand = spanEl.textContent.trim();
              break;
            }
          }
        }
        // 如果没找到品牌公司，取第一个 span 作为备选
        if (brand === '未知品牌') {
          const firstSpan = el.querySelector('.article_3 .article_4 span');
          if (firstSpan && firstSpan.textContent?.trim()) {
            brand = firstSpan.textContent.trim();
          }
        }

        if (title && href) {
          results.push({
            title,
            brand,
            detail_url: href.startsWith('http') ? href : `https://www.adquan.com${href}`,
            cover_image_url: cover.startsWith('http') ? cover : `https:${cover}`,
            brief,
            dateRaw,
          });
        }
      });
      return results;
    });

    console.log(`  找到 ${cards.length} 个卡片`);

    const topCards = cards.slice(0, MAX_ITEMS);
    console.log(`  提取前 ${topCards.length} 条，开始抓取详情页正文...`);

    // ---- 逐个访问详情页，提取正文 ----
    for (let i = 0; i < topCards.length; i++) {
      const card = topCards[i];
      console.log(`\n[${i + 1}/${topCards.length}] 处理: ${card.title}`);
      console.log(`  品牌: ${card.brand}`);

      let fullContent = card.brief;

      try {
        await page.goto(card.detail_url, { waitUntil: 'networkidle', timeout: 30000 });
        await sleep(1000);

        const contentSelectors = [
          '.articleContent',
          '.content',
          '.article-content',
          '.detail-content',
          '.article-body',
          '.article-detail',
          '#article_content',
          '.content-wrap',
          '.main-content',
        ];

        let found = false;
        for (const sel of contentSelectors) {
          const loc = page.locator(sel).first();
          const count = await loc.count();
          if (count > 0) {
            const html = await loc.innerHTML();
            if (html && html.trim().length > 100) {
              fullContent = html.trim();
              console.log(`  ✅ 使用选择器 "${sel}" 抓取正文，长度 ${fullContent.length}`);
              found = true;
              break;
            }
          }
        }

        if (!found) {
          console.log(`  ⚠️ 未找到正文容器，使用简介作为备用`);
        }
      } catch (err) {
        console.error(`  ❌ 抓取详情页失败: ${(err as Error).message}`);
      }

      let publishDate = new Date();
      if (card.dateRaw) {
        const d = new Date(card.dateRaw.replace(/\//g, '-'));
        if (!isNaN(d.getTime())) publishDate = d;
      }

      try {
        await prisma.case.upsert({
          where: { source_url: card.detail_url },
          create: {
            title: card.title,
            cover_image_url: card.cover_image_url,
            brief: card.brief,
            full_content_html: fullContent,
            brand: card.brand,
            publish_date: publishDate,
            source_url: card.detail_url,
          },
          update: {
            title: card.title,
            cover_image_url: card.cover_image_url,
            brief: card.brief,
            full_content_html: fullContent,
            brand: card.brand,
            publish_date: publishDate,
          },
        });
        stored++;
        console.log(`  ✅ 已存储 (品牌: ${card.brand})`);
      } catch (err) {
        console.error(`  ❌ 存储失败:`, err);
      }

      await sleep(1000 + Math.random() * 1500);
    }

    console.log(`\n✅ 完成，成功存储 ${stored} 条`);
  } catch (err) {
    console.error('❌ 爬虫错误:', err);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);