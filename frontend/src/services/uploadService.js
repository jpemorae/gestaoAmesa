import { getToken } from "./api";

const API_URL = import.meta.env.VITE_API_URL;

export async function uploadEvidence(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/uploads/evidence`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData
  });

  const data = await response.json();

  if (!response.ok) throw new Error(data?.error || "Erro no upload.");
  return data;
}
