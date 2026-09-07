import fs from 'node:fs';

const inputPath = process.argv[2] || 'results.json';

if (!fs.existsSync(inputPath)) {
  console.error(`results file not found: ${inputPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
const grouped = new Map();

const suites = data.suites ?? [];

function getErrorSignature(result) {
  const firstError = result?.errors?.[0];
  return firstError?.message || firstError?.stack || result?.error?.message || 'Unknown failure';
}

function getMerchantUrl(result) {
  const attachment = result?.attachments?.find((a) => a.name === 'merchant_url');

  if (attachment?.body) {
    return Buffer.from(attachment.body, 'base64').toString('utf-8');
  }

  return process.env.MERCHANT_URL || 'unknown_merchant';
}

function visitSuite(suite) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      for (const result of test.results ?? []) {
        if (result.status !== 'failed') {
          continue;
        }

        const signature = getErrorSignature(result);
        const merchantUrl = getMerchantUrl(result);

        if (!grouped.has(signature)) {
          grouped.set(signature, {
            signature,
            affected_merchants: new Set(),
            tests: []
          });
        }

        const entry = grouped.get(signature);
        entry.affected_merchants.add(merchantUrl);
        entry.tests.push({
          title: test.title,
          file: spec.file,
          project: test.projectName
        });
      }
    }
  }

  for (const child of suite.suites ?? []) {
    visitSuite(child);
  }
}

for (const suite of suites) {
  visitSuite(suite);
}

const tickets = Array.from(grouped.values()).map((entry, index) => ({
  master_ticket_title: `Master Failure Group ${index + 1}`,
  error_signature: entry.signature,
  merchant_urls: Array.from(entry.affected_merchants),
  impacted_tests: entry.tests
}));

const payload = {
  generated_at: new Date().toISOString(),
  total_master_tickets: tickets.length,
  tickets
};

console.log(JSON.stringify(payload, null, 2));
