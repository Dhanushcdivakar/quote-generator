const fs = require('fs');
const path = require('path');

// Conditionally require packages based on environment
let puppeteer;
let chromium;

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
    let templatePath = path.join(__dirname, 'template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Initialize logoDataUri with a fallback placeholder URL
    let logoDataUri = 'https://placehold.co/150x50/cccccc/333333?text=Logo+Missing';

    // Try to read the logo file and convert it to a Base64 string
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
        const unitTotal = parseFloat(item.pathLengthArea) * parseFloat(item.passes) * parseFloat(data.rate);
        const itemTotal = unitTotal * parseFloat(item.quantity);
        finalTotal += itemTotal;

        itemsHTML += `
        <tr>
          <td>${idx + 1}</td>
          <td>${data.description} </td>
          <td>${item.quantity}</td>
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
    if (isVercel) {
        // Launch with @sparticuz/chromium on Vercel
        browser = await puppeteer.launch({
            args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    } else {
        // Standard launch for local development
        browser = await puppeteer.launch({
            headless: 'new', // or true
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
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
