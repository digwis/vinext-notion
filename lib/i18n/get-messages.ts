import { messages, type MessagesShape } from "./messages.ts";
import { type Locale } from "./config.ts";

export function getMessages(locale: Locale): MessagesShape {
  return messages[locale];
}
