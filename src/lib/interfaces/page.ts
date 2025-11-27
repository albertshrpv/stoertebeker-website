import type { CTA } from "./cta";

enum PageType { "page", "contact", "tickets" }

interface Block {
  documentId: string;
  componentName: string;
  componentSettings?: ComponentSettings;
  [key: string]: any;
}

interface ComponentSettings {
  active: boolean;
  paddingTop: string;
  paddingBottom: string;
  anchorId?: string;
  classes?: string;
}

interface Page {
  documentId: string;
  id: number;
  title: string;
  slug: string;
  image?: any;
  topPage: any;
  blocks: Block[];
  pageTitle?: string;
  pageText?: string;
  cta?: CTA;
  metadescription: string;
  metatitle: string;
  localizations: {
    locale: string;
    slug: string;
  }[];
}

interface PageResponse {
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  },
  data: Page[];
}

export type { Block, Page, PageResponse, ComponentSettings };
export { PageType };
