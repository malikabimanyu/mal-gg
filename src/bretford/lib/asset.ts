/**
 * Bretford assets live under /public/bretford so they can't collide with the
 * site's own /public/icons. next/image srcs in the data already carry the
 * prefix; raw <img src> and CSS url() go through here.
 */
export const asset = (path: string) => `/bretford${path}`;
