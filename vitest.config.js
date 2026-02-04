const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
    test: {
        environment: 'jsdom',
        include: ['tests/unit/**/*.test.js', 'tests/dom/**/*.test.js'],
        globals: true,
        clearMocks: true,
        restoreMocks: true
    }
});
