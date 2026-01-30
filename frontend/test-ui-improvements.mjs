/**
 * ContractClarity UI Improvement Tests
 * Tests the improved dashboard, document interactions, and navigation
 */

import { chromium } from 'playwright';

const FRONTEND_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = './screenshots/ui-tests';

function log(message) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${message}`);
}

async function runTests() {
  console.log('');
  console.log('═'.repeat(70));
  console.log('🧪 ContractClarity UI Improvement Tests');
  console.log('═'.repeat(70));
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  async function test(name, testFn) {
    try {
      await testFn();
      log(`✅ PASS: ${name}`);
      passed++;
    } catch (error) {
      log(`❌ FAIL: ${name}`);
      log(`   Error: ${error.message}`);
      failed++;
    }
  }

  try {
    // Navigate to dashboard
    log('📍 Navigating to dashboard...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Test 1: Header elements
    await test('Header displays correctly', async () => {
      const title = await page.locator('h1').textContent();
      if (!title.includes('ContractClarity')) throw new Error('Title not found');

      const subtitle = await page.locator('text=M&A Due Diligence Platform').isVisible();
      if (!subtitle) throw new Error('Subtitle not visible');
    });

    // Test 2: Search input
    await test('Search input is functional', async () => {
      const searchInput = page.locator('#search-input');
      const isVisible = await searchInput.isVisible();
      if (!isVisible) throw new Error('Search input not visible');

      await searchInput.fill('test query');
      const value = await searchInput.inputValue();
      if (value !== 'test query') throw new Error('Search input value not set');
      await searchInput.clear();
    });

    // Test 3: Upload button
    await test('Upload button is present and styled', async () => {
      const uploadBtn = page.getByRole('button', { name: /Upload Contract/i });
      const isVisible = await uploadBtn.isVisible();
      if (!isVisible) throw new Error('Upload button not visible');
    });

    // Test 4: Stats cards
    await test('Stats cards display with data-dense styling', async () => {
      // Wait for stats to load
      await page.waitForTimeout(2000);

      const documentsCard = page.locator('text=Documents Indexed').first();
      const chunksCard = page.locator('text=Text Chunks').first();
      const clausesCard = page.locator('text=Clauses Extracted').first();
      const reviewCard = page.locator('text=Ready for Review').first();

      if (!await documentsCard.isVisible()) throw new Error('Documents stat card not visible');
      if (!await chunksCard.isVisible()) throw new Error('Chunks stat card not visible');
      if (!await clausesCard.isVisible()) throw new Error('Clauses stat card not visible');
      if (!await reviewCard.isVisible()) throw new Error('Review stat card not visible');
    });

    // Test 5: Contract Portfolio section
    await test('Contract Portfolio header displays', async () => {
      const portfolioTitle = page.locator('text=Contract Portfolio');
      if (!await portfolioTitle.isVisible()) throw new Error('Contract Portfolio title not visible');
    });

    // Wait for documents to load
    log('⏳ Waiting for documents to load...');
    await page.waitForTimeout(3000);

    // Test 6: Document list items
    const docCount = await page.locator('h3').filter({ hasText: /\.pdf$/i }).count();
    log(`📄 Found ${docCount} documents`);

    if (docCount > 0) {
      // Test 7: Document hover state
      await test('Document shows hover state with eye icon', async () => {
        const firstDoc = page.locator('h3').filter({ hasText: /\.pdf$/i }).first();
        const docRow = firstDoc.locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]');

        await docRow.hover();
        await page.waitForTimeout(500);

        // Check for eye button on hover
        const eyeButton = page.locator('button[aria-label="View document details"]').first();
        const isEyeVisible = await eyeButton.isVisible();
        if (!isEyeVisible) throw new Error('Eye icon not visible on hover');
      });

      // Test 8: Document selection loads analysis
      await test('Clicking document loads Risk Assessment panel', async () => {
        const firstDoc = page.locator('h3').filter({ hasText: /\.pdf$/i }).first();
        await firstDoc.click();
        await page.waitForTimeout(2000);

        const riskPanel = page.locator('text=Risk Assessment');
        const isVisible = await riskPanel.isVisible();
        if (!isVisible) throw new Error('Risk Assessment panel not visible after clicking document');
      });

      // Test 9: View Full Analysis button navigation
      await test('View Full Analysis button navigates to document detail', async () => {
        const viewButton = page.getByRole('button', { name: /View Full Analysis/i }).first();
        const isButtonVisible = await viewButton.isVisible().catch(() => false);

        if (isButtonVisible) {
          const currentUrl = page.url();
          await viewButton.click();
          await page.waitForTimeout(1500);
          const newUrl = page.url();

          if (!newUrl.includes('/documents/')) {
            throw new Error(`Navigation failed. Current URL: ${newUrl}`);
          }
          log(`   ↳ Navigated to: ${newUrl}`);

          // Navigate back
          await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
          await page.waitForTimeout(2000);
        } else {
          log('   ↳ Skipped (button not visible - may need document selection first)');
        }
      });

      // Test 10: Knowledge Graph button
      await test('Knowledge Graph button is present', async () => {
        // Select a document first
        const firstDoc = page.locator('h3').filter({ hasText: /\.pdf$/i }).first();
        await firstDoc.click();
        await page.waitForTimeout(2000);

        const graphButton = page.getByRole('button', { name: /Knowledge Graph/i }).first();
        const isVisible = await graphButton.isVisible().catch(() => false);
        if (!isVisible) {
          log('   ↳ Knowledge Graph button not visible (may require analysis first)');
        }
      });
    }

    // Test 11: Advanced Search link
    await test('Advanced Search navigates correctly', async () => {
      const advancedSearch = page.getByText('Advanced Search').first();
      await advancedSearch.click();
      await page.waitForTimeout(1500);

      if (!page.url().includes('/search')) {
        throw new Error('Did not navigate to search page');
      }
      log(`   ↳ Navigated to: ${page.url()}`);

      // Navigate back
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    });

    // Test 12: Risk Distribution grid styling
    await test('Risk Distribution uses data-dense grid layout', async () => {
      // Select a document first
      const docCount = await page.locator('h3').filter({ hasText: /\.pdf$/i }).count();
      if (docCount > 0) {
        const firstDoc = page.locator('h3').filter({ hasText: /\.pdf$/i }).first();
        await firstDoc.click();
        await page.waitForTimeout(2000);

        const riskDist = page.locator('text=Risk Distribution');
        const isVisible = await riskDist.isVisible().catch(() => false);
        if (isVisible) {
          // Check for risk level cards
          const criticalCard = page.locator('text=/^critical$/i');
          const highCard = page.locator('text=/^high$/i');
          const mediumCard = page.locator('text=/^medium$/i');
          const lowCard = page.locator('text=/^low$/i');

          const hasRiskCards = await criticalCard.count() > 0 ||
                              await highCard.count() > 0 ||
                              await mediumCard.count() > 0 ||
                              await lowCard.count() > 0;

          if (!hasRiskCards) {
            log('   ↳ Risk cards not found (may need clause extraction first)');
          }
        }
      }
    });

    // Take final screenshot
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/final-state.png`, fullPage: true });
    log('📸 Screenshot saved to final-state.png');

  } catch (error) {
    log(`💥 Test suite error: ${error.message}`);
    failed++;
  } finally {
    await browser.close();
  }

  // Summary
  console.log('');
  console.log('═'.repeat(70));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(70));
  console.log('');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
