export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { itemCode, ebayCategory } = req.body;
  if (!itemCode) return res.status(400).json({ error: "itemCode required" });

  const email = process.env.SEKAIPOCKET_EMAIL;
  const password = process.env.SEKAIPOCKET_PASSWORD;
  if (!email || !password) return res.status(500).json({ error: "SEKAIPOCKET_EMAIL/PASSWORD not set" });

  const BASE = "https://sekai.busoken.com";

  try {
    // Step 1: ログインページからCSRFトークン取得
    const loginPageRes = await fetch(`${BASE}/users/login`, { redirect: "follow" });
    const loginPageHtml = await loginPageRes.text();
    const loginCookies = loginPageRes.headers.get("set-cookie") || "";
    const csrfMatch = loginPageHtml.match(/name="_csrfToken"[^>]*value="([^"]+)"/);
    if (!csrfMatch) return res.status(500).json({ error: "Cannot get login CSRF token" });
    const loginCsrf = csrfMatch[1];

    // Step 2: ログイン
    const loginRes = await fetch(`${BASE}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": loginCookies,
      },
      body: new URLSearchParams({
        _csrfToken: loginCsrf,
        email,
        password,
      }),
      redirect: "manual",
    });

    // セッションクッキーを収集
    const rawCookies = [loginCookies, loginRes.headers.get("set-cookie") || ""].join("; ");
    const sessionCookie = extractCookies(rawCookies);

    // Step 3: フォームページからCSRFトークン取得
    const formPageRes = await fetch(`${BASE}/fetch-items/add-request-yahoo-shopping`, {
      headers: { "Cookie": sessionCookie },
    });
    const formHtml = await formPageRes.text();
    const formCookies = formPageRes.headers.get("set-cookie") || "";
    const formCsrfMatch = formHtml.match(/name="_csrfToken"[^>]*value="([^"]+)"/);
    if (!formCsrfMatch) return res.status(500).json({ error: "Cannot get form CSRF token — login may have failed" });
    const formCsrf = formCsrfMatch[1];

    const finalCookie = extractCookies([sessionCookie, formCookies].join("; "));

    // Step 4: 商品コードを投入
    const submitRes = await fetch(`${BASE}/fetch-items/add-request-yahoo-shopping`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": finalCookie,
        "Referer": `${BASE}/fetch-items/add-request-yahoo-shopping`,
      },
      body: new URLSearchParams({
        _csrfToken: formCsrf,
        is_ebay_target: "on",
        category_id_ebay: ebayCategory || "",
        itemCode,
      }),
      redirect: "manual",
    });

    const location = submitRes.headers.get("location") || "";
    if (submitRes.status === 302 || submitRes.status === 200) {
      return res.status(200).json({ success: true, itemCode, redirectTo: location });
    }

    const responseText = await submitRes.text();
    const errorMatch = responseText.match(/class="error[^"]*"[^>]*>([^<]+)</);
    return res.status(400).json({
      error: "Submit failed",
      status: submitRes.status,
      detail: errorMatch?.[1] || responseText.slice(0, 300),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function extractCookies(raw) {
  const map = {};
  raw.split(/,(?=[^ ])|;/).forEach(part => {
    const [k, ...v] = part.trim().split("=");
    const key = k?.trim();
    if (key && !["path", "domain", "expires", "samesite", "httponly", "secure", "max-age"].includes(key.toLowerCase())) {
      map[key] = v.join("=").trim();
    }
  });
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join("; ");
}
