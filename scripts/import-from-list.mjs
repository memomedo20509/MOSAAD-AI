import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require('https');
const { Pool } = require('pg');
const fs = require('fs');

const DB_URL = process.env.DOKPLOY_DB_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DB_URL });

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DELAY_MS = 600;

// Args: node script.mjs [startIndex] [endIndex]
const startIdx = parseInt(process.argv[2] || '0');
const endIdx = parseInt(process.argv[3] || '999');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.9',
        'Accept-Encoding': 'identity',
      }
    }, (res) => {
      if ([301, 302, 307].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location;
        const nextUrl = loc.startsWith('http') ? loc : `https://www.nawy.com${loc}`;
        resolve(fetchUrl(nextUrl));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch (e) { return null; }
}

function buildPaymentPlanText(paymentPlans) {
  if (!paymentPlans || paymentPlans.length === 0) return null;
  return paymentPlans
    .map(p => (p.downPaymentPercentage && p.years) ? `${p.downPaymentPercentage}% مقدم وتقسيط ${p.years} سنوات` : null)
    .filter(Boolean).join(' | ') || null;
}

async function getOrCreateDeveloper(devName, devLogo) {
  const name = (devName || 'مطور غير محدد').trim();
  const existing = await pool.query('SELECT id FROM developers WHERE name = $1', [name]);
  if (existing.rows.length > 0) return existing.rows[0].id;
  const result = await pool.query(
    `INSERT INTO developers (name, logo, description, is_active) VALUES ($1, $2, $3, true) RETURNING id`,
    [name, devLogo || null, `مطور عقاري - ${name}`]
  );
  return result.rows[0].id;
}

async function processCompound(item) {
  const name = (item.name || '').trim();
  if (!name) return 'skip';

  // Check if already exists
  const existing = await pool.query('SELECT id FROM projects WHERE name = $1', [name]);
  if (existing.rows.length > 0) return 'exists';

  // Fetch compound details
  const url = `https://www.nawy.com/ar/compound/${item.slug}`;
  let compound = null;
  try {
    const { body, status } = await fetchUrl(url);
    if (status === 200) {
      const nd = extractNextData(body);
      if (nd) compound = nd.props.pageProps.compound || null;
    }
  } catch (e) { /* use item data only */ }

  const c = compound || {};

  // Developer
  const devName = c.developerName || item.developerName || 'مطور غير محدد';
  const devLogo = c.developerLogoUrl || item.developerLogoUrl || null;
  const developerId = await getOrCreateDeveloper(devName, devLogo);

  // Images
  let images = [];
  if (c.images && Array.isArray(c.images)) {
    images = c.images.map(img => {
      if (typeof img === 'string') return img;
      if (img && img.url) return img.url;
      if (img && img.id) return `https://prod-images.nawy.com/processed/compound_image/image/${img.id}/high.webp`;
      return null;
    }).filter(Boolean).slice(0, 15);
  }
  if (images.length === 0 && c.coverImageUrl) images.push(c.coverImageUrl);
  if (images.length === 0 && item.imageUrl) images.push(item.imageUrl);

  // Prices
  const prices = c.prices || {};
  const minPrice = prices.developerStartingPrice || null;

  // Payment plans text
  const planText = buildPaymentPlanText(c.paymentPlans || []);

  // Amenities
  const amenities = (c.amenities || [])
    .map(a => typeof a === 'string' ? a : (a.name || '')).filter(Boolean);

  // Property types
  const propTypeNames = item.propertyTypes || [];

  // Location & status
  const location = c.areaName || item.areaName || 'مدينة السادس من أكتوبر';
  const rawStatus = c.status || '';
  const status = rawStatus === 'ready' ? 'ready' : rawStatus === 'off_plan' ? 'off_plan' : 'under_construction';
  const deliveryDate = c.deliveryYear ? String(c.deliveryYear) : '';

  // Description
  const compoundUrl = url;
  const descParts = [`عن ${name}:`];
  const rawDesc = c.description || c.metaDescription || '';
  descParts.push(rawDesc || `مشروع عقاري متميز في ${location} يضم وحدات سكنية متنوعة.`);
  if (planText) descParts.push('', `📋 أنظمة السداد:\n${planText}`);
  if (propTypeNames.length > 0) {
    const lines = propTypeNames.map(t => minPrice ? `${t} - تبدأ من ${(minPrice/1000000).toFixed(1)} مليون ج` : t).join('\n');
    descParts.push('', `🏠 أنواع الوحدات:\n${lines}`);
  }
  if (minPrice) descParts.push('', `💰 السعر يبدأ من: ${minPrice.toLocaleString()} ج.م`);
  descParts.push('', `🔗 المصدر: ${compoundUrl}`);
  const description = descParts.join('\n');

  // Insert project
  const result = await pool.query(
    `INSERT INTO projects (developer_id, name, type, location, address, description, status, total_units, delivery_date, min_price, max_price, images, amenities, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true) RETURNING id`,
    [developerId, name, 'compound', location, location, description, status,
     c.propertiesCount || 0, deliveryDate, minPrice, null, images, amenities]
  );
  const projectId = result.rows[0].id;

  // Insert units
  let unitCount = 0;
  for (const typeName of propTypeNames) {
    await pool.query(
      `INSERT INTO units (project_id, unit_number, type, price, status, finishing, notes)
       VALUES ($1,$2,$3,$4,'available','كور أند شيل',$5)`,
      [projectId, `${typeName} - ${name}`, typeName, minPrice, `وحدة ${typeName} في ${name}`]
    );
    unitCount++;
  }
  if (unitCount === 0) {
    await pool.query(
      `INSERT INTO units (project_id, unit_number, type, price, status, finishing)
       VALUES ($1,$2,'وحدة سكنية',$3,'available','كور أند شيل')`,
      [projectId, `وحدة - ${name}`, minPrice]
    );
    unitCount = 1;
  }

  return `ok:${unitCount}`;
}

async function main() {
  // Load list
  const listPath = '/tmp/october_list.json';
  if (!fs.existsSync(listPath)) {
    console.error('❌ القائمة غير موجودة في /tmp/october_list.json');
    process.exit(1);
  }
  const allCompounds = JSON.parse(fs.readFileSync(listPath, 'utf8'));
  const batch = allCompounds.slice(startIdx, endIdx);

  console.log(`\n🚀 معالجة ${batch.length} كمبوند (${startIdx}-${Math.min(endIdx-1, allCompounds.length-1)}) من أصل ${allCompounds.length}`);
  console.log('='.repeat(60));

  const stats = { success: 0, exists: 0, failed: 0, units: 0 };

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    const global = startIdx + i + 1;
    process.stdout.write(`[${global}/${allCompounds.length}] ${item.name}... `);

    try {
      await delay(DELAY_MS);
      const result = await processCompound(item);
      if (result === 'exists') {
        process.stdout.write('⏭️ موجود\n');
        stats.exists++;
      } else if (result === 'skip') {
        process.stdout.write('⏭️ تجاهل\n');
      } else if (result.startsWith('ok:')) {
        const u = parseInt(result.split(':')[1]);
        process.stdout.write(`✅ (${u} وحدة)\n`);
        stats.success++;
        stats.units += u;
      } else {
        process.stdout.write('❌\n');
        stats.failed++;
      }
    } catch (e) {
      process.stdout.write(`❌ ${e.message}\n`);
      stats.failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ تم: ${stats.success} | ⏭️ موجود: ${stats.exists} | ❌ فشل: ${stats.failed} | 🏠 وحدات: ${stats.units}`);
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
