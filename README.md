# pdfexel.ru landing

A/B test landings for Direct:

- `/` — variant **B** (pain / clean table), default
- `/a` — variant **A** (tool dropzone)

CTA opens “in development” modal and fires Metrika goal `cta_click` only (counter `114193275`). Goal `popup_shown` stays in Metrika for later use but is not sent from CTA (avoids double Direct conversions).

Push to `master` or `main` deploys to `206.223.250.251` → `/var/www/pdfexel.ru`.
