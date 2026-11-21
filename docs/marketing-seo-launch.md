# Marketing SEO Launch

The public marketing routes are pre-rendered during the production build. The build generates a sitemap for the public routes, starts the Vite preview server, visits each route with Puppeteer, and writes static HTML under `dist/`.

```bash
npm run build
```

The marketing site and all new SEO metadata use `https://fusionerp.systems` as the canonical public origin. Configure `VITE_SITE_URL=https://fusionerp.systems` in the production build environment. Older domains, including `professionalacademyedu.com`, may continue serving existing workspaces and compatible site traffic, but new canonical links and generated sitemap entries point to the new primary domain.

The public routes generated include `/`, `/about`, `/services`, `/pricing`, `/contact`, `/signup`, `/privacy`, `/terms`, `/cookies`, `/blog`, and the four article routes under `/blog/`.

SEO metadata is configured per page with title, description, keywords, Open Graph, Twitter Card, canonical URL, and JSON-LD. The Home and About pages provide Product/Organization schema, while Pricing provides FAQ schema. The Google Analytics and Search Console integrations are opt-in through environment variables:

```env
VITE_SITE_URL=https://fusionerp.systems
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_GOOGLE_SITE_VERIFICATION=verification-token
```

The marketing site remains in the existing React/Vite application so tenant subdomain routing and the Dashboard continue to share one deployment. The primary domain serves Marketing and central login; tenant subdomains under `fusionerp.systems` serve workspaces, while existing tenants on `professionalacademyedu.com` remain supported.

The backend Trial flow sends both the queued welcome email and the standard Laravel email-verification notification. `FRONTEND_URL` controls frontend links in backend notifications; set it to `https://fusionerp.systems`. Existing data is preserved after trial expiration. Configure real SMTP settings and run the queue worker before production launch.

## Remaining production configuration

Set the actual production frontend build variable `VITE_SITE_URL` and backend `FRONTEND_URL` to `https://fusionerp.systems`. Keep the existing API host and `APP_URL` unless the API is separately migrated. Verify apex and wildcard DNS, Cloudflare host/zone rules, TLS coverage for both roots and their tenant subdomains, reverse-proxy/origin routing, SMTP, analytics, and Search Console verification. The current connectivity probe resolved the new host through Cloudflare but returned HTTP 403, so code changes alone do not establish that the domain is ready to serve the application. The existing ESLint command reports legacy violations in unrelated Dashboard files; production build and PHP syntax checks are separate validation items.
