export function getGalleryIndex({ clientX, left, width, count }) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isInteger(count) || count <= 1) return 0;
  const progress = Math.min(1, Math.max(0, (clientX - left) / width));
  return Math.min(count - 1, Math.floor(progress * count));
}
