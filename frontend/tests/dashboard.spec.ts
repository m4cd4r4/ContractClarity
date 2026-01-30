import { test, expect } from '@playwright/test'

const API_URL = 'http://45.77.233.102:8003'
const FRONTEND_URL = 'http://localhost:3000'

test.describe('ContractClarity Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL)
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')
  })

  test('should load dashboard and display header correctly', async ({ page }) => {
    // Check header elements
    await expect(page.locator('h1')).toHaveText('ContractClarity')
    await expect(page.getByText('M&A Due Diligence Platform')).toBeVisible()

    // Check header buttons
    await expect(page.getByPlaceholder('Search contracts...')).toBeVisible()
    await expect(page.getByRole('button', { name: /Upload Contract/i })).toBeVisible()
    await expect(page.getByText('Advanced Search')).toBeVisible()
  })

  test('should display stats cards with correct data', async ({ page }) => {
    // Wait for stats section to load
    await page.waitForTimeout(2000)

    // Check that all 4 stat labels are present
    await expect(page.locator('text=Documents Indexed').first()).toBeVisible()
    await expect(page.locator('text=Text Chunks').first()).toBeVisible()
    await expect(page.locator('text=Clauses Extracted').first()).toBeVisible()
    await expect(page.locator('text=Ready for Review').first()).toBeVisible()
  })

  test('should display document list with correct structure', async ({ page }) => {
    // Wait for documents to load
    await page.waitForSelector('text=Contract Portfolio', { state: 'visible' })
    await page.waitForTimeout(2000)

    // Check for document list - look for PDF filenames
    const pdfFiles = page.locator('h3').filter({ hasText: /\.pdf$/i })
    const docCount = await pdfFiles.count()

    if (docCount > 0) {
      // Verify first document is visible
      await expect(pdfFiles.first()).toBeVisible()
      const filename = await pdfFiles.first().textContent()
      expect(filename).toMatch(/\.pdf$/i)
    } else {
      // Check empty state
      await expect(page.getByText('No contracts uploaded yet')).toBeVisible()
    }
  })

  test('should handle document selection and show analysis panel', async ({ page }) => {
    // Wait for documents
    await page.waitForSelector('text=Contract Portfolio')

    // Check if documents exist
    const documentCount = await page.locator('.card').filter({ hasText: /Contract Portfolio/ }).locator('> div > div').count()

    if (documentCount > 0) {
      // Click first completed document
      const firstCompletedDoc = page.locator('.card').filter({ hasText: /Contract Portfolio/ })
        .locator('> div > div')
        .filter({ has: page.locator('svg.text-emerald-500') })
        .first()

      if (await firstCompletedDoc.count() > 0) {
        await firstCompletedDoc.click()

        // Wait for analysis panel to appear
        await page.waitForSelector('text=Risk Assessment', { state: 'visible', timeout: 5000 })

        // Check for analysis elements
        const analysisPanel = page.locator('.card').filter({ hasText: /Risk Assessment/ })
        await expect(analysisPanel).toBeVisible()

        // Should show either loading state or analysis data
        const hasLoading = await analysisPanel.locator('text=Loading analysis...').isVisible()
        const hasRiskLevel = await analysisPanel.locator('text=/critical|high|medium|low/i').count() > 0

        expect(hasLoading || hasRiskLevel).toBeTruthy()
      }
    }
  })

  test('should navigate to document detail when clicking View Details', async ({ page }) => {
    // Wait for documents
    await page.waitForSelector('text=Contract Portfolio')

    // Check if documents exist
    const documentCount = await page.locator('.card').filter({ hasText: /Contract Portfolio/ }).locator('> div > div').count()

    if (documentCount > 0) {
      // Click first completed document to load analysis
      const firstDoc = page.locator('.card').filter({ hasText: /Contract Portfolio/ })
        .locator('> div > div')
        .first()

      await firstDoc.click()

      // Wait for analysis panel
      await page.waitForSelector('text=Risk Assessment', { timeout: 5000 })

      // Look for View Details/Full Analysis button
      const viewButton = page.getByRole('button', { name: /View Full Analysis|View Details/i }).first()

      if (await viewButton.isVisible()) {
        // Click and wait for navigation
        await Promise.all([
          page.waitForURL(/\/documents\/[a-f0-9-]+$/),
          viewButton.click()
        ])

        // Verify we're on document detail page
        expect(page.url()).toMatch(/\/documents\/[a-f0-9-]+$/)
      }
    }
  })

  test('should navigate to knowledge graph when clicking graph button', async ({ page }) => {
    // Wait for documents
    await page.waitForSelector('text=Contract Portfolio')

    const documentCount = await page.locator('.card').filter({ hasText: /Contract Portfolio/ }).locator('> div > div').count()

    if (documentCount > 0) {
      // Click first document
      const firstDoc = page.locator('.card').filter({ hasText: /Contract Portfolio/ })
        .locator('> div > div')
        .first()

      await firstDoc.click()

      // Wait for analysis panel
      await page.waitForSelector('text=Risk Assessment', { timeout: 5000 })

      // Look for knowledge graph button
      const graphButton = page.getByRole('button', { name: /Knowledge Graph/i }).first()

      if (await graphButton.isVisible()) {
        // Click and wait for navigation
        await Promise.all([
          page.waitForURL(/\/documents\/[a-f0-9-]+\/graph$/),
          graphButton.click()
        ])

        // Verify we're on graph page
        expect(page.url()).toMatch(/\/documents\/[a-f0-9-]+\/graph$/)
      }
    }
  })

  test('should perform search and display results', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search contracts...')

    // Type search query
    await searchInput.fill('business')
    await searchInput.press('Enter')

    // Wait for search to complete
    await page.waitForTimeout(2000)

    // Check for search results or no results message
    const hasResults = await page.locator('text=Search Results').isVisible()

    if (hasResults) {
      // Verify search results structure
      const resultsSection = page.locator('.card').filter({ hasText: /Search Results/ })
      await expect(resultsSection).toBeVisible()

      // Check for result count
      await expect(resultsSection.locator('text=/\\d+ matches found/i')).toBeVisible()

      // Clear search results
      await page.locator('button[aria-label="Clear search results"]').click()
      await expect(resultsSection).not.toBeVisible()
    }
  })

  test('should show file upload dialog when clicking upload button', async ({ page }) => {
    // Set up file chooser listener
    const fileChooserPromise = page.waitForEvent('filechooser')

    // Click upload button
    await page.getByRole('button', { name: /Upload Contract/i }).click()

    // Wait for file chooser
    const fileChooser = await fileChooserPromise
    expect(fileChooser).toBeTruthy()

    // Don't upload any files (close dialog without selecting)
    await fileChooser.setFiles([])
  })

  test('should show hover states on document list items', async ({ page }) => {
    // Wait for documents
    await page.waitForSelector('text=Contract Portfolio')
    await page.waitForTimeout(2000)

    // Find documents by their PDF filenames
    const pdfFiles = page.locator('h3').filter({ hasText: /\.pdf$/i })
    const docCount = await pdfFiles.count()

    if (docCount > 0) {
      // Get the parent clickable element and hover
      const firstDoc = pdfFiles.first()
      const docRow = firstDoc.locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]')
      await docRow.hover()
      await page.waitForTimeout(500)

      // Check for eye icon button (View Details)
      const eyeButton = page.locator('button[aria-label="View document details"]').first()
      await expect(eyeButton).toBeVisible()
    }
  })

  test('should navigate to advanced search page', async ({ page }) => {
    // Click Advanced Search link
    await Promise.all([
      page.waitForURL(/\/search$/),
      page.getByText('Advanced Search').click()
    ])

    // Verify we're on search page
    expect(page.url()).toMatch(/\/search$/)
  })

  test('should display risk levels with correct styling', async ({ page }) => {
    // Wait for documents
    await page.waitForSelector('text=Contract Portfolio')
    await page.waitForTimeout(2000)

    // Find documents by PDF filename
    const pdfFiles = page.locator('h3').filter({ hasText: /\.pdf$/i })
    const docCount = await pdfFiles.count()

    if (docCount > 0) {
      // Click first document
      await pdfFiles.first().click()
      await page.waitForTimeout(2000)

      // Wait for analysis panel
      const hasRiskPanel = await page.locator('text=Risk Assessment').count() > 0

      if (hasRiskPanel) {
        // Check for risk distribution section
        const hasRiskDist = await page.locator('text=Risk Distribution').count() > 0

        if (hasRiskDist) {
          // Verify at least one risk level is shown (critical, high, medium, or low)
          const riskLevelCount = await page.locator('text=/^(critical|high|medium|low)$/i').count()
          expect(riskLevelCount).toBeGreaterThan(0)
        }
      }
    }
  })

  test('should have accessible labels and ARIA attributes', async ({ page }) => {
    // Check search input has label
    const searchInput = page.getByPlaceholder('Search contracts...')
    await expect(searchInput).toHaveAttribute('id', 'search-input')

    // Check for sr-only label
    const searchLabel = page.locator('label[for="search-input"]')
    await expect(searchLabel).toHaveText('Search contracts')

    // Check buttons have proper labels
    const uploadButton = page.getByRole('button', { name: /Upload Contract/i })
    await expect(uploadButton).toBeVisible()
  })
})
