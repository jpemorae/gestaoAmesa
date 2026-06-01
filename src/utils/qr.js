export function getQrActionUrl(code, location = window.location) {
  const baseUrl = location.origin + location.pathname;
  return `${baseUrl}?etiqueta=${encodeURIComponent(code)}`;
}
