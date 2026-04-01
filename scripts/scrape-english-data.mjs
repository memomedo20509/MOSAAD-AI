import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require('https');
const { Pool } = require('pg');

const DB_URL = process.env.DOKPLOY_DB_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DB_URL });

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DELAY_MS = 600;

const startIdx = parseInt(process.argv[2] || '0');
const endIdx = parseInt(process.argv[3] || '9999');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
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

function slugToEnglishName(slug) {
  if (!slug) return null;
  const withoutId = slug.replace(/^\d+-/, '');
  return withoutId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

// Property type Arabic → English mapping (Nawy uses Arabic even in English pages sometimes)
const TYPE_MAP = {
  'شقة': 'Apartment',
  'فيلا': 'Villa',
  'دوبلكس': 'Duplex',
  'بنتهاوس': 'Penthouse',
  'استوديو': 'Studio',
  'تاون هاوس': 'Townhouse',
  'تجاري': 'Commercial',
  'أرض': 'Land',
  'وحدة سكنية': 'Residential Unit',
  'شاليه': 'Chalet',
  'كابينة': 'Cabin',
  'روف': 'Roof',
  'Twin House': 'Twin House',
  'Apartment': 'Apartment',
  'Villa': 'Villa',
  'Duplex': 'Duplex',
  'Penthouse': 'Penthouse',
  'Studio': 'Studio',
  'Townhouse': 'Townhouse',
  'Commercial': 'Commercial',
  'Land': 'Land',
  'Chalet': 'Chalet',
};

function translateType(arType) {
  if (!arType) return null;
  if (TYPE_MAP[arType]) return TYPE_MAP[arType];
  if (/^[A-Za-z\s]+$/.test(arType)) return arType;
  return null;
}

// Location Arabic → English mapping
const LOCATION_MAP = {
  'مدينة السادس من أكتوبر': '6th of October City',
  'التوسعات الشمالية': 'North Extensions',
  'حدائق اكتوبر': 'October Gardens',
  'العاصمة الإدارية الجديدة': 'New Administrative Capital',
  'القاهرة الجديدة': 'New Cairo',
  'الشيخ زايد': 'Sheikh Zayed',
  'الزمالك': 'Zamalek',
  'المعادي': 'Maadi',
  'مدينة نصر': 'Nasr City',
  'الرحاب': 'Rehab',
  'مدينتي': 'Madinaty',
  'بدر': 'Badr City',
  'العبور': 'Obour',
  'شرم الشيخ': 'Sharm El Sheikh',
  'الغردقة': 'Hurghada',
  'الساحل الشمالي': 'North Coast',
};

function translateLocation(arLocation) {
  if (!arLocation) return null;
  if (LOCATION_MAP[arLocation]) return LOCATION_MAP[arLocation];
  for (const [ar, en] of Object.entries(LOCATION_MAP)) {
    if (arLocation.includes(ar)) return LOCATION_MAP[ar];
  }
  if (/^[A-Za-z\s0-9]+$/.test(arLocation)) return arLocation;
  return null;
}

async function fetchEnglishCompoundData(slugEn, slugAr) {
  const url = `https://www.nawy.com/en/compound/${slugEn}`;
  try {
    const { body, status } = await fetchUrl(url);
    if (status !== 200) return null;
    const nd = extractNextData(body);
    if (!nd) return null;
    return nd.props?.pageProps?.compound || null;
  } catch (e) {
    return null;
  }
}

async function processProject(project) {
  const projectName = project.name;

  // Extract slugs from bilingual name: "English Name | عربي"
  let slugEn = null;
  let arabicName = projectName;

  if (projectName.includes(' | ')) {
    const [engPart, arPart] = projectName.split(' | ');
    arabicName = arPart.trim();
    // Convert English part back to slug format
    slugEn = engPart.trim().toLowerCase().replace(/\s+/g, '-');
  }

  // We need the Nawy slug (with ID prefix). Try to get it from the existing description
  // The description has: 🔗 المصدر: https://www.nawy.com/ar/compound/SLUG
  let arSlug = null;
  if (project.description) {
    const srcMatch = project.description.match(/nawy\.com\/ar\/compound\/([^\s\n]+)/);
    if (srcMatch) arSlug = srcMatch[1];
  }

  if (!arSlug && !slugEn) {
    return { status: 'no_slug' };
  }

  // Fetch from English Nawy page using arSlug (same slug works for both languages)
  let enCompound = null;

  if (arSlug) {
    const enUrl = `https://www.nawy.com/en/compound/${arSlug}`;
    try {
      const { body, status } = await fetchUrl(enUrl);
      if (status === 200) {
        const nd = extractNextData(body);
        if (nd) enCompound = nd.props?.pageProps?.compound || null;
      }
    } catch (e) { /* ignore */ }
  }

  // Build English data
  const updates = {};

  // English name
  if (enCompound?.name && /^[A-Za-z0-9\s&'.,()-]+$/.test(enCompound.name)) {
    updates.name_en = enCompound.name.trim();
  } else if (enCompound?.slugEn) {
    updates.name_en = slugToEnglishName(enCompound.slugEn);
  } else if (slugEn) {
    updates.name_en = slugToEnglishName(slugEn);
  }

  // English description
  if (enCompound) {
    const enDesc = enCompound.description || enCompound.metaDescription || '';
    if (enDesc && /[A-Za-z]/.test(enDesc)) {
      updates.description_en = enDesc.trim();
    } else if (enDesc) {
      updates.description_en = enDesc.trim();
    }

    // English amenities
    if (enCompound.amenities && Array.isArray(enCompound.amenities)) {
      const enAmenities = enCompound.amenities
        .map(a => typeof a === 'string' ? a : (a.name || ''))
        .filter(Boolean);
      if (enAmenities.length > 0) {
        updates.amenities_en = enAmenities;
      }
    }

    // English location
    if (enCompound.areaName) {
      if (/[A-Za-z]/.test(enCompound.areaName)) {
        updates.location_en = enCompound.areaName.trim();
      } else {
        const translated = translateLocation(enCompound.areaName);
        if (translated) updates.location_en = translated;
      }
    }
  }

  // Fallback: translate location from Arabic
  if (!updates.location_en && project.location) {
    const translated = translateLocation(project.location);
    if (translated) updates.location_en = translated;
  }

  // Update project
  if (Object.keys(updates).length === 0) {
    return { status: 'no_data' };
  }

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = [project.id, ...Object.values(updates)];
  await pool.query(`UPDATE projects SET ${setClauses} WHERE id = $1`, values);

  // Update units for this project (type_en)
  const units = await pool.query('SELECT id, type FROM units WHERE project_id = $1', [project.id]);
  for (const unit of units.rows) {
    const typeEn = translateType(unit.type);
    if (typeEn) {
      await pool.query('UPDATE units SET type_en = $1 WHERE id = $2', [typeEn, unit.id]);
    }
  }

  return { status: 'ok', updates: Object.keys(updates) };
}

async function updateDevelopersEnglish() {
  console.log('\n🏢 تحديث أسماء المطورين بالإنجليزية...');

  // Get all developers that have projects with English names (name_en)
  const result = await pool.query(`
    SELECT DISTINCT d.id, d.name, d.description,
      p.name_en as sample_project_en
    FROM developers d
    LEFT JOIN projects p ON p.developer_id = d.id AND p.name_en IS NOT NULL
    WHERE d.name_en IS NULL
    ORDER BY d.name
  `);

  console.log(`  Found ${result.rows.length} developers to update`);

  let updated = 0;
  for (const dev of result.rows) {
    const devName = dev.name;

    let nameEn = null;

    // If name is already English
    if (/^[A-Za-z0-9\s&'.,()-]+$/.test(devName)) {
      nameEn = devName.trim();
    } else if (devName.includes(' | ')) {
      const [en] = devName.split(' | ');
      nameEn = en.trim();
    }

    // Only store the English name sourced from bilingual format — no synthetic descriptions
    if (nameEn) {
      await pool.query(
        'UPDATE developers SET name_en = $1 WHERE id = $2',
        [nameEn, dev.id]
      );
      updated++;
    }
  }

  console.log(`  ✅ Updated ${updated} developers`);
}

async function main() {
  console.log('🌍 Scraping English data for all compounds from Nawy.com/en');
  console.log('='.repeat(60));

  await pool.query('SELECT 1');
  console.log('✅ DB connected\n');

  // Get all projects (slice by args)
  const allProjects = await pool.query(
    'SELECT id, name, description, location FROM projects ORDER BY name'
  );

  const batch = allProjects.rows.slice(startIdx, endIdx === 9999 ? allProjects.rows.length : endIdx);

  console.log(`📋 Processing ${batch.length} projects (${startIdx} → ${startIdx + batch.length - 1}) of ${allProjects.rows.length} total\n`);

  const stats = { ok: 0, no_data: 0, no_slug: 0, failed: 0 };

  for (let i = 0; i < batch.length; i++) {
    const project = batch[i];
    const globalIdx = startIdx + i + 1;
    process.stdout.write(`[${globalIdx}/${allProjects.rows.length}] ${project.name.substring(0, 50)}... `);

    try {
      await delay(DELAY_MS);
      const result = await processProject(project);
      if (result.status === 'ok') {
        process.stdout.write(`✅ (${result.updates.join(', ')})\n`);
        stats.ok++;
      } else if (result.status === 'no_data') {
        process.stdout.write('⚠️ no EN data\n');
        stats.no_data++;
      } else {
        process.stdout.write('⏭️ no slug\n');
        stats.no_slug++;
      }
    } catch (e) {
      process.stdout.write(`❌ ${e.message}\n`);
      stats.failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ OK: ${stats.ok} | ⚠️ No data: ${stats.no_data} | ⏭️ No slug: ${stats.no_slug} | ❌ Failed: ${stats.failed}`);

  // Update developers
  await updateDevelopersEnglish();

  // Update unit types for all projects
  console.log('\n🏠 Translating unit types...');
  const allUnits = await pool.query('SELECT id, type FROM units WHERE type_en IS NULL');
  let unitUpdated = 0;
  for (const unit of allUnits.rows) {
    const typeEn = translateType(unit.type);
    if (typeEn) {
      await pool.query('UPDATE units SET type_en = $1 WHERE id = $2', [typeEn, unit.id]);
      unitUpdated++;
    }
  }
  console.log(`  ✅ Updated ${unitUpdated} units with English type`);

  await pool.end();
  console.log('\n✅ Done!');
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
