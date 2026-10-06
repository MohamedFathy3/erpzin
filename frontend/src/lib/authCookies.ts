import Cookies from 'js-cookie';
import type { CookieAttributes } from 'js-cookie';

/**
 * Keep bearer tokens scoped to the current host. Tenant workspaces on the same
 * parent domain are separate trust boundaries, so the auth cookie must not be
 * widened to the parent domain merely to survive a workspace redirect.
 */
export const setAuthCookie = (name: string, value: string, options: CookieAttributes = {}): void => {
  Cookies.set(name, value, {
    path: '/',
    sameSite: 'lax',
    ...options,
  });
};

export const removeAuthCookie = (name: string): void => {
  Cookies.remove(name, { path: '/' });
};
