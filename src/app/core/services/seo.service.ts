import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  keywords?: string | string[];
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

const SITE_NAME = 'vonchess';
const DEFAULT_IMAGE = 'https://vonchess.net/assets/pcap/pcap-logo.webp';
const BASE_URL = 'https://vonchess.net';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private meta = inject(Meta);
  private titleService = inject(Title);
  private document = inject(DOCUMENT);

  update(config: SeoConfig): void {
    const hasSiteName = config.title.toLowerCase().includes(SITE_NAME);
    const fullTitle = hasSiteName ? config.title : `${config.title} - ${SITE_NAME}`;
    const image = config.image || DEFAULT_IMAGE;
    const url = config.url || BASE_URL;
    const type = config.type || 'website';

    this.titleService.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.updateCanonicalLink(url);

    if (config.keywords) {
      const keywordsStr = Array.isArray(config.keywords)
        ? config.keywords.join(', ')
        : config.keywords;
      this.meta.updateTag({ name: 'keywords', content: keywordsStr });
    }

    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    if (config.jsonLd) {
      this.setJsonLd(config.jsonLd);
    }
  }

  setJsonLd(data: Record<string, any> | Array<Record<string, any>> | null): void {
    const scriptId = 'schema-jsonld';
    let script = this.document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!data) {
      if (script) {
        script.remove();
      }
      return;
    }

    if (!script) {
      script = this.document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
  }

  private updateCanonicalLink(url: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
