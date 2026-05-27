# Shopee TH Review Exporter

Chrome Manifest V3 extension for Shopee Thailand product pages.

## Features

- Detects Shopee Thailand product detail pages
- Injects a page bridge to intercept `/api/v2/item/get_ratings`
- Bootstraps the first review page, then clicks the review pagination next button
- Collects all intercepted review payloads
- Exports data as `JSON` or `CSV`

## Install

1. Open Chrome and visit `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the folder:
   `C:\Users\仙\Desktop\code\shopee-th-review-exporter`

## Usage

1. Open a Shopee Thailand product detail page
2. Scroll is optional; the extension will move to the ratings section itself
3. Click the extension icon
4. Click `Start`
5. Wait until the status becomes `Completed`
6. Click `Export JSON` or `Export CSV`

## Notes

- The current implementation assumes the default `All` review tab on page 1.
- Exported CSV uses UTF-8 BOM to reduce Thai/Chinese encoding issues.
- If Shopee changes pagination markup or review API parameters, selectors may need to be updated.
