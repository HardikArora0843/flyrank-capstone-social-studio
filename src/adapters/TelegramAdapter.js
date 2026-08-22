import { PublisherAdapter } from "./PublisherAdapter.js";

export class TelegramAdapter extends PublisherAdapter {
  async publish({ content, idempotencyKey }) {
    return {
      platform: this.platform.name,
      adapterKey: this.platform.adapterKey,
      externalMessageId: `mock-telegram-${idempotencyKey}`,
      content,
      publishedAt: new Date()
    };
  }
}
