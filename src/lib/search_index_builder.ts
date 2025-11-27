import fs from 'fs';
import path from 'path';
import { convert } from 'html-to-text';

import type { Block, Page } from "./interfaces/page";
import type SearchIndexItem from "./interfaces/searchIndexItem";
import { ComponentMap, ComponentType, DynamicComponentMap, DynamicComponentType } from './components_builder';
import { createComponentHash } from './utils/hash';

const convertOptions = {
    selectors: [
        { selector: 'h1', options: { uppercase: false } },
        { selector: 'h2', options: { uppercase: false } },
        { selector: 'h3', options: { uppercase: false } },
    ]
};

/**
 * SearchIndex is a class that is used to build a search index from a list of pages.
 * The search index is a list of SearchIndexItems that are used to search for content on the website.
 * The search index is saved to a file called search-index.json in the public folder.
 * The search index is built from the pages and their blocks.
 * The search index is built from the following components:
 * 
 * 
 *  - SimpleFeatureSection
 *  - BasicContentSection
 *  - InfoBoxSection
 *  - FeatureListImage
 *  - DownloadSection
 *  - FeatureListSplit
 *  - AccordionSection
 *  - ComplexAccordion (not supported)
 *  - FeatureAccordion
 *  - NumberedFeatureBlocks
 *  - IconFeatureSection 
 *  - ContentBanner
 *  - MultiContentBanner (not supported)
 *  - TitleText
 *  - TitleTextSplit
 *  - Quote
 *  - FeatureListSection
 *  - MultiFeatureList
 *  - ContactSection
 *  - ImageTextOverlay
 *  - GeneralContactForm
 *  - FeatureSectionFree
 *  - StatSection3Stats
 * 
 * 
 */
class SearchIndex {
    private static searchIndex: SearchIndexItem[] = [];

    /**
     * 
     * @param page is a Page object that is used to build the search index.
     * The search index is built from the page and its blocks.
     */
    public static addFromPage(page: Page, origin: string, slug: string) {
        try {
            const pageSearchIndexItem: SearchIndexItem = {
                origin,
                title: page.title,
                content: page.metadescription ? [page.metadescription] : [],
                slug: slug,
            };
            this.searchIndex.push(pageSearchIndexItem);

            for (const block of page.blocks) {
                const blockItem = this.buildSearchIndexFromBlock(block, slug, origin);
                if (blockItem !== undefined) {
                    this.searchIndex.push(blockItem);
                }
            }

            console.log(`\nAdded ${page.title} to search index.`);
            console.log(`Search index now has ${this.searchIndex.length} items.`);
        }
        catch (error) {
            console.log(`Error adding ${page.title} to search index: ${error}`);
            console.log("Page will not be added to search index.");
        }
    }


    public static getIndex(): SearchIndexItem[] {
        return this.searchIndex;
    }

    /**
     * saveToFile is a static method that saves the search index to a file called search-index.json in the public folder.
     */
    public static saveToFile() {
        const SEARCH_INDEX_PATH = path.join(process.cwd(), 'public', 'search-index.json');
        fs.writeFileSync(SEARCH_INDEX_PATH, JSON.stringify(this.searchIndex, null, 2));
    }

    /**
        buildSearchIndexFromBlock is a private static method that takes a block and a slug and returns a SearchIndexItem.
        This method is used to build a search index item from a block. It uses the ComponentMap to determine the type of the block.
        Only Components that are supported by the search index are processed. 
    */
    private static buildSearchIndexFromBlock = (block: Block, slug: string, origin: string) => {
        let searchIndexItem: SearchIndexItem | undefined = undefined;

        const dynamicComponentType: DynamicComponentType | undefined = DynamicComponentMap[block.componentName];
        const componentType: ComponentType | undefined = ComponentMap[block.componentName];

        // If the component is not supported by the search index, return
        if (dynamicComponentType == undefined && componentType == undefined) {
            return;
        }

        // Generate hash for this component
        const componentHash = createComponentHash(block.componentName, block.id);
        // Append hash to slug
        const hashSlug = `${slug}#${componentHash}`;

        if (dynamicComponentType != undefined) {

            switch (dynamicComponentType) {
                case DynamicComponentType.MultiContentBanner: {
                    let content: string[] = [];

                    let thumbnail;

                    for (const b of block.blocks) {
                        if (b.image?.url && thumbnail == undefined) {
                            thumbnail = b.image.url;
                        }
                        if (b.title) {
                            content.push(b.title);
                        }
                        let plainText = convert(b.text, convertOptions);
                        content.push(plainText);
                    }


                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        content,
                        slug: hashSlug,
                        thumbnail,
                    };
                    break;
                }
                case DynamicComponentType.ComplexAccordion: {
                    let content: string[] = [];

                    for (const b of block.blocks) {
                        content.push(b.label);
                        for (const c of b.blocks) {
                            content.push(c.title);
                            let plainText = convert(c.text, convertOptions);
                            content.push(plainText);
                        }
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                default:
                    return;
            }

        } else if (componentType != undefined) {
            switch (componentType) {
                case ComponentType.BasicContentSection: {
                    let content: string[] = [];

                    let thumbnail;
                    if (block?.image?.url) {
                        thumbnail = block.image.url;
                    }

                    let plainTitle = convert(block.title, convertOptions);
                    let plainContent = convert(block.content, convertOptions);

                    content.push(plainContent);

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                        thumbnail,
                    };
                    break;
                }
                case ComponentType.ContentBanner: {
                    let content: string[] = [];

                    let thumbnail;
                    if (block?.image?.url) {
                        thumbnail = block.image.url;
                    }

                    let plainTitle = convert(block.title, convertOptions);
                    let plainText = convert(block.text, convertOptions);

                    content.push(plainText);

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                        thumbnail,
                    };
                    break;
                }
                case ComponentType.AccordionSection: {
                    let content: string[] = [];

                    let plainTitle = convert(block.title, convertOptions);

                    for (const b of block.blocks) {
                        content.push(b.title);
                        const plainText = convert(b.text, convertOptions);
                        content.push(plainText);
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.FeatureAccordion: {
                    let content: string[] = [];


                    for (const b of block.blocks) {
                        content.push(b.title);
                        for (const c of b.blocks) {
                            content.push(c.title);
                            let plainContent = convert(c.content, convertOptions);
                            content.push(plainContent);
                        }
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.GeneralContactForm: {
                    let content: string[] = [];

                    if (block.title !== null) {
                        content.push(block.title);
                    }
                    if (block.subtitle !== null) {
                        content.push(block.subtitle);
                    }
                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: "Kontaktformular",
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.ImageTextOverlay: {
                    let content: string[] = [];

                    let thumbnail;
                    if (block?.image?.url) {
                        thumbnail = block.image.url;
                    }

                    const plainContent = convert(block.text, convertOptions);
                    content.push(plainContent);

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        content,
                        slug: hashSlug,
                        thumbnail,
                    };
                    break;
                }
                case ComponentType.FeatureSectionFree: {
                    let content: string[] = [];
                    let plainTitle = convert(block.title, convertOptions);

                    for (const b of block.blocks) {
                        content.push(b.title);
                        let plainText = convert(b.content, convertOptions);
                        content.push(plainText);
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.SimpleFeatureSection: {
                    let content: string[] = [];
                    let plainTitle = convert(block.title, convertOptions);

                    for (const b of block.blocks) {
                        content.push(b.label);
                        if (b.text) {
                            content.push(b.text);
                        }
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.NumberedFeatureBlocks: {
                    let content: string[] = [];

                    for (const b of block.blocks) {
                        content.push(b.label);
                        let plainContent = convert(b.content, convertOptions);
                        content.push(plainContent);
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.IconFeatureSection: {
                    let content: string[] = [];

                    for (const b of block.blocks) {
                        if (b.title) {
                            content.push(b.title);
                        }
                        let plainText = convert(b.text, convertOptions);
                        content.push(plainText);
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.InfoBoxSection: {
                    let content: string[] = [];
                    let plainTitle = convert(block.title, convertOptions);

                    for (const b of block.blocks) {
                        content.push(b.infoTitle);
                        content.push(b.title);
                        content.push(b.text);
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.FeatureListImage: {
                    let content: string[] = [];
                    let plainTitle = convert(block.title, convertOptions);

                    for (const b of block.blocks) {
                        if (b.title) {
                            content.push(b.title);
                        }
                        let plainText = convert(b.text, convertOptions);
                        content.push(plainText);
                    }

                    let thumbnail;
                    if (block?.image?.url) {
                        thumbnail = block.image.url;
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                        thumbnail,
                    };
                    break;
                }
                case ComponentType.DownloadSection: {
                    let content: string[] = [];
                    let plainTitle = convert(block.title, convertOptions);
                    let plainText = convert(block.text, convertOptions);

                    content.push(plainText);

                    for (const b of block.image) {
                        const caption = b.caption;
                        if (caption) {
                            content.push(caption);
                        }
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.Quote: {
                    let content: string[] = [];
                    let title = "Zitat";
                    let text = block.text;
                    let name = block.name;

                    content.push(text);
                    content.push(name);

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: title,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.TitleText: {
                    let content: string[] = [];

                    let plainTitle = convert(block.title, convertOptions);
                    let plainText = convert(block.text, convertOptions);

                    content.push(plainText);

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.TitleTextSplit: {
                    let content: string[] = [];

                    let plainTitle = convert(block.title, convertOptions);
                    let plaintextLeft = convert(block.textLeft, convertOptions);
                    let plaintextRight = convert(block.textRight, convertOptions);

                    content.push(plaintextLeft);
                    content.push(plaintextRight);

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.StatSection3Stats: {
                    let content: string[] = [];

                    for (const b of block.blocks) {
                        content.push(b.title);
                        let plainContent = convert(b.content, convertOptions);
                        content.push(plainContent);
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: "",
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.FeatureListSection: {
                    let content: string[] = [];
                    let plainTitle = convert(block.title, convertOptions);
                    content.push(plainTitle);
                    let plainText = convert(block.text, convertOptions);
                    content.push(plainText);

                    for (const b of block.blocks) {
                        let plainContent = convert(b.content, convertOptions);
                        content.push(plainContent);
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: plainTitle,
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.MultiFeatureList: {
                    let content: string[] = [];

                    for (const b of block.blocks) {
                        content.push(b.title);
                        for (const c of b.blocks) {
                            let plainContent = convert(c.content, convertOptions);
                            content.push(plainContent);
                        }
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: "",
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                case ComponentType.FeatureListSplit: {
                    let content: string[] = [];

                    let plainTitle = convert(block.title, convertOptions);
                    content.push(plainTitle);

                    let plainText = convert(block.text, convertOptions);
                    content.push(plainText);

                    for (const b of block.blocks) {
                        content.push(b.title);
                        let plainContent = convert(b.content, convertOptions);
                        content.push(plainContent);
                    }

                    searchIndexItem = {
                        origin,
                        componentName: block.componentName,
                        title: "",
                        content,
                        slug: hashSlug,
                    };
                    break;
                }
                default:
                    return;
            }
        }



        return searchIndexItem;
    };
}

export default SearchIndex;

