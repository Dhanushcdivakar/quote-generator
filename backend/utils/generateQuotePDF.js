const fs = require('fs');
const path = require('path');

// Conditionally require packages based on environment
let puppeteer;
let chromium;

// Vercel's environment variable to detect production.
const isVercel = process.env.VERCEL_ENV === "production";

if (isVercel) {
    // Use puppeteer-core and @sparticuz/chromium on Vercel
    puppeteer = require('puppeteer-core');
    chromium = require('@sparticuz/chromium');
} else {
    // Use the standard puppeteer package for local development
    puppeteer = require('puppeteer');
}

/**
 * Generates a PDF quote from a dynamic data object and HTML template.
 * @param {object} data - The data object containing form details and items.
 * @param {string} data.customerName - The customer's name.
 * @param {string} data.description - A general description for the job.
 * @param {number} data.rate - The rate per unit (e.g., per mm).
 * @param {array} data.items - An array of item objects.
 * @param {object} data.items[].pathLengthArea - The path length or area of the item.
 * @param {object} data.items[].thickness - The thickness of the item.
 * @param {object} data.items[].passes - The number of passes for the item.
 * @param {object} data.items[].quantity - The quantity of the item.
 * @returns {Promise<Buffer>} - A promise that resolves to the PDF buffer.
 */
async function generateQuotePDF(data) {
    let html;
    try {
        const templatePath = path.join(__dirname, 'template.html');
        html = fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
        console.error('Error reading template.html file:', error.message);
        throw new Error('Could not find or read HTML template file.');
    }

    let logoDataUri = 'https://placehold.co/150x50/cccccc/333333?text=Logo+Missing';
    try {
        const logoPath = path.join(__dirname, '..', 'logo-placeholder.png');
        const logoBase64 = fs.readFileSync(logoPath).toString('base64');
        logoDataUri = `data:image/png;base64,${logoBase64}`;
    } catch (error) {
        console.error('Error reading logo file. Falling back to placeholder image.', error.message);
    }

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
          <td>${data.description} </td>
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

    // --- REVISED PUPPETEER LAUNCH CODE ---
    let browser;
    try {
        if (isVercel) {
            // Use a comprehensive set of launch args for serverless environments.
            browser = await puppeteer.launch({
                args: [
                    ...chromium.args,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--single-process',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    // The following argument is often needed to bypass the libnss3.so issue.
                    '--disable-features=site-per-process'
                ],
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            });
        } else {
            // Standard launch for local development
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
    } catch (e) {
        console.error('Failed to launch browser:', e);
        throw new Error(`Browser failed to launch. The underlying error is likely a missing dependency.
            Please ensure you have run 'npm install' and that your package versions
            are compatible with the Vercel runtime. Error: ${e.message}`);
    }
    // --- END OF REVISED CODE ---

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20px',
            right: '40px',
            bottom: '40px',
            left: '40px'
        }
    });

    await browser.close();
    return pdfBuffer;
}

module.exports = generateQuotePDF;
