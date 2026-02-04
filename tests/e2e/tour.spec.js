const { test, expect } = require('@playwright/test');

test('guided tour starts and transitions into training section', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('tour-start').click();

    await expect(page.locator('.tour-overlay')).toHaveClass(/active/);
    await expect(page.locator('.tour-title')).toHaveText('Architecture: Tokenization');

    await page.locator('.tour-next').click();
    await page.locator('.tour-next').click();
    await page.locator('.tour-next').click();

    await expect(page.locator('.tour-title')).toHaveText('Training: Data');
    await expect(page.getByTestId('section-tab-training')).toHaveClass(/active/);

    await page.locator('.tour-close').click();
    await expect(page.locator('.tour-overlay')).not.toHaveClass(/active/);
});
