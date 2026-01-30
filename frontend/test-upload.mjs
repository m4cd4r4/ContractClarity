import { chromium } from 'playwright';
import path from 'path';

const testPdf = path.resolve('I:/Scratch/ContractClarity/sample-contracts/scribd-downloads/479112394-Business-Acquisition-Agreement.pdf');

async function testUpload() {
  console.log('🔍 Testing ContractClarity upload...');
  console.log('PDF:', testPdf);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => console.log('Browser:', msg.text()));

  // Listen for network errors
  page.on('requestfailed', request => {
    console.error('❌ Request failed:', request.url(), request.failure().errorText);
  });

  // Listen for responses
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/upload') || url.includes('/documents')) {
      console.log(`📡 ${response.status()} ${url}`);
    }
  });

  try {
    console.log('\n1. Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshots/1-dashboard.png' });

    console.log('\n2. Looking for upload button...');
    const uploadButton = await page.locator('button:has-text("Upload")').first();
    await uploadButton.screenshot({ path: 'screenshots/2-upload-button.png' });

    console.log('\n3. Clicking upload button...');
    await uploadButton.click();
    await page.waitForTimeout(500);

    console.log('\n4. Looking for file input...');
    const fileInput = await page.locator('input[type="file"]');
    console.log('File input found:', await fileInput.count());

    console.log('\n5. Setting file...');
    await fileInput.setInputFiles(testPdf);

    console.log('\n6. Waiting for upload to process...');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'screenshots/3-after-upload.png' });

    console.log('\n7. Checking for document in list...');
    const docList = await page.locator('text=Business-Acquisition-Agreement').count();
    console.log('Document found in list:', docList > 0);

    console.log('\n✅ Test complete - check screenshots folder');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'screenshots/error.png' });
  }

  await page.waitForTimeout(3000);
  await browser.close();
}

testUpload().catch(console.error);
