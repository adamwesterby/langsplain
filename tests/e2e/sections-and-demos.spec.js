const { test, expect } = require('@playwright/test');

test('section tabs toggle demo visibility and modals open/close', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('section-tab-architecture')).toHaveClass(/active/);
    await expect(page.getByTestId('demo-attention')).toBeVisible();
    await expect(page.getByTestId('demo-gradient')).toBeHidden();

    await page.getByTestId('demo-attention').click();
    await expect(page.locator('#attention-modal')).toHaveClass(/open/);
    await page.getByTestId('modal-close-attention').click();
    await expect(page.locator('#attention-modal')).not.toHaveClass(/open/);

    await page.getByTestId('section-tab-training').click();
    await expect(page.getByTestId('section-tab-training')).toHaveClass(/active/);
    await expect(page.getByTestId('demo-gradient')).toBeVisible();
    await expect(page.getByTestId('demo-attention')).toBeHidden();

    await page.getByTestId('demo-gradient').click();
    await expect(page.locator('#gradient-modal')).toHaveClass(/open/);
    await page.getByTestId('modal-close-gradient').click();
    await expect(page.locator('#gradient-modal')).not.toHaveClass(/open/);

    await page.getByTestId('section-tab-inference').click();
    await expect(page.getByTestId('section-tab-inference')).toHaveClass(/active/);
    await expect(page.getByTestId('demo-sampling')).toBeVisible();

    await page.getByTestId('demo-sampling').click();
    await expect(page.locator('#sampling-modal')).toHaveClass(/open/);
    await page.getByTestId('modal-close-sampling').click();
    await expect(page.locator('#sampling-modal')).not.toHaveClass(/open/);
});

test.describe('mobile smoke', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('core controls remain usable on mobile viewport', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByTestId('tour-start')).toBeVisible();

        await page.getByTestId('section-tab-inference').click();
        await expect(page.getByTestId('demo-sampling')).toBeVisible();

        await page.getByTestId('demo-sampling').click();
        await expect(page.locator('#sampling-modal')).toHaveClass(/open/);
        await page.getByTestId('modal-close-sampling').click();
        await expect(page.locator('#sampling-modal')).not.toHaveClass(/open/);
    });
});
