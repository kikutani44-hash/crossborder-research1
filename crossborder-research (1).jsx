import { useState } from "react";

const PROXY = "https://api.anthropic.com/v1/messages";

const initialSettings = {
  ebayAppId: "",
  rakutenAppId: "",
  amazonAccessKey: "",
  amazonSecretKey: "",
  amazonAssociateTag: "",
  yahooAppId: "",
};

const platformColors = {
  ebay: "#E53238",
  shopee: "#EE4D2D",
  rakuten: "#BF0000",
  amazon: "#FF9900",
  yahoo: "#720E9E",
};

function Tag({ label, color }) {
  return (
    <span style={{
      background: color + "22",
      color: color,
      border: `1px solid ${color}44`,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.5,
    }}>{label}</span>
  );
}

function SettingsPanel({ settings, setSettings, onClose }) {
  const [local, setLocal] = useState(settings);
  const fields = [
    { key: "ebayAppId", label: "eBay App ID", phase: 1 },
    { key: "rakutenAppId", label: "楽天 Application ID", phase: 1 },
    { key: "amazonAccessKey", label: "Amazon Access Key", phase: 2 },
    { key: "amazonSecretKey", label: "Amazon Secret Key", phase: 2 },
    { key: "amazonAssociateTag", label: "Amazon Associate Tag", phase: 2 },
    { key: "yahooAppId", label: "Yahoo Developer App ID", phase: 3 },
  ];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#0f1923", border: "1px solid #1e3a4a",
        borderRadius: 16, padding: 32, width: 480, maxHeight: "80vh",
        overflowY: "auto", boxShadow: "0 24px 64px #000a"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ color: "#7dd3fc", margin: 0, fontSize: 18, fontFamily: "'DM Mono', monospace" }}>
            ⚙ API キー設定
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        {[1, 2, 3].map(phase => (
          <div key={phase} style={{ marginBottom: 20 }}>
            <div style={{ color: "#475569", fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 10, letterSpacing: 1 }}>
              PHASE {phase} {phase === 1 ? "— 必須" : phase === 2 ? "— Amazon追加時" : "— ヤフオク追加時"}
            </div>
            {fields.filter(f => f.phase === phase).map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 4 }}>{f.label}</label>
                <input
                  type="password"
                  value={local[f.key]}
                  onChange={e => setLocal({ ...local, [f.key]: e.target.value })}
                  placeholder="未設定"
                  style={{
                    width: "100%", background: "#0a1520", border: "1px solid #1e3a4a",
                    borderRadius: 8, padding: "8px 12px", color: "#e2e8f0",
                    fontSize: 13, fontFamily: "'DM Mono', monospace", boxSizing: "border-box"
                  }}
                />
              </div>
            ))}
          </div>
        ))}
        <button
          onClick={() => { setSettings(local); onClose(); }}
          style={{
            width: "100%", padding: "12px", background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
            border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
            cursor: "pointer", fontSize: 14, marginTop: 8
          }}
        >保存する</button>
      </div>
    </div>
  );
}

function ResultRow({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: "#0a1520",
      border: "1px solid #1e3a4a",
      borderRadius: 12,
      marginBottom: 10,
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr auto auto auto",
          gap: 12,
          padding: "14px 16px",
          cursor: "pointer",
          alignItems: "center",
        }}
      >
        <span style={{ color: "#334155", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {item.title}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag label={item.sourcePlatform} color={platformColors[item.sourcePlatform] || "#64748b"} />
            {item.jan && <Tag label={`JAN: ${item.jan}`} color="#10b981" />}
            {item.asin && <Tag label={`ASIN: ${item.asin}`} color={platformColors.amazon} />}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#7dd3fc", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            ¥{item.buyPrice?.toLocaleString() || "—"}
          </div>
          <div style={{ color: "#475569", fontSize: 11 }}>仕入れ価格</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#f59e0b", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            ${item.sellPrice || "—"}
          </div>
          <div style={{ color: "#475569", fontSize: 11 }}>販売価格</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            color: item.profitRate > 30 ? "#10b981" : item.profitRate > 15 ? "#f59e0b" : "#ef4444",
            fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700
          }}>
            {item.profitRate ? `${item.profitRate}%` : "—"}
          </div>
          <div style={{ color: "#475569", fontSize: 11 }}>利益率</div>
        </div>
      </div>
      {expanded && (
        <div style={{
          borderTop: "1px solid #1e3a4a",
          padding: "14px 16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
        }}>
          {item.rakutenUrl && (
            <a href={item.rakutenUrl} target="_blank" rel="noreferrer" style={{
              background: "#BF000011", border: "1px solid #BF000033",
              borderRadius: 8, padding: "10px 14px", color: "#ef4444",
              textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 8
            }}>
              🛒 楽天で見る
            </a>
          )}
          {item.amazonUrl && (
            <a href={item.amazonUrl} target="_blank" rel="noreferrer" style={{
              background: "#FF990011", border: "1px solid #FF990033",
              borderRadius: 8, padding: "10px 14px", color: "#f59e0b",
              textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 8
            }}>
              📦 Amazonで見る
            </a>
          )}
          {item.yahooUrl && (
            <a href={item.yahooUrl} target="_blank" rel="noreferrer" style={{
              background: "#720E9E11", border: "1px solid #720E9E33",
              borderRadius: 8, padding: "10px 14px", color: "#a855f7",
              textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 8
            }}>
              🔨 ヤフオクで見る
            </a>
          )}
          {item.ebayUrl && (
            <a href={item.ebayUrl} target="_blank" rel="noreferrer" style={{
              background: "#E5323811", border: "1px solid #E5323833",
              borderRadius: 8, padding: "10px 14px", color: "#E53238",
              textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 8
            }}>
              🌐 eBayで見る
            </a>
          )}
          {item.notes && (
            <div style={{
              gridColumn: "1/-1",
              background: "#0f1923", borderRadius: 8, padding: "10px 14px",
              color: "#94a3b8", fontSize: 12, lineHeight: 1.6
            }}>
              {item.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const DEMO_RESULTS = [
  {
    title: "Anker PowerCore 10000 モバイルバッテリー",
    sourcePlatform: "ebay",
    jan: "4712052153493",
    asin: "B07JYVP1NW",
    buyPrice: 2800,
    sellPrice: 38.99,
    profitRate: 42,
    rakutenUrl: "https://www.rakuten.co.jp/",
    amazonUrl: "https://www.amazon.co.jp/",
    notes: "eBayで月間50件以上のSold実績。日本からの発送が多数。",
  },
  {
    title: "象印 電気ケトル CK-AX08",
    sourcePlatform: "shopee",
    jan: "4974305212484",
    buyPrice: 4500,
    sellPrice: 62.00,
    profitRate: 35,
    rakutenUrl: "https://www.rakuten.co.jp/",
    yahooUrl: "https://auctions.yahoo.co.jp/",
    notes: "Shopeeシンガポール・マレーシアで人気。Made in Japan訴求強。",
  },
  {
    title: "コクヨ キャンパスノート A5 5冊セット",
    sourcePlatform: "ebay",
    jan: "4901480270933",
    buyPrice: 850,
    sellPrice: 18.50,
    profitRate: 28,
    rakutenUrl: "https://www.rakuten.co.jp/",
    amazonUrl: "https://www.amazon.co.jp/",
    notes: "文具カテゴリ安定需要。まとめ販売で利益率改善余地あり。",
  },
];

export default function App() {
  const [settings, setSettings] = useState(initialSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [platform, setPlatform] = useState("ebay");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [log, setLog] = useState("");
  const [demoMode, setDemoMode] = useState(false);

  const hasRequiredKeys = settings.ebayAppId && settings.rakutenAppId;

  async function runSearch() {
    if (!keyword.trim()) return;
    if (!hasRequiredKeys && !demoMode) {
      setLog("⚠ APIキーが未設定です。デモモードで実行するか、設定画面でAPIキーを入力してください。");
      return;
    }
    setLoading(true);
    setResults([]);
    setLog("🔍 検索中...");

    if (demoMode) {
      await new Promise(r => setTimeout(r, 1500));
      setResults(DEMO_RESULTS);
      setLog(`✅ デモデータ表示中 — "${keyword}" の実際の検索にはAPIキーが必要です`);
      setLoading(false);
      return;
    }

    try {
      const prompt = `
あなたは越境EC転売リサーチアシスタントです。
以下の条件で商品をリサーチし、結果をJSON配列で返してください。

検索プラットフォーム: ${platform}
検索キーワード: ${keyword}
カテゴリ: ${category}
利用可能API: eBay(AppID: ${settings.ebayAppId}), 楽天(AppID: ${settings.rakutenAppId})

以下のJSON形式で5件の商品リストを返してください（マークダウン不要、JSONのみ）：
[
  {
    "title": "商品名",
    "sourcePlatform": "ebay or shopee",
    "jan": "JANコードがあれば",
    "asin": "ASINコードがあれば",
    "buyPrice": 仕入れ価格(円・数値),
    "sellPrice": 販売価格(ドル・数値),
    "profitRate": 利益率(0-100の数値),
    "rakutenUrl": "楽天商品URL",
    "amazonUrl": "Amazon商品URL（任意）",
    "yahooUrl": "ヤフオクURL（任意）",
    "ebayUrl": "eBay商品URL",
    "notes": "リサーチメモ（売れ筋理由など）"
  }
]

注意: 実際にAPIを呼び出す想定で、リアルな日本商品の越境EC売れ筋データを返してください。
`;

      const res = await fetch(PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResults(parsed);
      setLog(`✅ ${parsed.length}件取得完了`);
    } catch (e) {
      setLog(`❌ エラー: ${e.message}`);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070d14",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', 'Hiragino Kaku Gothic ProN', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1e3a4a",
        padding: "0 32px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0a1520",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32,
            background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>🌐</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>CrossBorder Research</div>
            <div style={{ color: "#475569", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
              PHASE 1 — eBay + 楽天
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            fontSize: 11, color: hasRequiredKeys ? "#10b981" : "#f59e0b",
            fontFamily: "'DM Mono', monospace",
            background: hasRequiredKeys ? "#10b98122" : "#f59e0b22",
            border: `1px solid ${hasRequiredKeys ? "#10b98144" : "#f59e0b44"}`,
            borderRadius: 6, padding: "4px 10px",
          }}>
            {hasRequiredKeys ? "● API接続済" : "○ APIキー未設定"}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              background: "#1e3a4a", border: "none", borderRadius: 8,
              color: "#94a3b8", padding: "8px 16px", cursor: "pointer", fontSize: 13,
            }}
          >⚙ 設定</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Search Panel */}
        <div style={{
          background: "#0a1520",
          border: "1px solid #1e3a4a",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                KEYWORD
              </label>
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runSearch()}
                placeholder="例：アニメフィギュア、日本酒、電動自転車..."
                style={{
                  width: "100%", background: "#070d14", border: "1px solid #1e3a4a",
                  borderRadius: 8, padding: "10px 14px", color: "#e2e8f0",
                  fontSize: 14, boxSizing: "border-box",
                  fontFamily: "'DM Sans', 'Hiragino Kaku Gothic ProN', sans-serif",
                }}
              />
            </div>
            <div>
              <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                PLATFORM
              </label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                style={{
                  width: "100%", background: "#070d14", border: "1px solid #1e3a4a",
                  borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 14,
                }}
              >
                <option value="ebay">eBay</option>
                <option value="shopee">Shopee</option>
                <option value="both">両方</option>
              </select>
            </div>
            <div>
              <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                CATEGORY
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  width: "100%", background: "#070d14", border: "1px solid #1e3a4a",
                  borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 14,
                }}
              >
                <option value="all">全カテゴリ</option>
                <option value="electronics">家電・電子機器</option>
                <option value="toys">おもちゃ・フィギュア</option>
                <option value="fashion">ファッション</option>
                <option value="beauty">美容・健康</option>
                <option value="food">食品・飲料</option>
                <option value="sports">スポーツ・アウトドア</option>
                <option value="stationery">文具・オフィス</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={runSearch}
              disabled={loading || !keyword.trim()}
              style={{
                padding: "12px 28px",
                background: loading ? "#1e3a4a" : "linear-gradient(135deg, #0ea5e9, #6366f1)",
                border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
                transition: "opacity 0.2s",
              }}
            >
              {loading ? "🔄 検索中..." : "🔍 リサーチ開始"}
            </button>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#64748b", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={demoMode}
                onChange={e => setDemoMode(e.target.checked)}
                style={{ accentColor: "#0ea5e9" }}
              />
              デモモード（APIキーなしで試す）
            </label>
          </div>
        </div>

        {/* Phase Roadmap */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24
        }}>
          {[
            { phase: 1, label: "eBay + 楽天", status: "active", icon: "🟢" },
            { phase: 2, label: "Amazon ASIN", status: "coming", icon: "⏳" },
            { phase: 3, label: "ヤフオク", status: "coming", icon: "⏳" },
            { phase: 4, label: "Shopee", status: "coming", icon: "⏳" },
          ].map(p => (
            <div key={p.phase} style={{
              background: p.status === "active" ? "#0a1f2e" : "#0a1520",
              border: `1px solid ${p.status === "active" ? "#0ea5e944" : "#1e3a4a"}`,
              borderRadius: 10, padding: "10px 14px",
              opacity: p.status === "active" ? 1 : 0.5,
            }}>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                PHASE {p.phase}
              </div>
              <div style={{ color: p.status === "active" ? "#7dd3fc" : "#64748b", fontSize: 13, fontWeight: 600 }}>
                {p.icon} {p.label}
              </div>
            </div>
          ))}
        </div>

        {/* Log */}
        {log && (
          <div style={{
            background: "#0a1520", border: "1px solid #1e3a4a",
            borderRadius: 8, padding: "10px 16px", marginBottom: 16,
            color: "#94a3b8", fontSize: 12, fontFamily: "'DM Mono', monospace",
          }}>
            {log}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 14,
            }}>
              <div style={{ color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                {results.length} ITEMS FOUND
              </div>
              <div style={{ color: "#475569", fontSize: 11 }}>
                クリックで詳細・仕入れリンクを表示
              </div>
            </div>
            {results.map((item, i) => (
              <ResultRow key={i} item={item} index={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {results.length === 0 && !loading && (
          <div style={{
            textAlign: "center", padding: "60px 0",
            color: "#334155",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
            <div style={{ fontSize: 14 }}>キーワードを入力してリサーチを開始してください</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              まずはデモモードでお試しいただけます
            </div>
          </div>
        )}
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
