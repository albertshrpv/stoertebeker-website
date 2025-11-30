import ReactDOMServer from "react-dom/server";

import { type Block } from "./interfaces/page";
import AccordionSection from "./components/content/AccordionSection";
import GeneralContactForm from "./components/forms/GeneralContactForm";
import BigImageHeader from "./components/hero/BigImageHeader";
import ImageTextOverlay from "./components/content/ImageTextOverlay";
import FeatureSectionFree from "./components/content/FeatureSectionFree";
import DownloadSection from "./components/content/DownloadSection";
import Quote from "./components/content/Quote";
import TitleText from "./components/content/TitleText";
import TitleTextSplit from "./components/content/TitleTextSplit";
import StatSection3Stats from "./components/content/StatSection3Stats";
import { componentContentPadding, evaluateContentPadding } from "./utils";
import BigButtonSection from "./components/content/BigButtonSection";
import SimpleFeatureSection from "./components/content/SimpleFeatureSection";
import ImageSection from "./components/content/ImageSection";
import BigImageBanner from "./components/content/BigImageBanner";
import BigImageVideo from "./components/content/BigImageVideo";
import FeatureListSection from "./components/content/FeatureListSection";
import MultiFeatureList from "./components/content/MultiFeatureList";
import { createComponentHash } from './utils/hash';
import FeatureListSplit from "./components/content/FeatureListSplit";
import TextImageSplit from "./components/content/TextImageSplit";
import BasicContentSection from "./components/content/BasicContentSection";
import InfoBoxSection from "./components/content/InfoBoxSection";
import FeatureListImage from "./components/content/FeatureListImage";
import NumberedFeatureBlocks from "./components/content/NumberedFeatureBlocks";
import IconFeatureSection from "./components/content/IconFeatureSection";
import FeatureAccordion from "./components/content/FeatureAccordion";
import ContentBanner from "./components/content/ContentBanner";
import StatSection from "./components/content/StatSection";
import CTABanner from "./components/content/CTABanner";
import ContactCard from "./components/content/ContactCard";
import PartnerSection from "./components/content/PartnerSection";
/*

    Map defining available Components in this project by mapping the strapi ComponentName field to the respective FlowBite Component.

*/

enum ComponentType {
  GeneralContactForm,
  BigImageHeader,
  ImageTextOverlay,
  FeatureSectionFree,
  DownloadSection,
  Quote,
  TitleText,
  TitleTextSplit,
  StatSection3Stats,
  BigButtonSection,
  SimpleFeatureSection,
  ImageSection,
  BigImageBanner,
  FeatureListSection,
  MultiFeatureList,
  FeatureListSplit,
  TextImageSplit,
  BasicContentSection,
  InfoBoxSection,
  FeatureListImage,
  NumberedFeatureBlocks,
  IconFeatureSection,
  FeatureAccordion,
  ContentBanner,
  AccordionSection,
  StatSection,
  CTABanner,
  ContactCard,
  BigImageVideo,
  PartnerSection,
}

enum DynamicComponentType {
  ImageCarousel,
  FullScreenCarousel,
  VisibleCarousel,
  OSMMap,
  ComplexAccordion,
  MultiContentBanner,
  AnimatedFeatureSection,
  HeroSection,
  ScrollingBanner,
  AnimatedStatSection,
}


// key: componentName aus Strapi
const ComponentMap: Record<string, ComponentType> = {
  "GeneralContactForm": ComponentType.GeneralContactForm,
  "BigImageHeader": ComponentType.BigImageHeader,
  "ImageTextOverlay": ComponentType.ImageTextOverlay,
  "FeatureSectionFree": ComponentType.FeatureSectionFree,
  "DownloadSection": ComponentType.DownloadSection,
  "Quote": ComponentType.Quote,
  "TitleText": ComponentType.TitleText,
  "TitleTextSplit": ComponentType.TitleTextSplit,
  "StatSection3Stats": ComponentType.StatSection3Stats,
  "BigButtonSection": ComponentType.BigButtonSection,
  "SimpleFeatureSection": ComponentType.SimpleFeatureSection,
  "ImageSection": ComponentType.ImageSection,
  "BigImageBanner": ComponentType.BigImageBanner,
  "FeatureListSection": ComponentType.FeatureListSection,
  "MultiFeatureList": ComponentType.MultiFeatureList,
  "FeatureListSplit": ComponentType.FeatureListSplit,
  "TextImageSplit": ComponentType.TextImageSplit,
  "BasicContentSection": ComponentType.BasicContentSection,
  "InfoBoxSection": ComponentType.InfoBoxSection,
  "FeatureListImage": ComponentType.FeatureListImage,
  "NumberedFeatureBlocks": ComponentType.NumberedFeatureBlocks,
  "IconFeatureSection": ComponentType.IconFeatureSection,
  "FeatureAccordion": ComponentType.FeatureAccordion,
  "ContentBanner": ComponentType.ContentBanner,
  "AccordionSection": ComponentType.AccordionSection,
  "StatSection": ComponentType.StatSection,
  "CTABanner": ComponentType.CTABanner,
  "ContactCard": ComponentType.ContactCard,
  "BigImageVideo": ComponentType.BigImageVideo,
  "PartnerSection": ComponentType.PartnerSection,
};


// key: componentName aus Strapi
const DynamicComponentMap: Record<string, DynamicComponentType> = {
  "ImageCarousel": DynamicComponentType.ImageCarousel,
  "FullScreenCarousel": DynamicComponentType.FullScreenCarousel,
  "VisibleCarousel": DynamicComponentType.VisibleCarousel,
  "OSMMap": DynamicComponentType.OSMMap,
  "ComplexAccordion": DynamicComponentType.ComplexAccordion,
  "MultiContentBanner": DynamicComponentType.MultiContentBanner,
  "AnimatedFeatureSection": DynamicComponentType.AnimatedFeatureSection,
  "HeroSection": DynamicComponentType.HeroSection,
  "ScrollingBanner": DynamicComponentType.ScrollingBanner,
  "AnimatedStatSection": DynamicComponentType.AnimatedStatSection,
};


const isDynamicComponent = (block: Block): Boolean => {
  return block.componentName in DynamicComponentMap;
}


const buildComponent = (block: Block, returnHtml = true) => {
  const componentType: ComponentType | undefined =
    ComponentMap[block.componentName];
  if (componentType == undefined || block.componentSettings?.active === false) {
    return;
  }
  let padding = componentContentPadding;
  if (block.componentSettings) {
    padding = evaluateContentPadding(block.componentSettings.paddingTop, block.componentSettings.paddingBottom);
  }


  let jsxElement: JSX.Element;
  const componentHash = createComponentHash(block.componentName, block.id);

  switch (componentType) {

    case ComponentType.AccordionSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <AccordionSection data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.GeneralContactForm: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <GeneralContactForm key={id} data={data} />
        </div>
      );
      break;
    }
    case ComponentType.BigImageHeader: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <BigImageHeader data={data} key={id} />
        </div>
      );
      break;
    }
    case ComponentType.ImageTextOverlay: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <ImageTextOverlay data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.FeatureSectionFree: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <FeatureSectionFree data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.DownloadSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <DownloadSection data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.Quote: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <Quote data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.TitleText: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <TitleText data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.TitleTextSplit: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <TitleTextSplit data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.StatSection3Stats: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <StatSection3Stats data={data} key={id} />
        </div>
      );
      break;
    }
    case ComponentType.BigButtonSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <BigButtonSection data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.SimpleFeatureSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <SimpleFeatureSection data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.ImageSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <ImageSection data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.BigImageBanner: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <BigImageBanner data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.FeatureListSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <FeatureListSection data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.MultiFeatureList: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <MultiFeatureList data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.FeatureListSplit: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <FeatureListSplit data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.TextImageSplit: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <TextImageSplit data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.BasicContentSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <BasicContentSection data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.InfoBoxSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <InfoBoxSection data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.FeatureListImage: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <FeatureListImage data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.NumberedFeatureBlocks: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <NumberedFeatureBlocks data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.IconFeatureSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <IconFeatureSection data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.FeatureAccordion: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <FeatureAccordion data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.ContentBanner: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <ContentBanner data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.StatSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <StatSection data={data} key={id} />
        </div>
      );
      break;
    }
    case ComponentType.CTABanner: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <CTABanner data={data} key={id} />
        </div>
      );
      break;
    }
    case ComponentType.ContactCard: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <ContactCard data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.BigImageVideo: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <BigImageVideo data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }
    case ComponentType.PartnerSection: {
      const { id } = block;
      const data: any = block;
      jsxElement = (
        <div id={componentHash}>
          <PartnerSection data={data} key={id} padding={padding} />
        </div>
      );
      break;
    }

    default:
      return;
  }


  if (returnHtml) {
    const htmlString = ReactDOMServer.renderToString(jsxElement)
    return htmlString;
  } else {
    return jsxElement;
  }

};

export { buildComponent, isDynamicComponent, ComponentType, DynamicComponentType, ComponentMap, DynamicComponentMap };
