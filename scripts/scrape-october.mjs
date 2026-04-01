import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require('https');
const { Pool } = require('pg');
const fs = require('fs');

const DB_URL = process.env.DOKPLOY_DB_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DB_URL });

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const AREA_ID = 1;
const AREA_NAME_AR = 'مدينة السادس من أكتوبر';
const DELAY_MS = 700;

const delay = (ms) => new Promise(r => setTimeout(r, ms));

function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.9',
        'Accept-Encoding': 'identity',
      }
    }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        const loc = res.headers.location;
        const nextUrl = loc.startsWith('http') ? loc : `${u.protocol}//${u.host}${loc}`;
        resolve(fetchUrl(nextUrl, maxRedirects - 1));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch (e) { return null; }
}

// Fetch all compound slugs from search pages
async function getAllCompoundSlugs() {
  console.log('📋 جاري جلب قائمة الكمبوندات من Nawy...');
  const allResults = [];
  let page = 1;
  let total = 999;

  while (allResults.length < total) {
    const url = `https://www.nawy.com/ar/search?page_number=${page}&areas=${AREA_ID}`;
    console.log(`  📄 صفحة ${page}...`);

    try {
      const { body } = await fetchUrl(url);
      const nd = extractNextData(body);
      if (!nd) { console.log('  ⚠️ لم يتم العثور على البيانات'); break; }

      const ssr = nd.props.pageProps.loadedSearchResultsSSR;
      if (!ssr || !ssr.results) break;

      total = ssr.total || total;
      const items = ssr.results;
      console.log(`    ✅ ${items.length} كمبوند (مجموع: ${total})`);

      for (const item of items) {
        allResults.push({
          id: item.id,
          slug: item.slug,
          name: item.name,
          developerName: item.developerName || '',
          developerLogoUrl: item.developerLogoUrl || null,
          developerId: item.developerId,
          areaName: item.areaName || AREA_NAME_AR,
          propertyTypes: (item.propertyTypes || []).map(pt => pt.name).filter(Boolean),
          imageUrl: item.imageUrl || null,
        });
      }

      page++;
      await delay(DELAY_MS);
    } catch (e) {
      console.error(`  ❌ خطأ في الصفحة ${page}:`, e.message);
      break;
    }
  }

  console.log(`\n✅ إجمالي الكمبوندات المجلوبة: ${allResults.length}\n`);
  return allResults;
}

// Fetch detailed compound data from compound page
async function fetchCompoundDetails(item) {
  // Build compound URL from slug
  const url = `https://www.nawy.com/ar/compound/${item.slug}`;

  try {
    const { body, status } = await fetchUrl(url);
    if (status !== 200) return null;

    const nd = extractNextData(body);
    if (!nd) return null;

    return nd.props.pageProps.compound || null;
  } catch (e) {
    console.error(`    ⚠️ خطأ في جلب ${url}: ${e.message}`);
    return null;
  }
}

// Build payment plan text
function buildPaymentPlanText(paymentPlans) {
  if (!paymentPlans || paymentPlans.length === 0) return null;
  const plans = paymentPlans.map(p => {
    const dp = p.downPaymentPercentage;
    const yrs = p.years;
    if (dp && yrs) return `${dp}% مقدم وتقسيط ${yrs} سنوات`;
    if (yrs) return `تقسيط ${yrs} سنوات`;
    return null;
  }).filter(Boolean);
  return plans.length > 0 ? plans.join(' | ') : null;
}

// Get or create developer, return id
async function getOrCreateDeveloper(devName, devLogo) {
  const name = (devName || 'مطور غير محدد').trim();

  const existing = await pool.query('SELECT id FROM developers WHERE name = $1', [name]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const result = await pool.query(
    `INSERT INTO developers (name, logo, description, is_active) VALUES ($1, $2, $3, true) RETURNING id`,
    [name, devLogo || null, `مطور عقاري رائد - ${name}`]
  );
  console.log(`    🏢 مطور جديد: ${name}`);
  return result.rows[0].id;
}

// Import a single compound into the database
async function importCompound(item, compound) {
  const c = compound || {};
  const name = (c.name || item.name || '').trim();
  if (!name) return null;

  // Check if already exists
  const existing = await pool.query('SELECT id FROM projects WHERE name = $1', [name]);
  if (existing.rows.length > 0) {
    return { projectId: existing.rows[0].id, skipped: true };
  }

  const devName = c.developerName || item.developerName || 'مطور غير محدد';
  const devLogo = c.developerLogoUrl || item.developerLogoUrl || null;
  const developerId = await getOrCreateDeveloper(devName, devLogo);

  // Images (already full URLs in compound.images)
  let images = [];
  if (c.images && Array.isArray(c.images)) {
    images = c.images
      .map(img => {
        if (typeof img === 'string') return img;
        if (img && typeof img === 'object') {
          if (img.url) return img.url;
          if (img.id) return `https://prod-images.nawy.com/processed/compound_image/image/${img.id}/high.webp`;
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 15);
  }
  if (images.length === 0 && c.coverImageUrl) images.push(c.coverImageUrl);
  if (images.length === 0 && item.imageUrl) images.push(item.imageUrl);

  // Prices
  const prices = c.prices || {};
  const minPrice = prices.developerStartingPrice || null;

  // Payment plans
  const planText = buildPaymentPlanText(c.paymentPlans || []);

  // Amenities
  const amenities = (c.amenities || [])
    .map(a => typeof a === 'string' ? a : (a.name || ''))
    .filter(Boolean);

  // Property types (from listing, just names)
  const propTypeNames = item.propertyTypes || [];

  // Location
  const location = c.areaName || item.areaName || AREA_NAME_AR;

  // Status
  const rawStatus = c.status || '';
  let status = 'under_construction';
  if (rawStatus === 'ready') status = 'ready';
  else if (rawStatus === 'off_plan') status = 'off_plan';

  // Delivery
  const deliveryDate = c.deliveryYear ? String(c.deliveryYear) : '';

  // Description (formatted)
  const compoundUrl = `https://www.nawy.com/ar/compound/${item.slug}`;
  const descParts = [`عن ${name}:`];

  const rawDesc = c.description || c.metaDescription || '';
  if (rawDesc) descParts.push(rawDesc);
  else descParts.push(`مشروع عقاري متميز يقع في ${location} ويضم وحدات سكنية متنوعة بمساحات مختلفة وأنظمة دفع مرنة.`);

  if (planText) descParts.push('', `📋 أنظمة السداد:\n${planText}`);

  if (propTypeNames.length > 0) {
    const unitLines = propTypeNames.map(t => {
      let line = t;
      if (minPrice) line += ` - تبدأ من ${(minPrice / 1000000).toFixed(1)} مليون ج`;
      return line;
    }).join('\n');
    descParts.push('', `🏠 أنواع الوحدات:\n${unitLines}`);
  }

  if (minPrice) {
    descParts.push('', `💰 السعر يبدأ من: ${minPrice.toLocaleString('ar-EG')} ج.م`);
  }

  descParts.push('', `🔗 المصدر: ${compoundUrl}`);
  const description = descParts.join('\n');

  // Insert project
  const result = await pool.query(
    `INSERT INTO projects 
      (developer_id, name, type, location, address, description, status, total_units, 
       delivery_date, min_price, max_price, images, amenities, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
     RETURNING id`,
    [
      developerId,
      name,
      'compound',
      location,
      location,
      description,
      status,
      c.propertiesCount || 0,
      deliveryDate,
      minPrice,
      null,
      images,
      amenities,
    ]
  );

  const projectId = result.rows[0].id;

  // Insert unit records (one per property type)
  let unitsInserted = 0;
  for (const typeName of propTypeNames) {
    await pool.query(
      `INSERT INTO units (project_id, unit_number, type, price, status, finishing, notes)
       VALUES ($1, $2, $3, $4, 'available', 'كور أند شيل', $5)`,
      [
        projectId,
        `${typeName} - ${name}`,
        typeName,
        minPrice,
        `وحدة ${typeName} في ${name}`,
      ]
    );
    unitsInserted++;
  }

  // If no property types, add a generic unit
  if (unitsInserted === 0 && minPrice) {
    await pool.query(
      `INSERT INTO units (project_id, unit_number, type, price, status, finishing, notes)
       VALUES ($1, $2, 'وحدة سكنية', $3, 'available', 'كور أند شيل', $4)`,
      [projectId, `وحدة - ${name}`, minPrice, `وحدة سكنية في ${name}`]
    );
    unitsInserted = 1;
  }

  return { projectId, unitsCount: unitsInserted, skipped: false };
}

async function main() {
  console.log('🚀 سحب بيانات كمبوندات مدينة السادس من أكتوبر من Nawy.com');
  console.log('='.repeat(60));

  // Test DB
  try {
    await pool.query('SELECT 1');
    console.log('✅ الاتصال بقاعدة البيانات ناجح\n');
  } catch (e) {
    console.error('❌ فشل الاتصال:', e.message);
    process.exit(1);
  }

  // Get all compound slugs from listing pages
  const compoundList = await getAllCompoundSlugs();
  fs.writeFileSync('/tmp/october_list.json', JSON.stringify(compoundList, null, 2));
  console.log(`📝 تم حفظ القائمة في /tmp/october_list.json`);

  const stats = { total: compoundList.length, success: 0, failed: 0, skipped: 0, totalUnits: 0 };

  // Process each compound
  for (let i = 0; i < compoundList.length; i++) {
    const item = compoundList[i];
    const progress = `[${i + 1}/${stats.total}]`;
    process.stdout.write(`\n${progress} 🏙️ ${item.name}... `);

    try {
      await delay(DELAY_MS);
      const compound = await fetchCompoundDetails(item);
      const result = await importCompound(item, compound);

      if (!result) {
        process.stdout.write('❌ فشل\n');
        stats.failed++;
      } else if (result.skipped) {
        process.stdout.write('⏭️ موجود\n');
        stats.skipped++;
      } else {
        process.stdout.write(`✅ (${result.unitsCount} وحدة)\n`);
        stats.success++;
        stats.totalUnits += result.unitsCount;
      }
    } catch (e) {
      process.stdout.write(`❌ ${e.message}\n`);
      stats.failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 النتائج النهائية:');
  console.log(`  ✅ تم إضافة: ${stats.success} كمبوند`);
  console.log(`  ⏭️ موجود مسبقاً: ${stats.skipped} كمبوند`);
  console.log(`  ❌ فشل: ${stats.failed} كمبوند`);
  console.log(`  🏠 إجمالي الوحدات: ${stats.totalUnits}`);
  console.log('='.repeat(60));

  await pool.end();
  console.log('\n✅ اكتملت العملية!');
}

main().catch(e => {
  console.error('Fatal:', e);
  pool.end();
  process.exit(1);
});
