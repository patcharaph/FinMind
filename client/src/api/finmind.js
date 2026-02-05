const jsonHeaders = {
  "Content-Type": "application/json"
};

export const saveSnapshot = async (snapshot) => {
  const response = await fetch("/api/user/data", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(snapshot)
  });
  if (!response.ok) {
    throw new Error("Failed to save snapshot");
  }
  return response.json();
};

export const fetchLatestSnapshot = async () => {
  const response = await fetch("/api/user/data");
  if (!response.ok) {
    throw new Error("Failed to load snapshot");
  }
  return response.json();
};

export const requestInsight = async (snapshot) => {
  const response = await fetch("/api/advisor/insight", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ snapshot })
  });
  if (!response.ok) {
    throw new Error("Failed to get insight");
  }
  return response.json();
};
