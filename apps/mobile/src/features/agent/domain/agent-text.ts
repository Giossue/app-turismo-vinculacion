export type AgentTextPart = Readonly<{ value: string; strong: boolean }>;

/** The agent may use Markdown emphasis; keep other text and line breaks intact. */
export function parseAgentText(text: string): readonly AgentTextPart[] {
  const parts: AgentTextPart[] = [];
  let offset = 0;

  while (offset < text.length) {
    const opening = text.indexOf("**", offset);
    if (opening < 0) {
      parts.push({ value: text.slice(offset), strong: false });
      break;
    }

    const closing = text.indexOf("**", opening + 2);
    if (closing <= opening + 2) {
      parts.push({ value: text.slice(offset), strong: false });
      break;
    }

    if (opening > offset) {
      parts.push({ value: text.slice(offset, opening), strong: false });
    }
    parts.push({ value: text.slice(opening + 2, closing), strong: true });
    offset = closing + 2;
  }

  return parts;
}

export function plainAgentText(text: string): string {
  return parseAgentText(text)
    .map((part) => part.value)
    .join("");
}

/** A result's cards already contain the places named in its bullet list. */
export function getAgentVisibleText(
  text: string,
  cards: readonly Readonly<{ name: string }>[],
): string {
  if (cards.length === 0) return text;
  const names = cards.map((card) => normalizePlaceName(card.name));
  const visible = text
    .split("\n")
    .filter((line) => {
      const bullet = /^\s*(?:[•*\-]|\d+[.)])\s+/.exec(line);
      if (!bullet) return true;
      const item = normalizePlaceName(
        plainAgentText(line.slice(bullet[0].length)),
      );
      return !names.some(
        (name) =>
          item === name ||
          (item.startsWith(name) &&
            /^[\s.,:;–—(\-]/.test(item.slice(name.length))),
      );
    })
    .join("\n")
    .replace(/\n(?:[ \t]*\n){2,}/g, "\n\n")
    .trim();
  return visible || "Toca una tarjeta para ver su ficha.";
}

function normalizePlaceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleUpperCase("es");
}
