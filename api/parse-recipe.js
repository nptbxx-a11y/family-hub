export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL required" });

  const isInstagram = url.includes("instagram.com");

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

  if (isInstagram) {
    return handleInstagram(html, res);
  }

  // --- Standard recipe site: look for JSON-LD Recipe schema ---
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

// --- Instagram caption extraction ---
function handleInstagram(html, res) {
  // Try og:description meta tag first (contains the caption)
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);

  let caption = ogDesc ? decodeHtmlEntities(ogDesc[1]) : null;

  // Also try the page title or other meta tags as fallback
  if (!caption) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) caption = decodeHtmlEntities(titleMatch[1]);
  }

  if (!caption) {
    return res.status(200).json({
      ingredients: null,
      message: "instagram_no_caption"
    });
  }

  // Parse the caption into likely ingredient lines
  const ingredients = extractIngredientsFromCaption(caption);

  if (!ingredients) {
    return res.status(200).json({
      ingredients: null,
      caption: caption.slice(0, 300),
      message: "instagram_no_ingredients"
    });
  }

  return res.status(200).json({ ingredients, source: "instagram_caption" });
}

function extractIngredientsFromCaption(caption) {
  // Split into lines, cleaning up common separators
  const lines = caption
    .replace(/\\n/g, "\n")
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length < 120);

  const QUANTITY_WORDS = /\b(\d+[\d\/\.\,]*\s*)?(tbsp|tsp|tablespoon|teaspoon|cup|cups|g|kg|ml|l|oz|lb|pinch|handful|clove|cloves|slice|slices|bunch|can|tin|pack|packet|large|medium|small|fresh|dried|chopped|diced|minced|grated)\b/i;
  const STARTS_WITH_NUMBER = /^[\d¼½¾⅓⅔⅛]+/;
  const STARTS_WITH_BULLET = /^[-•·*▪️◦➡️✅🔸🧂🫒🥩🥦🧅🧄🫙🧈🍋🍅🫑🥕🫛🌿🌶️🍄]/u;
  const HASHTAG_MENTION = /^[@#]/;

  const ingredientLines = lines.filter((l) => {
    if (HASHTAG_MENTION.test(l)) return false;
    if (l.toLowerCase().includes("follow") || l.toLowerCase().includes("comment") || l.toLowerCase().includes("subscribe")) return false;
    return QUANTITY_WORDS.test(l) || STARTS_WITH_NUMBER.test(l) || STARTS_WITH_BULLET.test(l);
  });

  if (ingredientLines.length === 0) return null;

  // Clean bullet characters from the start
  return ingredientLines
    .map((l) => l.replace(/^[-•·*▪️◦➡️✅🔸]\s*/u, "").trim())
    .join("\n");
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
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
