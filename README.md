# pay_online

Generic Selenium automation for clicking a purchase/pay button on a website using a JSON configuration file.

This project opens a configured URL and clicks the payment trigger using selectors and text hints, then waits for the payment flow to begin.

## Requirements

- Node.js 18 or newer
- Google Chrome or Chromium installed
- ChromeDriver installed and available on PATH, or the Chrome/Chromium version compatible with your local driver
- A working internet connection for the target site

## Install dependencies

If the project does not already have `node_modules` installed, run:

```bash
npm init -y
npm install selenium-webdriver
```

If you already have the dependency installed, skip this step.

## Configure the target site

Create a local `config.json` file in the project root. A sample is provided in `config.json.example`.

Example:

```json
{
  "url": "https://sitename.com/purchase/",
  "selectors": [
    "button.et_pb_paypal_button_0",
    "button:contains('BUY NOW')",
    "a:contains('BUY NOW')",
    "button",
    "a"
  ],
  "textHints": [
    "BUY NOW",
    "Buy Now",
    "Pay Now",
    "Purchase",
    "Checkout"
  ],
  "waitForSelector": "button.et_pb_paypal_button_0",
  "waitForUrlContains": "paypal",
  "waitMs": 15000
}
```

Notes:
- `url` is the page to open.
- `selectors` are attempted in order until a matching element is found.
- `textHints` provides a generic fallback when the exact CSS selector is not known.
- `waitForSelector` and `waitForUrlContains` are optional flow checks after the click.

The repo is set up so `config.json` remains local and is ignored by Git. Use `config.json.example` as the template you copy into `config.json`.

## Run the script

From the project root:

```bash
node pay_online.js
```

You can also provide a different config file path:

```bash
node pay_online.js C:\path\to\your-config.json
```

On Windows, the shortcut wrapper can be used as well:

```cmd
pay_online.cmd
```

## Browser setup

### Chrome/Chromium

Install Chrome or Chromium normally on your system.

### ChromeDriver

ChromeDriver must match the installed Chrome/Chromium version.

Common setup approaches:

- Install Chrome/Chromium and ChromeDriver from the official packages for your OS
- Add the ChromeDriver executable to your PATH
- Verify with:

```bash
chromedriver --version
```

or:

```bash
where chromedriver
```

## Behavior

The automation does the following:

1. Reads `config.json`
2. Opens the configured web page
3. Finds the likely payment button using selectors/text hints
4. Waits for the button to become visible
5. Clicks it
6. Waits for the click to trigger the payment flow or redirect
7. Closes the browser

## Troubleshooting

- If ChromeDriver is missing, Selenium will fail to start the browser.
- If the page has changed, update the selectors and/or text hints in `config.json`.
- If the button is hidden or uses dynamic rendering, adjust the timing with `waitMs`.
- If the payment flow opens a new tab or redirect, confirm `waitForUrlContains` matches the actual destination.

## Notes

This project is intentionally generic. The target site and trigger element are driven by `config.json`, not hardcoded in the script.
