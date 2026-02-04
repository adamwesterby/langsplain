const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: true,
    retries: process.env.CI ? 1 : 0,
    timeout: 30_000,
    expect: {
        timeout: 5_000
    },
    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }]
    ],
    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            use: {
                browserName: 'chromium'
            }
        }
    ],
    outputDir: 'test-results',
    webServer: {
        command: 'python3 -m http.server 4173',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
    }
});
