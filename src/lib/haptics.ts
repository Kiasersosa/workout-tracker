/** Trigger haptic feedback if supported */
export function haptic(style: "light" | "medium" | "heavy" = "light") {
  if (!("vibrate" in navigator)) return;

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30, 10, 30],
  };

  navigator.vibrate(patterns[style]);
}
