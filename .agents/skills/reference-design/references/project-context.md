# Dylan development application

Before design changes, read `docs/DESIGN_REQUIREMENTS.md` completely and reconcile
the applicable earlier feedback. References cannot override those exclusions.

This checkout's `dev` lineage contains the public site in `dist/`, Go booking application in `booking/`, and private admin interface in `booking/web/`. Read README, `docs/BOOKING_CONTRACT.md`, `docs/BOOKING_VALIDATION.md`, `docs/EMAIL_NOTIFICATIONS.md` and `docs/DEV_DEPLOYMENT.md` for affected behavior. The site's real services/photos/contact details come from existing approved source and the client record, not from inspiration sites. Do not invent testimonials, credentials, prices or bookings.

For new/substantial visual designs use the installed Stitch design skills after choosing actual Inspo references. Preserve the existing stack, booking contracts, authentication, owner privacy and customer/admin listener isolation. If a teammate lacks Stitch, explain that gap and use an explicitly chosen reference-to-code fallback; don't silently claim Stitch output. Lawn-care search coverage can be weak: inspect relevant photographic service/landscape references and use public web references when needed.

Start with `.\website.ps1 dev -NoOpen` or `./website dev --no-open`; read the printed addresses because ports are installation-specific. Public port preference is 4177; admin is 4178. Check using `.\website.ps1 check -NoOpen` or `./website check --no-open`. Use isolated synthetic data, no real customer emails or appointments. Reticle remains opt-in. Dev pushes check but do not deploy; server dev updates require the separate manual workflow. Main is a different static product surface, not an automatic destination for merging the entire booking branch. See its own README before any promotion.
