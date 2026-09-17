# Fonts for generated share cards

`src/app/recaps/[id]/opengraph-image.tsx` draws the link-preview card with
Satori, which needs real font binaries handed to it — it can't use the
`next/font` faces the rest of the app renders with, and it only accepts
TTF/OTF/WOFF (not WOFF2).

These are the same two faces the site uses, so a shared card matches the page
it links to:

| File | Face | Used for |
|---|---|---|
| `BarlowCondensed-Bold.ttf` | Barlow Condensed 700 | the card's wordmark and headline |
| `Archivo-SemiBold.ttf` | Archivo 600 | the summary line and chips |

Both are from [Google Fonts](https://fonts.google.com) and licensed under the
[SIL Open Font License 1.1](https://openfontlicense.org), which permits
redistribution. They live in `public/` because the Dockerfile copies that
directory into the runtime image, so the card generator can read them from
disk without a network call.
