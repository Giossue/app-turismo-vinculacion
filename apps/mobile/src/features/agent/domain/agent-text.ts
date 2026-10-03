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

/** Omit only bullet content already visible in a card; retain useful facts. */
export function getAgentVisibleText(
  text: string,
  cards: readonly Readonly<{ name: string; category?: string | null }>[],
): string {
  if (cards.length === 0) return text;
  const knownPlaces = cards.map((card) => ({
    name: normalizePlaceName(card.name),
    category: card.category ? normalizePlaceName(card.category) : null,
  }));
  const visible = text
    .split("\n")
    .filter((line) => {
      const bullet = /^\s*(?:[•*\-]|\d+[.)])\s+/.exec(line);
      if (!bullet) return true;
      const item = normalizePlaceName(
        plainAgentText(line.slice(bullet[0].length)),
      );
      return !knownPlaces.some(({ name, category }) => {
        if (!item.startsWith(name)) return false;
        const detail = item.slice(name.length);
        if (/^[\s.!?]*$/.test(detail)) return true;
        if (!category) return false;
        const separator = /^\s*(?:[,:;–—\-]\s*|\(\s*)/.exec(detail);
        if (!separator) return false;
        return (
          detail
            .slice(separator[0].length)
            .replace(/\)\s*$/, "")
            .replace(/[.!?]+$/, "")
            .trim() === category.replace(/[.!?]+$/, "")
        );
      });
    })
    .join("\n")
    .replace(/\n(?:[ \t]*\n){2,}/g, "\n\n")
    .trim();
  return visible || "Aquí tienes algunas opciones.";
}

function normalizePlaceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleUpperCase("es");
}
