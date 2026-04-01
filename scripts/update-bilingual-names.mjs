import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require('https');
const { Pool } = require('pg');
const fs = require('fs');

const DB_URL = process.env.DOKPLOY_DB_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DB_URL });

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DELAY_MS = 500;

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Args: node script.mjs [startIndex] [endIndex]
const startIdx = parseInt(process.argv[2] || '0');
const endIdx = parseInt(process.argv[3] || '9999');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,*/*;q=0.8',
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

// Convert slug to English title: "1793-hyde-park-signature" → "Hyde Park Signature"
function slugToEnglishName(slug) {
  if (!slug) return null;
  // Remove leading ID number (e.g. "1793-")
  const withoutId = slug.replace(/^\d+-/, '');
  // Convert hyphens to spaces and capitalize each word
  return withoutId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

async function main() {
  console.log('🌍 تحديث أسماء الكمبوندات لتكون ثنائية اللغة (عربي + إنجليزي)');
  console.log('='.repeat(60));

  await pool.query('SELECT 1');
  console.log('✅ الاتصال بقاعدة البيانات ناجح\n');

  // Load compound list
  const listPath = '/tmp/october_list.json';
  if (!fs.existsSync(listPath)) {
    console.error('❌ القائمة غير موجودة. شغّل scrape-october.mjs أولاً');
    process.exit(1);
  }
  const compoundList = JSON.parse(fs.readFileSync(listPath, 'utf8'));
  const batch = compoundList.slice(startIdx, endIdx);

  console.log(`📋 معالجة ${batch.length} كمبوند (${startIdx} → ${Math.min(endIdx - 1, compoundList.length - 1)})\n`);

  const stats = { updated: 0, skipped: 0, failed: 0, notFound: 0 };

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    const globalIdx = startIdx + i + 1;
    process.stdout.write(`[${globalIdx}/${compoundList.length}] ${item.name}... `);

    try {
      // Check if project exists in DB by Arabic name (trim whitespace)
      const trimmedName = item.name.trim();
      const dbRow = await pool.query(
        'SELECT id, name FROM projects WHERE TRIM(name) = $1 OR name LIKE $2 OR TRIM(name) LIKE $3',
        [trimmedName, `% | ${trimmedName}`, `% | ${trimmedName}%`]
      );

      if (dbRow.rows.length === 0) {
        process.stdout.write('⚠️ غير موجود في قاعدة البيانات\n');
        stats.notFound++;
        continue;
      }

      const projectId = dbRow.rows[0].id;
      const currentName = dbRow.rows[0].name;

      // Check if already bilingual (contains |)
      if (currentName.includes(' | ')) {
        process.stdout.write('⏭️ محدّث مسبقاً\n');
        stats.skipped++;
        continue;
      }

      // Fetch compound page to get slugEn
      await delay(DELAY_MS);
      const url = `https://www.nawy.com/ar/compound/${item.slug}`;
      const { body, status } = await fetchUrl(url);

      let englishName = null;

      if (status === 200) {
        const nd = extractNextData(body);
        if (nd && nd.props.pageProps.compound) {
          const c = nd.props.pageProps.compound;
          // Get English name from slugEn
          if (c.slugEn) {
            englishName = slugToEnglishName(c.slugEn);
          }
          // Also try metaTitle for embedded English name
          if (!englishName && c.metaTitle) {
            // metaTitle format: "أسعار كمبوند اسم-عربي English Name- Nawy"
            const metaMatch = c.metaTitle.match(/([A-Z][A-Za-z\s0-9&'-]+?)(?:\s*[-–]\s*Nawy)?$/);
            if (metaMatch) englishName = metaMatch[1].trim();
          }
        }
      }

      if (!englishName) {
        // Fallback: try to extract from the slug itself
        englishName = slugToEnglishName(item.slug);
      }

      // Build bilingual name: "English Name | الاسم العربي"
      const arabicName = item.name.trim();
      const bilingualName = englishName && englishName !== arabicName
        ? `${englishName} | ${arabicName}`
        : arabicName;

      // Update name in projects table
      await pool.query('UPDATE projects SET name = $1 WHERE id = $2', [bilingualName, projectId]);

      // Also update unit names that reference this project
      await pool.query(
        `UPDATE units SET unit_number = REPLACE(unit_number, $1, $2) WHERE project_id = $3 AND unit_number LIKE $4`,
        [arabicName, bilingualName, projectId, `% - ${arabicName}`]
      );

      process.stdout.write(`✅ ${bilingualName}\n`);
      stats.updated++;

    } catch (e) {
      process.stdout.write(`❌ ${e.message}\n`);
      stats.failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ محدّث: ${stats.updated} | ⏭️ موجود: ${stats.skipped} | ⚠️ غير موجود: ${stats.notFound} | ❌ فشل: ${stats.failed}`);
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
