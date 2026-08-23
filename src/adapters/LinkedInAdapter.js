import { PublisherAdapter } from "./PublisherAdapter.js";

export class LinkedInAdapter extends PublisherAdapter {
  async publish({ content, idempotencyKey }) {
    return {
      platform: this.platform.name,
      adapterKey: this.platform.adapterKey,
      externalMessageId: `mock-linkedin-${idempotencyKey}`,
      content,
      preview: `[Mock LinkedIn] ${content}`,
      publishedAt: new Date()
    };
  }
}
