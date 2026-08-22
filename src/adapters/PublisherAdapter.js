export class PublisherAdapter {
  constructor(platform) {
    this.platform = platform;
  }

  async publish() {
    throw new Error("publish() must be implemented by a platform adapter");
  }
}
