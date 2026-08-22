import { createPublisherAdapter } from "../adapters/index.js";

export const publishContentService = async ({
  platform,
  content,
  idempotencyKey
}) => {
  const adapter = createPublisherAdapter(platform);

  return adapter.publish({
    content,
    idempotencyKey
  });
};
