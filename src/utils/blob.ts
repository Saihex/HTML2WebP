export function image_to_blob(bytes: Uint8Array, mime_type?: string): string {
  const base64Img = arrayBufferToBase64(bytes);
  return `data:${mime_type ?? "image/png"};base64,${base64Img}`;
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
