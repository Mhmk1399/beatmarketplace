# Mood and instrument artwork

Artwork pack: `taxonomy-artwork-v1`, created on 23 November 2026 with the built-in `image_gen` tool.

This pack covers all 16 moods and 21 instruments in the database snapshot, including the custom `instrument1` record. Each classification has its own square thumbnail and a separately generated panoramic banner: 74 images in total.

## Art direction

The images use the existing graphite, violet and lavender identity, with tactile surfaces, translucent accents and soft lighting. Mood artwork communicates the existing description through atmosphere and distinct visual subjects. Instrument artwork shows the corresponding instrument or sound source. The custom instrument has a general studio illustration because its description is empty.

Thumbnails reserve a darker lower area for the page's text overlay. Banners reserve space on the left for headings and keep the main subject on the right. Titles, descriptions, gradients, glass borders and buttons remain HTML/CSS components using the existing design system.

The complete, exact prompt set and per-record file mapping are in [taxonomy-artwork-v1.prompts.json](./taxonomy-artwork-v1.prompts.json). Generation used the built-in tool; no external image API or CLI fallback was used.

## Published files

The 74 images are stored under `beatmarket/` in the configured bucket. The Mood and Instrument records point to their thumbnail and banner objects. The local upload copies were removed on 24 November 2026 after verifying all objects against their recorded checksums.

Thumbnails are 600 × 600 and banners are 1920 × 720. All files are static WebP. Sizes range from 17,508 to 159,520 bytes, below the existing 800,000-byte policy. The combined size is 4,994,986 bytes.

## Storage and database references

Publishing uses the existing `storeCategoryImage` pipeline. Objects are written under `beatmarket/` with the application's partitioned UUID keys. The original filenames identify the classification and image role. No object keys or existing artwork are overwritten.

Each record receives full `thumbnail` and `banner` storage references, including MIME type, dimensions, byte size and SHA-256 checksum. Both uploads are checked before the record is committed. Updates compare the original document version and timestamp to avoid replacing a concurrent administrator edit. Names, slugs, descriptions, status, instrument families, colors, ordering and beat relationships retain their existing values.

Pages continue to use the versioned `/api/taxonomy/<id>/images/<slot>?kind=<kind>&v=<key>` route. This retains the existing storage delivery behavior and access checks for inactive classifications.

## Operational records

The original database snapshot, upload state and storage verification reports are in the ignored `.data/taxonomy-artwork/` directory.

## Verification

All 37 records were checked after publication. Both storage references are present on every record, and the preserved metadata matches the original snapshot. All 74 versioned image URLs returned WebP content with the expected dimensions and a SHA-256 hash matching the prepared file.

Live browser checks covered the mood and instrument directories and Dreamy, Piano, Santur and Setar detail pages at 390px and 1440px viewport widths: 12 page/viewport combinations. Images loaded, cover cropping was applied, no horizontal overflow was detected, and no browser JavaScript errors were reported. Contact sheets of every thumbnail and banner were also inspected.
