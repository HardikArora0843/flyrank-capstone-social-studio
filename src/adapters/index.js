import { XAdapter } from "./XAdapter.js";
import { LinkedInAdapter } from "./LinkedInAdapter.js";
import { TelegramAdapter } from "./TelegramAdapter.js";

export const createPublisherAdapter = (platform) => {
  switch (platform.adapterKey) {
    case "x":
      return new XAdapter(platform);

    case "linkedin":
      return new LinkedInAdapter(platform);

    case "telegram":
      return new TelegramAdapter(platform);

    default:
      throw new Error(
        `Unsupported publisher adapter: ${platform.adapterKey}`
      );
  }
};
