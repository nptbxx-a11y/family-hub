export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL required" });

  let html;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    html = await response.text();
  } catch {
    return res.status(500).json({ error: "Could not fetch that URL" });
  }

  // Find all JSON-LD blocks
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const recipe = findRecipe(data);
      if (recipe?.recipeIngredient?.length) {
        const ingredients = recipe.recipeIngredient
          .map((i) => (typeof i === "string" ? i : i.text || i.name || ""))
          .filter(Boolean)
          .join("\n");
        return res.status(200).json({ ingredients });
      }
    } catch {
      // try next block
    }
  }

  return res.status(200).json({ ingredients: null });
}

function findRecipe(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const r = findRecipe(item);
      if (r) return r;
    }
  }
  if (typeof data === "object") {
    const types = Array.isArray(data["@type"]) ? data["@type"] : [data["@type"]];
    if (types.includes("Recipe")) return data;
    if (data["@graph"]) return findRecipe(data["@graph"]);
  }
  return null;
}
