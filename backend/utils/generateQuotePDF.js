const fs = require('fs');
const path = require('path');

let puppeteer = null;
let chromium = null;
let usingServerlessChromium = false;

try {
  // Use chrome-aws-lambda for serverless environment (Vercel)
  chromium = require('chrome-aws-lambda');
  puppeteer = require('puppeteer-core');
  usingServerlessChromium = true;
  console.log('[generateQuotePDF] Using puppeteer-core + chrome-aws-lambda (serverless)');
} catch (err) {
  // Local fallback for dev (you don't have full puppeteer installed, so this fallback may fail)
  try {
    puppeteer = require('puppeteer');
    usingServerlessChromium = false;
    console.log('[generateQuotePDF] Using full puppeteer (local fallback)');
  } catch (err2) {
    console.error('[generateQuotePDF] No puppeteer package found. Install puppeteer or puppeteer-core + chrome-aws-lambda.');
    throw err2;
  }
}

/**
 * Generates a PDF quote from a dynamic data object and HTML template.
 * @param {object} data
 * @returns {Promise<Buffer>}
 */
async function generateQuotePDF(data) {
  let html;
  try {
    const templatePath = path.join(__dirname, 'template.html');
    html = fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error('[generateQuotePDF] Error reading template.html:', error.message);
    throw new Error('Could not find or read HTML template file.');
  }

  // logo fallback
  let logoDataUri = 'https://placehold.co/150x50/cccccc/333333?text=Logo+Missing';
  try {
    const logoPath = path.join(__dirname, '..', 'logo-placeholder.png');
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    logoDataUri = `data:image/png;base64,${logoBase64}`;
  } catch (error) {
    console.warn('[generateQuotePDF] Logo not found, using placeholder.', error.message);
  }

  // build items html & compute totals
  let finalTotal = 0;
  let itemsHTML = '';
  (data.items || []).forEach((item, idx) => {
    const pathLengthArea = parseFloat(item.pathLengthArea || 0);
    const passes = parseFloat(item.passes || 0);
    const quantity = parseFloat(item.quantity || 0);
    const rate = parseFloat(data.rate || 0);

    const unitTotal = pathLengthArea * passes * rate;
    const itemTotal = unitTotal * quantity;
    finalTotal += itemTotal;

    itemsHTML += `
      <tr>
        <td>${idx + 1}</td>
        <td>${data.description || ''}</td>
        <td>${quantity}</td>
        <td>₹${unitTotal.toFixed(2)}</td>
        <td>₹${itemTotal.toFixed(2)}</td>
      </tr>`;
  });

  html = html
    .replace('{{logoBase64}}', logoDataUri)
    .replace('{{quoteNumber}}', 'Q-' + Date.now().toString().slice(-4))
    .replace('{{date}}', new Date().toLocaleDateString())
    .replace('{{dueDate}}', new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toLocaleDateString())
    .replace('{{customerName}}', data.customerName || '')
    .replace('{{items}}', itemsHTML)
    .replace('{{finalTotal}}', '₹' + finalTotal.toFixed(2));

  let browser = null;

  try {
    const launchOptions = { dumpio: true, timeout: 120000 };

    if (usingServerlessChromium && chromium) {
      launchOptions.args = chromium.args;
      launchOptions.executablePath = await chromium.executablePath;
      launchOptions.headless = chromium.headless;
      launchOptions.defaultViewport = chromium.defaultViewport || { width: 1280, height: 800 };
      launchOptions.ignoreHTTPSErrors = true;

      console.log('[generateQuotePDF] Launching serverless chromium with args:', launchOptions.args);
    } else {
      launchOptions.headless = 'new';
      launchOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
      launchOptions.defaultViewport = { width: 1280, height: 800 };

      console.log('[generateQuotePDF] Launching local puppeteer with args:', launchOptions.args);
    }

    browser = await puppeteer.launch(launchOptions);
  } catch (e) {
    console.error('[generateQuotePDF] Failed to launch browser:', e.message || e);
    throw new Error(`Browser failed to launch. ${usingServerlessChromium ? 'Check chrome-aws-lambda is in dependencies and environment is configured properly.' : 'Ensure puppeteer is installed locally.'} Raw error: ${e.message || e}`);
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '40px', bottom: '40px', left: '40px' }
    });

    return pdfBuffer;
  } finally {
    try {
      if (browser) await browser.close();
    } catch (closeErr) {
      console.warn('[generateQuotePDF] Error closing browser:', closeErr.message || closeErr);
    }
  }
}

module.exports = generateQuotePDF;
