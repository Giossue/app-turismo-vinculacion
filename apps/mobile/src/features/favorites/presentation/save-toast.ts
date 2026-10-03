import { showTourismToast } from "@/core/ui/tourism-toast";

/** Confirms a save toggle; `wasSaved` is the state before the change. */
export function showSaveToast(wasSaved: boolean) {
  if (wasSaved) showTourismToast("Quitado de guardados", "bookmark");
  else showTourismToast("Guardado", "check");
}
