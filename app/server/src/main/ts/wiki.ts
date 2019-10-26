export const ENGLISH_PREFIX = "https://en.wikipedia.org/wiki/";

const PAGE_NAME_PREFIX_BLACKLIST = new Set([
  "Category",
  "File",
  "Help",
  "Portal",
  "Special",
  "Talk",
  "Template",
  "Template_talk",
  "Wikipedia",
  "Wikipedia_talk",
]);

export function isValidWikiPage(link: string): boolean {
  if (!link.startsWith(ENGLISH_PREFIX)) {
    return false;
  } else {
    const pageName = inferPageName(link);
    const pageNamePrefix = pageName.split(":", 1)[0];
    return !PAGE_NAME_PREFIX_BLACKLIST.has(pageNamePrefix);
  }
}

export function inferPageName(url: string): string {
  return url.replace(ENGLISH_PREFIX, "");
}
