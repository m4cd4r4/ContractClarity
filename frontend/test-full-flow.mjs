import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const testPdf = path.resolve('I:/Scratch/ContractClarity/sample-contracts/scribd-downloads/479112394-Business-Acquisition-Agreement.pdf');
const screenshotsDir = 'screenshots/flow';

// Create screenshots directory
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testFullFlow() {
  console.log('🚀 ContractClarity Full Flow Test\n');
  console.log('═'.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down for visual inspection
  });

  const page = await browser.newPage();
  let stepNum = 0;

  // Helper: Take screenshot with step number
  const screenshot = async (name) => {
    stepNum++;
    const filename = `${screenshotsDir}/${stepNum.toString().padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`📸 Screenshot: ${filename}`);
    return filename;
  };

  // Helper: Log with timestamp
  const log = (emoji, message) => {
    const time = new Date().toLocaleTimeString();
    console.log(`${emoji} [${time}] ${message}`);
  };

  // Helper: Check API status
  const checkApiStatus = async (url) => {
    try {
      const response = await page.evaluate(async (apiUrl) => {
        const res = await fetch(apiUrl);
        return {
          status: res.status,
          data: await res.json()
        };
      }, url);
      return response;
    } catch (error) {
      return { error: error.message };
    }
  };

  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('DevTools') && !text.includes('Download the React')) {
      console.log(`  🌐 Browser: ${text}`);
    }
  });

  // Listen to network requests
  const networkLog = [];
  page.on('response', response => {
    const url = response.url();
    if (url.includes('45.77.233.102:8003')) {
      const status = response.status();
      const method = response.request().method();
      const emoji = status >= 200 && status < 300 ? '✅' : '❌';
      log(emoji, `${method} ${url} → ${status}`);
      networkLog.push({ method, url, status, time: new Date() });
    }
  });

  try {
    // STEP 1: Navigate to dashboard
    log('🌍', 'Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot('dashboard-loaded');

    // STEP 2: Check initial state
    log('🔍', 'Checking initial document count');
    const initialDocs = await page.locator('[class*="Contract Portfolio"]').count();
    log('📊', `Initial documents: ${initialDocs}`);
    await screenshot('initial-state');

    // STEP 3: Find and click upload button
    log('🔼', 'Looking for upload button');
    const uploadBtn = page.locator('button:has-text("Upload")').first();
    await uploadBtn.highlight();
    await screenshot('upload-button-highlighted');

    log('👆', 'Clicking upload button');
    await uploadBtn.click();
    await page.waitForTimeout(500);

    // STEP 4: Upload file
    log('📄', `Uploading: ${path.basename(testPdf)}`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdf);

    log('⏳', 'Waiting for upload to complete...');
    await page.waitForTimeout(2000);
    await screenshot('upload-initiated');

    // STEP 5: Wait for document to appear in list
    log('🔎', 'Looking for document in list');
    const docName = '479112394-Business-Acquisition-Agreement';

    let docFound = false;
    for (let i = 0; i < 10; i++) {
      const count = await page.locator(`text=${docName}`).count();
      if (count > 0) {
        docFound = true;
        log('✅', 'Document found in list!');
        break;
      }
      await page.waitForTimeout(1000);
    }

    if (!docFound) {
      log('❌', 'Document not found in list after 10 seconds');
      await screenshot('document-not-found');
      throw new Error('Document upload failed');
    }

    await screenshot('document-in-list');

    // STEP 6: Click on document to view details
    log('👆', 'Clicking on document to view details');
    const docItem = page.locator(`text=${docName}`).first();
    await docItem.click();
    await page.waitForTimeout(1000);
    await screenshot('document-selected');

    // STEP 7: Monitor processing status
    log('⏱️', 'Monitoring document processing status...');

    let processingComplete = false;
    let statusChecks = 0;
    const maxChecks = 60; // 60 seconds max

    while (!processingComplete && statusChecks < maxChecks) {
      statusChecks++;

      // Check if "Processing..." is visible
      const processingText = await page.locator('text=Processing').count();
      const completedText = await page.locator('text=completed').count();

      if (processingText > 0) {
        log('⏳', `Status: Processing... (check ${statusChecks}/${maxChecks})`);
      } else if (completedText > 0) {
        log('✅', 'Status: Completed!');
        processingComplete = true;
        break;
      }

      // Check stats for changes
      const stats = await page.locator('[class*="stat-value"]').allTextContents();
      log('📊', `Stats: ${stats.join(', ')}`);

      await page.waitForTimeout(1000);

      if (statusChecks % 5 === 0) {
        await screenshot(`processing-check-${statusChecks}`);
      }
    }

    if (!processingComplete) {
      log('⚠️', 'Document still processing after 60 seconds');
      await screenshot('processing-timeout');

      // Check API directly
      log('🔍', 'Checking backend API status...');
      const apiCheck = await checkApiStatus('http://45.77.233.102:8003/documents');
      log('📡', `API Response: ${JSON.stringify(apiCheck, null, 2)}`);
    }

    await screenshot('final-state');

    // STEP 8: Try to extract clauses
    log('🔍', 'Looking for clause extraction button');
    const extractBtn = await page.locator('button:has-text("Run Clause Extraction")').count();

    if (extractBtn > 0) {
      log('👆', 'Clicking clause extraction');
      await page.locator('button:has-text("Run Clause Extraction")').click();
      await page.waitForTimeout(2000);
      await screenshot('clause-extraction-initiated');

      log('⏳', 'Waiting for clause extraction...');
      await page.waitForTimeout(5000);
      await screenshot('clause-extraction-progress');
    } else {
      log('ℹ️', 'Clause extraction button not visible (document may need to complete processing first)');
    }

    // STEP 9: Check for any visible errors
    log('🔍', 'Checking for error messages');
    const errorTexts = await page.locator('text=/error|fail|timeout/i').allTextContents();
    if (errorTexts.length > 0) {
      log('⚠️', `Errors found: ${errorTexts.join(', ')}`);
    } else {
      log('✅', 'No error messages visible');
    }

    // STEP 10: Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Screenshots taken: ${stepNum}`);
    console.log(`📡 API calls made: ${networkLog.length}`);
    console.log(`⏱️  Status checks: ${statusChecks}`);
    console.log(`📄 Document uploaded: ${docFound ? 'Yes' : 'No'}`);
    console.log(`✅ Processing complete: ${processingComplete ? 'Yes' : 'No'}`);

    console.log('\n📡 Network Activity:');
    networkLog.forEach(req => {
      const emoji = req.status >= 200 && req.status < 300 ? '✅' : '❌';
      console.log(`  ${emoji} ${req.method} ${req.url.split('/').pop()} (${req.status})`);
    });

    console.log('\n✅ Test completed successfully!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    await screenshot('error-state');
  }

  // Keep browser open for manual inspection
  log('👀', 'Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  log('👋', 'Test complete!');
}

testFullFlow().catch(console.error);
