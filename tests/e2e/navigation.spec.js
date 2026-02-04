const { test, expect } = require('@playwright/test');

test('loads app and switches between Home/Glossary/About views', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('view-home')).toHaveClass(/active/);

    await page.getByTestId('nav-glossary').click();
    await expect(page.getByTestId('view-glossary')).toHaveClass(/active/);

    await page.getByTestId('nav-about').click();
    await expect(page.getByTestId('view-about')).toHaveClass(/active/);

    await page.getByTestId('nav-home').click();
    await expect(page.getByTestId('view-home')).toHaveClass(/active/);
});
