# pdfexel.ru landing

A/B test landings for Direct:

- `/` — variant **B** (pain / clean table), default
- `/a` — variant **A** (tool dropzone)

Metrika goal `cta_click` (counter `114193275`) fires only after successful PDF→Excel convert (file processed + xlsx download), not on CTA/button click. Goal `popup_shown` is unused in code (avoids double Direct conversions).

Push to `master` or `main` deploys to `206.223.250.251` → `/var/www/pdfexel.ru`.
