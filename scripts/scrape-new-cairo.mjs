import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require('https');
const http = require('http');
const { Pool } = require('pg');
const fs = require('fs');

const DB_URL = process.env.DOKPLOY_DB_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DB_URL });

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const AREA_ID = 2;
const AREA_NAME_AR = 'القاهرة الجديدة';
const DELAY_MS = 800;

// Support batching: node scrape-new-cairo.mjs <startIdx> <endIdx>
const args = process.argv.slice(2);
const startIdx = parseInt(args[0] || '0', 10);
const endIdx = parseInt(args[1] || '9999', 10);

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ────────────────────────────────────────────────────────
//  HTTP fetch with redirect following
// ────────────────────────────────────────────────────────
function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    try {
      const req = lib.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'ar,en;q=0.9',
          'Accept-Encoding': 'identity',
        }
      }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
          const loc = res.headers.location;
          const u = new URL(url);
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
    } catch (e) {
      reject(e);
    }
  });
}

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

// Strip HTML tags + decode basic entities
function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ────────────────────────────────────────────────────────
//  Step 1: Get all compound slugs from search pages
// ────────────────────────────────────────────────────────
async function getAllCompoundSlugs() {
  console.log(`\n📋 جاري جلب قائمة الكمبوندات من Nawy (منطقة ${AREA_NAME_AR})...`);
  const allResults = [];
  let page = 1;
  let total = 9999;

  while (allResults.length < total) {
    const url = `https://www.nawy.com/ar/search?page_number=${page}&areas=${AREA_ID}`;
    console.log(`  📄 صفحة ${page}...`);

    try {
      const { body } = await fetchUrl(url);
      const nd = extractNextData(body);
      if (!nd) { console.log('  ⚠️ لم يتم العثور على __NEXT_DATA__'); break; }

      const ssr = nd.props?.pageProps?.loadedSearchResultsSSR;
      if (!ssr || !ssr.results || ssr.results.length === 0) {
        console.log('  ✅ لا توجد نتائج إضافية');
        break;
      }

      total = ssr.total || total;
      const items = ssr.results;
      console.log(`    ✅ ${items.length} كمبوند (إجمالي: ${total})`);

      for (const item of items) {
        // Build property type summaries from listing data
        const propTypes = (item.propertyTypes || []).map(pt => ({
          name: pt.name || '',
          nameEn: pt.nameEn || pt.name_en || '',
          bedrooms: pt.bedrooms ?? null,
          minArea: pt.minArea ?? pt.min_area ?? null,
          maxArea: pt.maxArea ?? pt.max_area ?? null,
          minPrice: pt.minPrice ?? pt.min_price ?? null,
          maxPrice: pt.maxPrice ?? pt.max_price ?? null,
        }));

        allResults.push({
          id: item.id,
          slug: item.slug,
          nameAr: item.name || '',
          nameEn: item.nameEn || item.name_en || '',
          developerName: item.developerName || item.developer_name || '',
          developerLogoUrl: item.developerLogoUrl || item.developer_logo_url || null,
          developerId: item.developerId || item.developer_id || null,
          areaName: item.areaName || item.area_name || AREA_NAME_AR,
          imageUrl: item.imageUrl || item.image_url || null,
          propTypes,
        });
      }

      if (allResults.length >= total) break; // reached the total
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

// ────────────────────────────────────────────────────────
//  Step 2: Fetch compound detail page (Arabic + English)
// ────────────────────────────────────────────────────────
async function fetchCompoundDetails(item) {
  const arUrl = `https://www.nawy.com/ar/compound/${item.slug}`;
  const enUrl = `https://www.nawy.com/en/compound/${item.slug}`;

  let arCompound = null, enCompound = null;

  try {
    const { body: arHtml, status: arStatus } = await fetchUrl(arUrl);
    if (arStatus === 200) {
      const nd = extractNextData(arHtml);
      arCompound = nd?.props?.pageProps?.compound || null;
    }
  } catch (e) { /* skip */ }

  await delay(400);

  try {
    const { body: enHtml, status: enStatus } = await fetchUrl(enUrl);
    if (enStatus === 200) {
      const nd = extractNextData(enHtml);
      enCompound = nd?.props?.pageProps?.compound || null;
    }
  } catch (e) { /* skip */ }

  return { arCompound, enCompound };
}

// ────────────────────────────────────────────────────────
//  Build payment plan text
// ────────────────────────────────────────────────────────
function buildPaymentPlanText(paymentPlans, lang = 'ar') {
  if (!paymentPlans || paymentPlans.length === 0) return null;
  const plans = paymentPlans.map(p => {
    const dp = p.downPaymentPercentage;
    const yrs = p.years;
    const inst = p.installmentPercentage;
    if (lang === 'en') {
      if (dp && yrs) return `${dp}% down, ${yrs}yrs`;
      if (yrs) return `${yrs} years installment`;
      return null;
    } else {
      if (dp && yrs) return `${dp}% مقدم وتقسيط ${yrs} سنوات`;
      if (yrs) return `تقسيط ${yrs} سنوات`;
      return null;
    }
  }).filter(Boolean);
  // Deduplicate
  const unique = [...new Set(plans)];
  return unique.length > 0 ? unique.join(' | ') : null;
}

// ────────────────────────────────────────────────────────
//  Get or create developer
// ────────────────────────────────────────────────────────
async function getOrCreateDeveloper(devName, devNameEn, devLogo) {
  const name = (devName || 'مطور غير محدد').trim();

  const existing = await pool.query('SELECT id FROM developers WHERE name = $1', [name]);
  if (existing.rows.length > 0) {
    // Update name_en if we have it and it's missing
    if (devNameEn) {
      await pool.query(
        'UPDATE developers SET name_en = COALESCE(name_en, $1) WHERE id = $2',
        [devNameEn.trim(), existing.rows[0].id]
      );
    }
    return existing.rows[0].id;
  }

  const result = await pool.query(
    `INSERT INTO developers (name, name_en, logo, is_active) VALUES ($1, $2, $3, true) RETURNING id`,
    [name, devNameEn?.trim() || null, devLogo || null]
  );
  console.log(`    🏢 مطور جديد: ${name}`);
  return result.rows[0].id;
}

// ────────────────────────────────────────────────────────
//  Build full description text
// ────────────────────────────────────────────────────────
function buildDescription(name, rawDesc, planText, propTypes, minPrice, compoundUrl) {
  const parts = [`عن ${name}:`];

  const cleanDesc = stripHtml(rawDesc);
  if (cleanDesc) {
    parts.push(cleanDesc);
  }

  if (planText) {
    parts.push('', `📋 أنظمة السداد:\n${planText}`);
  }

  if (propTypes && propTypes.length > 0) {
    const unitLines = propTypes.map(pt => {
      let line = pt.name;
      if (pt.bedrooms) line += ` ${pt.bedrooms}غ`;
      if (pt.minArea && pt.maxArea) line += `: ${pt.minArea} - ${pt.maxArea} م²`;
      else if (pt.minArea) line += `: ${pt.minArea} م²`;
      if (pt.minPrice && pt.maxPrice) {
        const minM = (pt.minPrice / 1000000).toFixed(1);
        const maxM = (pt.maxPrice / 1000000).toFixed(1);
        line += ` - ${minM} - ${maxM} مليون ج`;
      } else if (pt.minPrice) {
        line += ` - من ${(pt.minPrice / 1000000).toFixed(1)} مليون ج`;
      }
      return line;
    }).join('\n');
    parts.push('', `🏠 أنواع الوحدات وأسعارها:\n${unitLines}`);
  }

  if (minPrice) {
    parts.push('', `💰 السعر يبدأ من: ${minPrice.toLocaleString('ar-EG')} ج.م`);
  }

  parts.push('', `🔗 المصدر: ${compoundUrl}`);
  return parts.join('\n');
}

function buildDescriptionEn(nameEn, rawDesc, planText, propTypes, minPrice, compoundUrl) {
  if (!nameEn && !rawDesc) return null;
  const parts = [`About ${nameEn || ''}:`];

  const cleanDesc = stripHtml(rawDesc);
  if (cleanDesc) parts.push(cleanDesc);

  if (planText) parts.push('', `Payment Plans:\n${planText}`);

  if (propTypes && propTypes.length > 0) {
    const unitLines = propTypes.map(pt => {
      let line = pt.nameEn || pt.name;
      if (pt.bedrooms) line += ` ${pt.bedrooms}BR`;
      if (pt.minArea && pt.maxArea) line += `: ${pt.minArea} - ${pt.maxArea} m²`;
      else if (pt.minArea) line += `: ${pt.minArea} m²`;
      if (pt.minPrice && pt.maxPrice) {
        line += ` - EGP ${(pt.minPrice/1000000).toFixed(1)}M - ${(pt.maxPrice/1000000).toFixed(1)}M`;
      }
      return line;
    }).join('\n');
    parts.push('', `Unit Types & Prices:\n${unitLines}`);
  }

  parts.push('', `Source: ${compoundUrl}`);
  return parts.join('\n');
}

// ────────────────────────────────────────────────────────
//  Import one compound into DB
// ────────────────────────────────────────────────────────
async function importCompound(item, arCompound, enCompound) {
  const c = arCompound || {};
  const ce = enCompound || {};

  const nameAr = (c.name || item.nameAr || '').trim();
  const nameEn = (ce.name || c.nameEn || item.nameEn || '').trim() || null;
  const name = nameEn ? `${nameEn} | ${nameAr}` : nameAr;
  if (!nameAr) return null;

  // Check if already exists (by Arabic name or bilingual name)
  const existing = await pool.query(
    'SELECT id FROM projects WHERE name = $1 OR name = $2',
    [nameAr, name]
  );
  if (existing.rows.length > 0) {
    return { projectId: existing.rows[0].id, skipped: true };
  }

  // Developer
  const devNameAr = c.developerName || item.developerName || 'مطور غير محدد';
  const devNameEn = ce.developerName || null;
  const devLogo = c.developerLogoUrl || item.developerLogoUrl || null;
  const developerId = await getOrCreateDeveloper(devNameAr, devNameEn, devLogo);

  // Images (already full URLs from Nawy)
  let images = [];
  if (c.images && Array.isArray(c.images)) {
    images = c.images.map(img => {
      if (typeof img === 'string') return img;
      if (img?.url) return img.url;
      if (img?.id) return `https://prod-images.nawy.com/processed/compound_image/image/${img.id}/high.webp`;
      return null;
    }).filter(Boolean).slice(0, 20);
  }
  if (images.length === 0 && c.coverImageUrl) images.push(c.coverImageUrl);
  if (images.length === 0 && item.imageUrl) images.push(item.imageUrl);

  // Prices
  const prices = c.prices || {};
  const minPrice = prices.developerStartingPrice || null;
  const maxPrice = prices.developerEndingPrice || null;

  // Payment plans
  const plans = c.paymentPlans || c.installmentPlans || [];
  const planTextAr = buildPaymentPlanText(plans, 'ar');
  const planTextEn = buildPaymentPlanText(plans, 'en');

  // Amenities (objects with .name or plain strings)
  const amenitiesAr = (c.amenities || [])
    .map(a => typeof a === 'string' ? a : (a.name || ''))
    .filter(Boolean);

  const amenitiesEn = (ce.amenities || [])
    .map(a => typeof a === 'string' ? a : (a.nameEn || a.name || ''))
    .filter(Boolean);

  // Property types from listing or compound
  let propTypes = item.propTypes || [];
  if (propTypes.length === 0 && c.propertyTypes) {
    propTypes = (c.propertyTypes || []).map(pt => ({
      name: pt.name || '',
      nameEn: pt.nameEn || '',
      bedrooms: pt.bedrooms ?? null,
      minArea: pt.minArea ?? null,
      maxArea: pt.maxArea ?? null,
      minPrice: pt.minPrice ?? null,
      maxPrice: pt.maxPrice ?? null,
    }));
  }

  // Location
  const location = c.areaName || item.areaName || AREA_NAME_AR;
  const locationEn = ce.areaName || 'New Cairo';

  // Status
  const rawStatus = c.status || '';
  let status = 'under_construction';
  if (rawStatus === 'ready' || rawStatus === 'completed') status = 'ready';
  else if (rawStatus === 'off_plan') status = 'off_plan';

  // Delivery
  const deliveryDate = c.deliveryYear ? String(c.deliveryYear) : '';

  // Descriptions
  const compoundUrlAr = `https://www.nawy.com/ar/compound/${item.slug}`;
  const compoundUrlEn = `https://www.nawy.com/en/compound/${item.slug}`;
  const descriptionAr = buildDescription(nameAr, c.description || c.metaDescription || '', planTextAr, propTypes, minPrice, compoundUrlAr);
  const descriptionEn = buildDescriptionEn(nameEn, ce.description || ce.metaDescription || '', planTextEn, propTypes, minPrice, compoundUrlEn);

  // Insert project
  const result = await pool.query(
    `INSERT INTO projects 
      (developer_id, name, name_en, type, location, location_en, address, description, description_en,
       status, total_units, delivery_date, min_price, max_price, images, amenities, amenities_en, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true)
     RETURNING id`,
    [
      developerId,
      name,
      nameEn,
      'compound',
      location,
      locationEn,
      location,
      descriptionAr,
      descriptionEn,
      status,
      c.propertiesCount || 0,
      deliveryDate,
      minPrice,
      maxPrice,
      images,
      amenitiesAr,
      amenitiesEn.length > 0 ? amenitiesEn : null,
    ]
  );

  const projectId = result.rows[0].id;

  // Insert unit records — one per property type with realistic data
  let unitsInserted = 0;
  for (const pt of propTypes) {
    if (!pt.name) continue;

    const typeAr = pt.name;
    const typeEn = pt.nameEn || null;
    const bedrooms = pt.bedrooms ?? null;
    const area = pt.minArea || null;
    const areaMax = pt.maxArea || null;
    const unitPrice = pt.minPrice || minPrice || null;
    const unitPriceMax = pt.maxPrice || null;

    // Create a representative unit entry
    const unitNumber = bedrooms
      ? `${typeAr} ${bedrooms}غ${area ? ` - ${area}م²` : ''}`
      : `${typeAr}${area ? ` - ${area}م²` : ''}`;

    const notes = [
      areaMax && areaMax !== area ? `المساحة: ${area} - ${areaMax} م²` : null,
      unitPriceMax && unitPriceMax !== unitPrice ? `السعر: ${(unitPrice||0).toLocaleString()} - ${unitPriceMax.toLocaleString()} ج.م` : null,
    ].filter(Boolean).join(' | ') || null;

    const notesEn = [
      areaMax && areaMax !== area ? `Area: ${area} - ${areaMax} m²` : null,
      unitPriceMax && unitPriceMax !== unitPrice ? `Price: EGP ${(unitPrice||0).toLocaleString()} - ${unitPriceMax.toLocaleString()}` : null,
    ].filter(Boolean).join(' | ') || null;

    await pool.query(
      `INSERT INTO units (project_id, unit_number, type, type_en, bedrooms, area, price, status, finishing, notes, notes_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'available','كور أند شيل',$8,$9)`,
      [projectId, unitNumber, typeAr, typeEn, bedrooms, area, unitPrice, notes, notesEn]
    );
    unitsInserted++;

    // If area range, also insert a max-area unit
    if (areaMax && areaMax !== area) {
      const unitNumberMax = bedrooms
        ? `${typeAr} ${bedrooms}غ - ${areaMax}م²`
        : `${typeAr} - ${areaMax}م²`;
      await pool.query(
        `INSERT INTO units (project_id, unit_number, type, type_en, bedrooms, area, price, status, finishing, notes, notes_en)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'available','كور أند شيل',$8,$9)`,
        [projectId, unitNumberMax, typeAr, typeEn, bedrooms, areaMax, unitPriceMax || unitPrice, notes, notesEn]
      );
      unitsInserted++;
    }
  }

  // If no property types, add a generic placeholder
  if (unitsInserted === 0) {
    await pool.query(
      `INSERT INTO units (project_id, unit_number, type, price, status, finishing)
       VALUES ($1,$2,'وحدة سكنية',$3,'available','كور أند شيل')`,
      [projectId, `وحدة - ${nameAr}`, minPrice]
    );
    unitsInserted = 1;
  }

  return { projectId, unitsCount: unitsInserted, skipped: false };
}

// ────────────────────────────────────────────────────────
//  Main
// ────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 سحب بيانات كمبوندات القاهرة الجديدة من Nawy.com');
  console.log(`📍 المنطقة: areas=${AREA_ID} → ${AREA_NAME_AR}`);
  if (startIdx > 0 || endIdx < 9999) {
    console.log(`📦 المعالجة: ${startIdx} → ${endIdx}`);
  }
  console.log('='.repeat(60));

  try {
    await pool.query('SELECT 1');
    console.log('✅ الاتصال بقاعدة البيانات ناجح\n');
  } catch (e) {
    console.error('❌ فشل الاتصال:', e.message);
    process.exit(1);
  }

  // Get compound list — use cached file if available
  const listPath = '/tmp/new_cairo_list.json';
  let allCompounds;
  if (fs.existsSync(listPath)) {
    allCompounds = JSON.parse(fs.readFileSync(listPath, 'utf-8'));
    console.log(`📝 استخدام القائمة المحفوظة (${allCompounds.length} كمبوند)\n`);
  } else {
    allCompounds = await getAllCompoundSlugs();
    fs.writeFileSync(listPath, JSON.stringify(allCompounds, null, 2));
    console.log(`📝 القائمة محفوظة في ${listPath}\n`);
  }

  // Apply batch slice
  const batch = allCompounds.slice(startIdx, endIdx === 9999 ? allCompounds.length : endIdx);
  console.log(`🔄 معالجة ${batch.length} كمبوند...\n`);

  const stats = { total: batch.length, success: 0, failed: 0, skipped: 0, totalUnits: 0 };

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    const progress = `[${startIdx + i + 1}/${allCompounds.length}]`;
    process.stdout.write(`${progress} 🏙️ ${item.nameAr || item.slug}... `);

    try {
      await delay(DELAY_MS);
      const { arCompound, enCompound } = await fetchCompoundDetails(item);
      const result = await importCompound(item, arCompound, enCompound);

      if (!result) {
        process.stdout.write('❌ فشل (لا اسم)\n');
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
  console.log(`  🏠 إجمالي الوحدات المضافة: ${stats.totalUnits}`);
  console.log('='.repeat(60));

  await pool.end();
  console.log('\n✅ اكتملت العملية!');
}

main().catch(e => {
  console.error('Fatal:', e);
  pool.end();
  process.exit(1);
});
