const fs = require('fs');
const path = require('path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

function readConfig(configPath) {
    const resolvedPath = path.resolve(configPath || path.join(__dirname, 'config.json'));

    try {
        const raw = fs.readFileSync(resolvedPath, 'utf8');
        const config = JSON.parse(raw);

        if (!config || typeof config !== 'object') {
            throw new Error('Configuration file must contain a JSON object.');
        }

        if (!config.url) {
            throw new Error('Missing required config.url value.');
        }

        config.selectors = Array.isArray(config.selectors)
            ? config.selectors
            : (typeof config.selector === 'string' ? [config.selector] : []);

        config.textHints = Array.isArray(config.textHints)
            ? config.textHints
            : (typeof config.textHint === 'string' ? [config.textHint] : []);

        config.waitMs = Number(config.waitMs || 15000);

        return { ...config, path: resolvedPath };
    } catch (error) {
        throw new Error(`Unable to read configuration from ${resolvedPath}: ${error.message}`);
    }
}

function asLocator(selector) {
    if (!selector) {
        return null;
    }

    if (selector.startsWith('xpath=')) {
        return By.xpath(selector.slice(6));
    }

    if (selector.startsWith('//') || selector.startsWith('(')) {
        return By.xpath(selector);
    }

    if (selector.startsWith('css=')) {
        return By.css(selector.slice(4));
    }

    if (/^(#|\.|\[|\w+\[|\w+\.|\w+\s|\w+\>|\w+\+|\w+~)/.test(selector)) {
        return By.css(selector);
    }

    return By.xpath(`//*[self::button or self::a or self::input or self::div][contains(translate(normalize-space(string(.)), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${selector.toLowerCase()}') or contains(translate(normalize-space(@value), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${selector.toLowerCase()}')]`);
}

async function waitForPaymentFlow(driver, config, initialUrl) {
    if (config.waitForSelector) {
        await driver.wait(until.elementLocated(asLocator(config.waitForSelector)), config.waitMs, `The configured waitForSelector did not appear: ${config.waitForSelector}`);
    }

    if (config.waitForUrlContains) {
        await driver.wait(async () => {
            try {
                const currentUrl = await driver.getCurrentUrl();
                return currentUrl.includes(config.waitForUrlContains);
            } catch {
                return false;
            }
        }, config.waitMs, `The configured waitForUrlContains value was not reached: ${config.waitForUrlContains}`);
    }

    await driver.wait(async () => {
        try {
            const currentUrl = await driver.getCurrentUrl();
            const handles = await driver.getAllWindowHandles();
            return handles.length > 1 || currentUrl !== initialUrl;
        } catch {
            return false;
        }
    }, config.waitMs, 'The payment flow did not start after the configured click.');
}

async function findPayButton(driver, config) {
    const selectors = [...(config.selectors || []), ...(config.textHints || []).map((text) => text)];

    for (const item of selectors) {
        const locator = asLocator(item);
        if (!locator) {
            continue;
        }

        try {
            const existing = await driver.findElements(locator);
            if (existing.length > 0) {
                return existing[0];
            }
        } catch {
            // Continue to the next selector if the current one is not valid for this page.
        }
    }

    throw new Error(`No matching payment element was found. Checked selectors: ${selectors.join(', ')}`);
}

(async () => {
    const configPath = process.argv[2] || path.join(__dirname, 'config.json');

    try {
        const config = readConfig(configPath);
        const options = new chrome.Options().excludeSwitches('enable-logging');
        const driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        try {
            await driver.get(config.url);

            const payButton = await driver.wait(async () => {
                try {
                    return await findPayButton(driver, config);
                } catch {
                    return null;
                }
            }, config.waitMs, 'The configured payment button did not appear.');

            await driver.wait(until.elementIsVisible(payButton), config.waitMs);
            await payButton.click();

            await waitForPaymentFlow(driver, config, config.url);
        } finally {
            await driver.quit().catch(() => {});
        }
    } catch (error) {
        console.error(`Payment automation failed: ${error.message}`);
        process.exitCode = 1;
    }
})();