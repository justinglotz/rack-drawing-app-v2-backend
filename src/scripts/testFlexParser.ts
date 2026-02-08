import 'dotenv/config';
import { fetchFlexPullsheetRaw } from '../services/flexApiService.js';
import { parseFlexData } from '../services/flexParser.js';

async function main() {
  const pullsheetId = 'ac277410-3d92-42c4-a332-68506e3f22d2';
  console.log(`Fetching pullsheet: ${pullsheetId}\n`);

  const raw = await fetchFlexPullsheetRaw(pullsheetId);

  // Debug: show structure
  console.log('Raw structure:');
  console.log('  data[0].name:', raw[0]?.name);
  console.log('  data[0].children count:', raw[0]?.children?.length);
  console.log('  First child name:', raw[0]?.children?.[0]?.name);
  console.log('  First child group:', raw[0]?.children?.[0]?.group);
  console.log('');

  const parsed = parseFlexData(raw);
  console.log('Parsed result:', JSON.stringify(parsed, null, 2));
}

main().catch(console.error);
