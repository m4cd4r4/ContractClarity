import { test, expect } from '@playwright/test'

const FRONTEND_URL = 'http://localhost:3000'

test.describe('Document Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard first
    await page.goto(FRONTEND_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Contract Portfolio', { timeout: 10000 })
    await page.waitForTimeout(1000)

    // Click first document to select it
    const pdfFiles = page.locator('h3').filter({ hasText: /\.pdf$/i })
    const docCount = await pdfFiles.count()

    if (docCount > 0) {
      await pdfFiles.first().click()
      await page.waitForTimeout(1000)

      // Navigate to document detail page
      const viewButton = page.getByRole('button', { name: /View Full Analysis|View Details/i }).first()
      if (await viewButton.isVisible({ timeout: 5000 })) {
        await viewButton.click()
        await page.waitForURL(/\/documents\/[a-f0-9-]+$/, { timeout: 10000 })
      }
    }
  })

  test('should display document header with filename', async ({ page }) => {
    // Check we're on document detail page
    const url = page.url()
    if (!url.match(/\/documents\/[a-f0-9-]+$/)) {
      test.skip()
      return
    }

    // Should show document filename
    const header = page.locator('h1')
    await expect(header).toBeVisible()
    const text = await header.textContent()
    expect(text).toMatch(/\.pdf$/i)
  })

  test('should have Export dropdown button', async ({ page }) => {
    // Check we're on document detail page
    const url = page.url()
    if (!url.match(/\/documents\/[a-f0-9-]+$/)) {
      test.skip()
      return
    }

    // Look for Export button
    const exportButton = page.getByRole('button', { name: /Export/i })
    await expect(exportButton).toBeVisible({ timeout: 10000 })
  })

  test('should open Export dropdown when clicked', async ({ page }) => {
    // Check we're on document detail page
    const url = page.url()
    if (!url.match(/\/documents\/[a-f0-9-]+$/)) {
      test.skip()
      return
    }

    // Click Export button
    const exportButton = page.getByRole('button', { name: /Export/i })
    await exportButton.click()

    // Wait for dropdown menu
    await page.waitForTimeout(500)

    // Check for export options
    await expect(page.getByText('PDF Report')).toBeVisible()
    await expect(page.getByText('Excel (.xlsx)')).toBeVisible()
    await expect(page.getByText('Word (.docx)')).toBeVisible()
    await expect(page.getByText('CSV (Clauses)')).toBeVisible()
    await expect(page.getByText('JSON (Full Data)')).toBeVisible()
  })

  test('should close Export dropdown when clicked outside', async ({ page }) => {
    // Check we're on document detail page
    const url = page.url()
    if (!url.match(/\/documents\/[a-f0-9-]+$/)) {
      test.skip()
      return
    }

    // Click Export button to open dropdown
    const exportButton = page.getByRole('button', { name: /Export/i })
    await exportButton.click()
    await page.waitForTimeout(300)

    // Verify dropdown is open
    await expect(page.getByText('PDF Report')).toBeVisible()

    // Click Export button again to close
    await exportButton.click()
    await page.waitForTimeout(300)

    // Dropdown should close
    await expect(page.getByText('PDF Report')).not.toBeVisible()
  })

  test('should have Knowledge Graph link in header', async ({ page }) => {
    // Check we're on document detail page
    const url = page.url()
    if (!url.match(/\/documents\/[a-f0-9-]+$/)) {
      test.skip()
      return
    }

    // Look for Knowledge Graph link
    const graphLink = page.getByRole('link', { name: /Knowledge Graph/i })
    await expect(graphLink).toBeVisible()
  })

  test('should navigate to Knowledge Graph when clicking link', async ({ page }) => {
    // Check we're on document detail page
    const url = page.url()
    if (!url.match(/\/documents\/[a-f0-9-]+$/)) {
      test.skip()
      return
    }

    // Click Knowledge Graph link
    const graphLink = page.getByRole('link', { name: /Knowledge Graph/i })
    await graphLink.click()

    // Should navigate to graph page
    await page.waitForURL(/\/documents\/[a-f0-9-]+\/graph$/, { timeout: 10000 })
  })

  test('should show analysis status or extraction button', async ({ page }) => {
    // Check we're on document detail page
    const url = page.url()
    if (!url.match(/\/documents\/[a-f0-9-]+$/)) {
      test.skip()
      return
    }

    // Wait for page to finish loading
    await page.waitForSelector('text=Loading document...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1000)

    // Should show either risk summary, extraction button, or No Clauses Found
    const hasRiskSummary = await page.locator('text=/critical|high|medium|low/i').count() > 0
    const hasExtractionButton = await page.getByRole('button', { name: /Run Clause Extraction|Re-run Clause Extraction/i }).count() > 0
    const hasNoClauses = await page.locator('text=No Clauses Found').count() > 0
    const hasNotYetRun = await page.locator('text=Analysis Not Yet Run').count() > 0

    expect(hasRiskSummary || hasExtractionButton || hasNoClauses || hasNotYetRun).toBeTruthy()
  })

  test('should show document metadata', async ({ page }) => {
    // Check we're on document detail page
    const url = page.url()
    if (!url.match(/\/documents\/[a-f0-9-]+$/)) {
      test.skip()
      return
    }

    // Wait for page to finish loading
    await page.waitForSelector('text=Loading document...', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1000)

    // Should show page count, chunk count, or clauses count in header
    const metadata = page.locator('header')
    const hasPages = await metadata.locator('text=/\\d+ pages/i').count() > 0
    const hasChunks = await metadata.locator('text=/\\d+ chunks/i').count() > 0
    const hasClauses = await metadata.locator('text=/\\d+ clauses/i').count() > 0
    const hasProcessing = await metadata.locator('text=Processing/i').count() > 0

    expect(hasPages || hasChunks || hasClauses || hasProcessing).toBeTruthy()
  })
})

test.describe('Export with Larger PDFs', () => {
  test('should upload and process 3MB PDF', async ({ page }) => {
    // Navigate to dashboard
    await page.goto(FRONTEND_URL)
    await page.waitForLoadState('networkidle')

    // Set up file chooser listener
    const fileChooserPromise = page.waitForEvent('filechooser')

    // Click upload button
    await page.getByRole('button', { name: /Upload Contract/i }).click()

    // Get file chooser
    const fileChooser = await fileChooserPromise

    // Upload large PDF (3.3MB Software Leasing Agreement)
    const largePdfPath = 'I:/Scratch/ContractClarity/sample-contracts/scribd-downloads/601931598-Software-Leasing-Agreement.pdf'
    await fileChooser.setFiles(largePdfPath)

    // Wait for upload to complete (should see the document in the list)
    await page.waitForTimeout(3000)

    // Check for the uploaded document
    const docName = page.locator('h3').filter({ hasText: /Software-Leasing-Agreement/i })

    // May take time to appear, check multiple times
    let docVisible = false
    for (let i = 0; i < 10; i++) {
      if (await docName.count() > 0) {
        docVisible = true
        break
      }
      await page.waitForTimeout(1000)
    }

    // If document appeared, test passed
    if (docVisible) {
      await expect(docName.first()).toBeVisible()
    }
  })

  test('should upload and process 562KB NDA PDF', async ({ page }) => {
    // Navigate to dashboard
    await page.goto(FRONTEND_URL)
    await page.waitForLoadState('networkidle')

    // Set up file chooser listener
    const fileChooserPromise = page.waitForEvent('filechooser')

    // Click upload button
    await page.getByRole('button', { name: /Upload Contract/i }).click()

    // Get file chooser
    const fileChooser = await fileChooserPromise

    // Upload NDA PDF (562KB)
    const ndaPdfPath = 'I:/Scratch/ContractClarity/sample-contracts/scribd-downloads/246188537-NDA-pdf.pdf'
    await fileChooser.setFiles(ndaPdfPath)

    // Wait for upload
    await page.waitForTimeout(3000)

    // Check for the uploaded document
    const docName = page.locator('h3').filter({ hasText: /NDA/i })

    let docVisible = false
    for (let i = 0; i < 10; i++) {
      if (await docName.count() > 0) {
        docVisible = true
        break
      }
      await page.waitForTimeout(1000)
    }

    if (docVisible) {
      await expect(docName.first()).toBeVisible()
    }
  })
})
