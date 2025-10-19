// Ritorna true per iPad/iOS e in generale per device touch (anche con UA desktop).
export default function isMobileLike() {
  const touchPoints = navigator.maxTouchPoints || 0;

  // Media queries affidabili su iPad/iOS
  const coarse   = matchMedia("(pointer: coarse)").matches;
  const noHover  = matchMedia("(hover: none)").matches;

  // iPad recente con UA desktop ⇒ platform "MacIntel" ma touchPoints > 1
  const iPadOS   = /iPad|iPhone|iPod/.test(navigator.platform) ||
                   (navigator.platform === "MacIntel" && touchPoints > 1);

  return coarse || noHover || iPadOS || touchPoints > 1;
}
