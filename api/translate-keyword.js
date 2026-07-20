// Yahoo日本語商品名 → eBay英語検索キーワード変換
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, jan } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `この日本語の商品名をeBayで検索するための英語キーワードに変換してください。
ブランド名・シリーズ名・キャラクター名・商品タイプを含む、5〜8語の検索キーワードを返してください。
余計な説明は不要です。キーワードだけを1行で返してください。

商品名: ${name}${jan ? `\nJANコード: ${jan}` : ""}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const keyword = data.content?.[0]?.text?.trim() || "";

    return res.status(200).json({ keyword });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
