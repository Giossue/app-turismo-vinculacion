import { showTourismToast } from "@/core/ui/tourism-toast";
import { messages } from "@/core/i18n/language";

/** Confirms a save toggle; `wasSaved` is the state before the change. */
export function showSaveToast(wasSaved: boolean) {
  const text = messages().community.saved;
  if (wasSaved) showTourismToast(text.removedToast, "bookmark");
  else showTourismToast(text.savedToast, "check");
}
