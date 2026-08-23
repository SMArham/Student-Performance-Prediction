/**
 * Playwright E2E Automated Test Suite
 * Student Performance Prediction & Analytics System
 * 
 * Verifies complete student lifecycle:
 * 1. Open Login page -> Enter credentials / 1-Click Demo -> Verify redirect to Dashboard (Page 1).
 * 2. Verify Dashboard KPI cards & Chart.js canvas presence.
 * 3. Navigate to Academic Records & Prediction (Page 2).
 * 4. Fill University inputs -> Click "Generate Prediction" -> Verify result card & 95% CI display.
 * 5. Navigate to Analytics (Page 3) -> Verify historical table & chart.
 * 6. Click Logout -> Verify redirect back to login.html.
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8005';

test.describe('Student Performance System E2E User Flow', () => {

  test('Complete Student Lifecycle: Auth -> Dashboard -> Prediction Form -> Analytics -> Logout', async ({ page }) => {
    // 1. Open Login Page
    await page.goto(`${BASE_URL}/login.html`);
    await expect(page).toHaveTitle(/Sign In|Student Performance/i);

    // Perform 1-Click Demo Login or fill form credentials
    const demoBtn = page.locator('#demo-login-btn');
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    } else {
      await page.fill('#email', 'demo.student@university.edu');
      await page.fill('#password', 'demo123456');
      await page.click('button[type="submit"]');
    }

    // Verify Redirect to Dashboard (Page 1)
    await page.waitForURL('**/dashboard.html', { timeout: 10000 });
    await expect(page.locator('#kpi-current-gpa')).toBeVisible();
    await expect(page.locator('#gpaProgressionChart')).toBeVisible();

    // 2. Verify Dashboard KPI Cards Presence
    await expect(page.locator('#kpi-cumulative-cgpa')).toBeVisible();
    await expect(page.locator('#kpi-predicted-gpa')).toBeVisible();
    await expect(page.locator('#kpi-status-badge')).toBeVisible();

    // 3. Navigate to Academic Records & Prediction (Page 2)
    const p2Link = page.locator('a[href="prediction.html"]').first();
    await p2Link.click();
    await page.waitForURL('**/prediction.html', { timeout: 10000 });

    // Verify Prediction Form Stage Selector
    const stageSelect = page.locator('#education-stage-select');
    await expect(stageSelect).toBeVisible();

    // Fill University inputs
    await page.fill('#field_Previous_CGPA', '3.50');
    await page.fill('#field_Attendance_Pct', '90.0');
    await page.fill('#field_Study_Hours_Per_Day', '5.0');
    await page.fill('#field_Sleep_Hours', '7.5');

    // Click "Generate Prediction"
    await page.click('#submit-btn');

    // 4. Verify Result Card & 95% Confidence Interval Range
    const resultCard = page.locator('#result-card');
    await expect(resultCard).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#res-predicted-score')).toBeVisible();
    await expect(page.locator('#res-ci-range')).toContainText('[');

    // 5. Navigate to Analytics (Page 3)
    const p3Link = page.locator('a[href="analytics.html"]').first();
    await p3Link.click();
    await page.waitForURL('**/analytics.html', { timeout: 10000 });

    // Verify Historical Table & Chart.js canvas
    await expect(page.locator('#historicalComparisonChart')).toBeVisible();
    await expect(page.locator('#analytics-history-tbody')).toBeVisible();
    const tableRows = page.locator('#analytics-history-tbody tr');
    expect(await tableRows.count()).toBeGreaterThan(0);

    // 6. Click Logout
    await page.click('#logout-btn');
    await page.waitForURL('**/login.html', { timeout: 10000 });
    await expect(page.locator('#login-form')).toBeVisible();
  });

});
