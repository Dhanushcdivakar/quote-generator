const fs = require('fs');
const path = require('path');

let puppeteer;
let chromium;
let usingServerlessChromium = false;

// Initialize Chromium properly
async function initChromium() {
  try {
    chromium = require('@sparticuz/chromium');
    puppeteer = require('puppeteer-core');
    usingServerlessChromium = true;
    
    // Force Chromium path
    const executablePath = await chromium.executablePath();
    if (!executablePath) {
      throw new Error('Chromium executable not found');
    }
    
    return true;
  } catch (err) {
    console.warn('Serverless Chromium init failed, trying local fallback:', err.message);
    try {
      puppeteer = require('puppeteer');
      return true;
    } catch (err2) {
      console.error('No puppeteer package found');
      throw new Error('No valid Puppeteer installation found');
    }
  }
}

/**
 * Generates a PDF quote from a dynamic data object and HTML template.
 * @param {object} data - The quote data
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generateQuotePDF(data) {
  // Read HTML template
  let html;
  try {
    const templatePath = path.join(__dirname, 'template.html');
    html = fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error('Error reading template.html:', error.message);
    throw new Error('Could not find or read HTML template file.');
  }

  // Handle logo - fallback to placeholder if not found
  let logoDataUri = 'https://placehold.co/150x50/cccccc/333333?text=Logo+Missing';
  try {
    const logoPath = path.join(__dirname, '..', 'logo-placeholder.png');
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    logoDataUri = `data:image/png;base64,${logoBase64}`;
  } catch (error) {
    console.warn('Logo not found, using placeholder.', error.message);
  }

  // Process items and calculate totals
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

  // Replace template placeholders with actual data
  html = html
    .replace('{{logoBase64}}', logoDataUri)
    .replace('{{quoteNumber}}', 'Q-' + Date.now().toString().slice(-4))
    .replace('{{date}}', new Date().toLocaleDateString())
    .replace('{{dueDate}}', new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toLocaleDateString())
    .replace('{{customerName}}', data.customerName || '')
    .replace('{{items}}', itemsHTML)
    .replace('{{finalTotal}}', '₹' + finalTotal.toFixed(2));

  // Initialize Chromium
  if (!await initChromium()) {
    throw new Error('Chromium initialization failed');
  }

  let browser;
  try {
    const launchOptions = {
      args: chromium ? chromium.args : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      executablePath: chromium ? await chromium.executablePath() : undefined,
      headless: chromium ? chromium.headless : 'new',
      defaultViewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
      timeout: 30000
    };

    console.log('Launching browser with options:', launchOptions);
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '40px', bottom: '40px', left: '40px' },
      timeout: 30000
    });

    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn('Browser close error:', closeError);
      }
    }
  }
}

module.exports = generateQuotePDF;
