# Bazaar typography

Self-hosted subsets of the font families requested by the original Bazaar HTML:
Big Shoulders Display (600–800), IBM Plex Sans (400–700), IBM Plex Mono (500–600).
Latin, Latin Extended and Vietnamese subsets were retained where provided.

Source: Google Fonts CSS API, `fonts.googleapis.com`, with binaries served by
`fonts.gstatic.com`. The font files are unchanged. Corresponding SIL OFL license
texts were retrieved from the official `google/fonts` repository, directories
`ofl/bigshouldersdisplay`, `ofl/ibmplexsans`, `ofl/ibmplexmono`.

`fonts.css` is loaded once in `frontend/index.html`. Font families are applied
only under `.storefront`; the storefront does not request remote fonts at runtime.
