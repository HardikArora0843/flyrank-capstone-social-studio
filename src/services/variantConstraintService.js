const countHashtags = (content) => {
  return content.match(/(^|\s)#[A-Za-z0-9_]+/g)?.length ?? 0;
};

const applyTone = (content, tone) => {
  const normalizedTone = tone.trim().toLowerCase();

  if (normalizedTone === "concise") {
    return content
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .slice(0, 3)
      .join(" ")
      .trim();
  }

  if (normalizedTone === "professional") {
    return content
      .replace(/\b(lol|omg|btw)\b/gi, "")
      .replace(/\b(u|ur)\b/gi, "you")
      .replace(/!{2,}/g, ".")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (normalizedTone === "casual") {
    return content
      .replace(/\s+/g, " ")
      .trim();
  }

  return content.trim();
};

const validateTone = (content, tone) => {
  const normalizedTone = tone.trim().toLowerCase();
  const errors = [];

  if (normalizedTone === "professional") {
    const casualTerms = /\b(lol|omg|btw|u|ur)\b/i;

    if (casualTerms.test(content) || /!{2,}/.test(content)) {
      errors.push(
        "content does not match professional tone"
      );
    }
  }

  if (normalizedTone === "concise") {
    const sentenceCount = content
      .split(/[.!?]+/)
      .filter((sentence) => sentence.trim().length > 0)
      .length;

    if (sentenceCount > 3) {
      errors.push("content does not match concise tone");
    }
  }

  return errors;
};

export const enforcePlatformConstraints = ({
  content,
  platform
}) => {
  let constrainedContent = applyTone(content, platform.tone);

  if (constrainedContent.length > platform.maxLength) {
    constrainedContent = constrainedContent.slice(
      0,
      platform.maxLength
    ).trim();
  }

  const hashtags = constrainedContent.match(
    /(^|\s)#[A-Za-z0-9_]+/g
  ) ?? [];

  if (hashtags.length > platform.maxHashtags) {
    let hashtagCount = 0;

    constrainedContent = constrainedContent
      .split(/\s+/)
      .filter((token) => {
        if (!token.startsWith("#")) {
          return true;
        }

        hashtagCount += 1;

        return hashtagCount <= platform.maxHashtags;
      })
      .join(" ");
  }

  if (constrainedContent.length > platform.maxLength) {
    constrainedContent = constrainedContent
      .slice(0, platform.maxLength)
      .trim();
  }

  return constrainedContent;
};

export const validatePlatformConstraints = ({
  content,
  platform
}) => {
  const errors = [];

  if (content.length > platform.maxLength) {
    errors.push(
      `content exceeds maximum length of ${platform.maxLength}`
    );
  }

  const hashtagCount = countHashtags(content);

  if (hashtagCount > platform.maxHashtags) {
    errors.push(
      `content exceeds maximum hashtag count of ${platform.maxHashtags}`
    );
  }

  errors.push(...validateTone(content, platform.tone));

  return errors;
};
