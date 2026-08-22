import { PublisherAdapter } from "./PublisherAdapter.js";

export class XAdapter extends PublisherAdapter {
  async publish({ content, idempotencyKey }) {
    return {
      platform: this.platform.name,
      adapterKey: this.platform.adapterKey,
      externalMessageId: `mock-x-${idempotencyKey}`,
      content,
      publishedAt: new Date()
    };
  }
}
