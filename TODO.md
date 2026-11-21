# TODO

## Fusion ERP primary domain migration

- [x] Set `fusionerp.systems` as the application's primary public origin and the default root used for new tenant workspaces.
- [x] Keep `professionalacademyedu.com` in the supported tenant roots so existing workspace hosts remain resolvable by the application.
- [x] Update frontend login routing, SEO canonical/share metadata, sitemap, robots, and accepted dev hosts for the new primary domain.
- [x] Support both roots in backend tenant resolution, CORS, and Sanctum without changing the API hostname or `APP_URL`.
- [x] Document the production environment, DNS, Cloudflare, TLS, reverse-proxy, and session/cookie considerations without claiming the code change makes the domain live.
- [ ] Provision/confirm production environment and DNS/Cloudflare/TLS/reverse-proxy routing, then resolve the current HTTP 403 before treating the new domain as ready.
