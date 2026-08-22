import { PublisherAdapter } from "./PublisherAdapter.js";

export class TelegramAdapter extends PublisherAdapter {
  async publish({ content, idempotencyKey }) {
    if (process.env.NODE_ENV === "test") {
      return {
        platform: this.platform.name,
        adapterKey: this.platform.adapterKey,
        externalMessageId: `mock-telegram-${idempotencyKey}`,
        content,
        publishedAt: new Date()
      };
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    if (!chatId) {
      throw new Error("TELEGRAM_CHAT_ID is not configured");
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: content
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.description || `Telegram API request failed with status ${response.status}`
      );
    }

    return {
      platform: this.platform.name,
      adapterKey: this.platform.adapterKey,
      externalMessageId: String(data.result.message_id),
      content: data.result.text,
      publishedAt: new Date()
    };
  }
}
