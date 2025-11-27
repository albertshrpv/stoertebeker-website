interface NavigationItem {
  order: number;
  id: number;
  title: string;
  type: 'INTERNAL' | 'EXTERNAL' | 'WRAPPER';
  path: string | null;
  additionalFields: {
    imageUrl: string;
  }
  externalPath: string | null;
  uiRouterKey: string;
  menuAttached: boolean;
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
  audience: any[];
  parent: ParentItem | null;
  related: RelatedItem | null;
  items: any | null;
}

interface ParentItem {
  id: number;
  title: string;
  type: 'INTERNAL' | 'EXTERNAL' | 'WRAPPER';
  path: string | null;
  additionalFields: {
    imageUrl: string;
  }
  externalPath: string | null;
  uiRouterKey: string;
  menuAttached: boolean;
  order: number;
  collapsed: boolean;
  autoSync: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RelatedItem {
  id: number;
  title: string;
  slug: string;
  metatitle: string | null;
  metadescription: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  __contentType: string;
  navigationItemId: number;
}

// Define the type for the final hierarchical structure
interface NavigationNode {
  id: number;
  title: string;
  type: 'INTERNAL' | 'EXTERNAL' | 'WRAPPER';
  path: string | null;
  imageUrl: string;
  children: NavigationNode[];
}


export type { NavigationItem, NavigationNode, ParentItem, RelatedItem };