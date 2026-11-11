const API_BASE_URL = "http://localhost:8000/api";

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "We couldn’t reach the recipe checker. Please check your connection and try again.",
    );
  }

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        "We got an unexpected response. Please try again in a moment.",
      );
    }
  }

  if (!response.ok) {
    const detail = data?.detail;

    if (response.status >= 500) {
      throw new Error(
        "The recipe checker is having trouble right now. Please try again shortly.",
      );
    }

    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg ?? "").filter(Boolean).join("; ")
          : "We couldn’t complete that step. Check your recipe details and try again.";

    throw new Error(message);
  }

  return data;
}

export function parseRecipe(recipe) {
  return request("/recipes/parse", {
    method: "POST",
    body: JSON.stringify(recipe),
  });
}

export function diagnoseRecipe(diagnosis) {
  return request("/diagnoses", {
    method: "POST",
    body: JSON.stringify(diagnosis),
  });
}

export function answerFollowup(diagnosisId, answer) {
  return request(`/diagnoses/${encodeURIComponent(diagnosisId)}/answer`, {
    method: "POST",
    body: JSON.stringify(answer),
  });
}

export function previewCounterfactual(preview) {
  return request("/diagnoses/counterfactual", {
    method: "POST",
    body: JSON.stringify(preview),
  });
}

export function saveRepair(repair) {
  return request("/repairs", {
    method: "POST",
    body: JSON.stringify(repair),
  });
}

export function sendFeedback(feedback) {
  return request("/feedback", {
    method: "POST",
    body: JSON.stringify(feedback),
  });
}