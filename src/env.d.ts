/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly STRAPI_URL: string;
  readonly PLACES_ACCESS_TOKEN: string;
  readonly PLACES_URL: string;
}
