# Marketing SEO Launch

The public marketing routes are pre-rendered during the production build. The build generates a sitemap for the public routes, starts the Vite preview server, visits each route with Puppeteer, and writes static HTML under `dist/`.

```bash
npm run build
```

The following public routes are generated: `/`, `/about`, `/services`, `/pricing`, `/contact`, `/signup`, `/privacy`, `/terms`, and `/cookies`.

SEO metadata is configured per page with title, description, keywords, Open Graph, Twitter Card, canonical URL, and JSON-LD. The Home and About pages provide Product/Organization schema, while Pricing provides FAQ schema. The Google Analytics and Search Console integrations are opt-in through environment variables:

```env
VITE_SITE_URL=https://example.com
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_GOOGLE_SITE_VERIFICATION=verification-token
```

The marketing site remains in the existing React/Vite application so Tenant subdomain routing and the Dashboard continue to share one deployment. The central domain serves Marketing, while Tenant subdomains serve the protected Dashboard.

The Backend Trial flow sends both the queued welcome email and the standard Laravel email-verification notification. Existing data is preserved after trial expiration. Configure real SMTP settings and run the queue worker before production launch.

## Remaining production configuration

Replace `example.com` and `info@example.com` with the production domain and support mailbox. Configure DNS wildcard routing, TLS for the wildcard certificate, SMTP, `VITE_GA_MEASUREMENT_ID`, and Google Search Console verification. The existing ESLint command reports many legacy violations in unrelated Dashboard files; production build and PHP syntax checks pass.
