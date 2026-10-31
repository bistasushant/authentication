export async function uploadImage(
  file: File,
  baseUrl: string = "",
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(baseUrl + "/api/upload-image", {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) {
    const message = json.error ?? json.message ?? "Upload failed";
    console.error("uploadImage error:", message);
    throw new Error(message);
  }
  if (!json.url) {
    console.error("uploadImage: response missing url", json);
    throw new Error("Upload failed: no URL returned");
  }
  return json as { url: string };
}
