export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";

function backendPath(path: string) {
  return `${BACKEND_URL}${path}`;
}

export function backendUrl(path: string) {
  return backendPath(path);
}

async function readErrorMessage(response: Response) {
  const rawBody = await response.text();

  if (!rawBody) {
    return `Request failed with status ${response.status}`;
  }

  try {
    const parsed = JSON.parse(rawBody) as { error?: string };
    return parsed.error ?? rawBody;
  } catch {
    return rawBody;
  }
}

export async function postJson<TResponse>(path: string, payload: unknown) {
  const response = await fetch(backendPath(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as TResponse;
}

export async function putJson<TResponse>(path: string, payload: unknown) {
  const response = await fetch(backendPath(path), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as TResponse;
}

export async function getJson<TResponse>(path: string) {
  const response = await fetch(backendPath(path), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as TResponse;
}

export async function deleteJson<TResponse>(path: string) {
  const response = await fetch(backendPath(path), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as TResponse;
}

export async function postFormData<TResponse>(path: string, data: FormData) {
  const response = await fetch(backendPath(path), {
    method: "POST",
    body: data,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as TResponse;
}

export async function downloadBlobFromFormData(
  path: string,
  data: FormData,
  fallbackFileName: string
) {
  const response = await fetch(backendPath(path), {
    method: "POST",
    body: data,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const blob = await response.blob();
  const outputName =
    response.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1] ??
    fallbackFileName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = outputName;
  link.click();

  URL.revokeObjectURL(url);

  return outputName;
}
