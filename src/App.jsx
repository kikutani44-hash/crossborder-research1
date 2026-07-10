import { useState } from "react";

const RAKUTEN_APP_ID = import.meta.env.VITE_RAKUTEN_APP_ID || "";
const YAHOO_CLIENT_ID = import.meta.env.VITE_YAHOO_CLIENT_ID || "";
const EBAY_APP_ID = import.meta.env.VITE_EBAY_APP_ID || "";

const EBAY_FEE_RATE = 0.129;
const EBAY_FEE_FIXED = 0.3;
const SHIPPING_USD = 15;
const USD_JPY = 150;

const platformColors = {
  ebay: "#E53238",
  shopee: "#EE4D2D",
  rakuten: "#BF0000",
  amazon: "#FF9900",
  yahoo: "#720E9E",
};

function calcProfit(buyPriceJpy, sellPriceUsd) {
  const sellJpy = sellPriceUsd * USD_JPY;
  const ebayFee = sellPriceUsd * EBAY_FEE_RATE + EBAY_FEE_FIXED;
  const shippingJpy = SHIPPING_USD * USD_JPY;
  const profitJpy = sellJpy - buyPriceJpy - shippingJpy - ebayFee * USD_JPY;
  const profitRate = Math.round((profitJpy / sellJpy) * 100);
  return { profitJpy: Math.round(profitJpy), profitRate };
}

function estimateSellPrice(buyPriceJpy) {
  const baseUsd = buyPriceJpy / USD_JPY;
  return Math.round((baseUsd * 2.2 + SHIPPING_USD) * 100) / 100;
}

function Tag({ label, color }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
    }}>{label}</span>
  );
}

function ResultRow({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  const { profitJpy, profitRate } = calcProfit(item.buyPrice, item.sellPrice);
  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12,
      marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px #0000000a",
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{
        display: "grid", gridTemplateColumns: "32px 60px 1fr auto auto auto",
        gap: 12, padding: "14px 16px", cursor: "pointer", alignItems: "center",
      }}>
        <span style={{ color: "#cbd5e1", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 6, background: "#fff" }} />
        ) : (
          <div style={{ width: 52, height: 52, background: "#1e3a4a", borderRadius: 6 }} />
        )}
        <div>
          <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {item.title}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag label="楽天" color={platformColors.rakuten} />
            {item.jan && <Tag label={`JAN: ${item.jan}`} color="#10b981" />}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#0ea5e9", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            ¥{item.buyPrice?.toLocaleString() || "—"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>仕入れ価格</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#f59e0b", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            ${item.sellPrice || "—"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>想定販売価格</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            color: profitRate > 30 ? "#10b981" : profitRate > 10 ? "#f59e0b" : "#ef4444",
            fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700,
          }}>
            {profitRate}%
          </div>
          <div style={{ color: "#475569", fontSize: 11 }}>利益率</div>
        </div>
      </div>
      {expanded && (
        <div style={{
          borderTop: "1px solid #f1f5f9", padding: "14px 16px",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
          background: "#f8fafc",
        }}>
          <div style={{
            gridColumn: "1/-1", background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0",
            padding: "10px 14px", color: "#475569", fontSize: 12, lineHeight: 1.8,
          }}>
            <span style={{ color: "#0ea5e9", fontWeight: 600 }}>利益試算：</span>
            　仕入れ ¥{item.buyPrice?.toLocaleString()}　＋　国際送料 ¥{(SHIPPING_USD * USD_JPY).toLocaleString()}
            　→　eBay販売 ${item.sellPrice}（¥{(item.sellPrice * USD_JPY).toLocaleString()}）
            　→　<span style={{ color: profitJpy > 0 ? "#10b981" : "#ef4444", fontWeight: 700 }}>
              利益 ¥{profitJpy.toLocaleString()}（{profitRate}%）
            </span>
            <br />
            <span style={{ color: "#475569", fontSize: 11 }}>
              ※ eBay手数料{(EBAY_FEE_RATE * 100)}%＋${EBAY_FEE_FIXED}、送料${SHIPPING_USD}、為替{USD_JPY}円/ドルで計算
            </span>
          </div>
          {item.rakutenUrl && (
            <a href={item.rakutenUrl} target="_blank" rel="noreferrer" style={{
              background: "#BF000011", border: "1px solid #BF000033",
              borderRadius: 8, padding: "10px 14px", color: "#ef4444",
              textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 8,
            }}>
              🛒 楽天で見る（仕入れ）
            </a>
          )}
          <div
            onClick={() => navigator.clipboard?.writeText(item.rakutenUrl || "")}
            style={{
              background: "#0ea5e911", border: "1px solid #0ea5e933",
              borderRadius: 8, padding: "10px 14px", color: "#7dd3fc",
              fontSize: 12, display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
            }}
          >
            📋 URLをコピー（世界ポケットに登録）
          </div>
        </div>
      )}
    </div>
  );
}

function EbayResultRow({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  const soldPrice = item.soldPrice;
  const estimatedBuyJpy = Math.round((soldPrice / 2.2 - SHIPPING_USD) * USD_JPY);
  const { profitJpy, profitRate } = calcProfit(Math.max(estimatedBuyJpy, 500), soldPrice);

  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12,
      marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px #0000000a",
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{
        display: "grid", gridTemplateColumns: "32px 60px 1fr auto auto auto",
        gap: 12, padding: "14px 16px", cursor: "pointer", alignItems: "center",
      }}>
        <span style={{ color: "#cbd5e1", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 6, background: "#f8fafc" }} />
        ) : (
          <div style={{ width: 52, height: 52, background: "#fee2e2", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛍</div>
        )}
        <div>
          <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {item.title}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag label="eBay売れ筋" color={platformColors.ebay} />
            {item.soldCount && <Tag label={`${item.soldCount}件販売`} color="#6366f1" />}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#E53238", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            ${soldPrice}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>eBay販売価格</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#0ea5e9", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            ¥{Math.max(estimatedBuyJpy, 0).toLocaleString()}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>推定仕入れ上限</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            color: profitRate > 30 ? "#10b981" : profitRate > 10 ? "#f59e0b" : "#ef4444",
            fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700,
          }}>
            {profitRate}%
          </div>
          <div style={{ color: "#475569", fontSize: 11 }}>想定利益率</div>
        </div>
      </div>
      {expanded && (
        <div style={{
          borderTop: "1px solid #f1f5f9", padding: "14px 16px",
          background: "#f8fafc", display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{
            background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0",
            padding: "10px 14px", color: "#475569", fontSize: 12, lineHeight: 1.8,
          }}>
            <span style={{ color: "#E53238", fontWeight: 600 }}>eBay売れ筋分析：</span>
            　eBay販売価格 ${soldPrice}（¥{(soldPrice * USD_JPY).toLocaleString()}）
            　→　送料・手数料除くと仕入れ上限 ¥{Math.max(estimatedBuyJpy, 0).toLocaleString()} 以内なら採算合います
          </div>
          {item.ebayUrl && (
            <a href={item.ebayUrl} target="_blank" rel="noreferrer" style={{
              background: "#E5323811", border: "1px solid #E5323833",
              borderRadius: 8, padding: "10px 14px", color: "#E53238",
              textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 8,
            }}>
              🛒 eBayで見る
            </a>
          )}
        </div>
      )}
    </div>
  );
}

const DEMO_RESULTS = [
  {
    title: "Anker PowerCore 10000 モバイルバッテリー",
    buyPrice: 2800, sellPrice: 38.99,
    imageUrl: null, jan: "4712052153493",
    rakutenUrl: "https://www.rakuten.co.jp/",
  },
  {
    title: "象印 電気ケトル CK-AX08",
    buyPrice: 4500, sellPrice: 62.00,
    imageUrl: null, jan: "4974305212484",
    rakutenUrl: "https://www.rakuten.co.jp/",
  },
  {
    title: "コクヨ キャンパスノート A5 5冊セット",
    buyPrice: 850, sellPrice: 18.50,
    imageUrl: null, jan: "4901480270933",
    rakutenUrl: "https://www.rakuten.co.jp/",
  },
];

const DEMO_EBAY_RESULTS = [
  {
    title: "Japanese Anime Figure Naruto Uzumaki PVC Model",
    soldPrice: 45.99, soldCount: 38,
    imageUrl: null,
    ebayUrl: "https://www.ebay.com/",
  },
  {
    title: "Japanese Thermos Vacuum Flask 500ml",
    soldPrice: 34.50, soldCount: 22,
    imageUrl: null,
    ebayUrl: "https://www.ebay.com/",
  },
  {
    title: "Kikkoman Soy Sauce Japanese Import 500ml",
    soldPrice: 18.99, soldCount: 156,
    imageUrl: null,
    ebayUrl: "https://www.ebay.com/",
  },
  {
    title: "Japanese Ceramic Tea Cup Set Traditional",
    soldPrice: 28.00, soldCount: 45,
    imageUrl: null,
    ebayUrl: "https://www.ebay.com/",
  },
];

export default function App() {
  const [activePhase, setActivePhase] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [ebayKeyword, setEbayKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [ebayResults, setEbayResults] = useState([]);
  const [log, setLog] = useState("");
  const [ebayLog, setEbayLog] = useState("");
  const [yahooAuctionKeyword, setYahooAuctionKeyword] = useState("");
  const [yahooAuctionResults, setYahooAuctionResults] = useState([]);
  const [yahooAuctionLog, setYahooAuctionLog] = useState("");

  const hasRakutenKey = !!YAHOO_CLIENT_ID;
  const hasEbayKey = !!EBAY_APP_ID;

  async function runRakutenSearch() {
    if (!keyword.trim()) return;
    setLoading(true);
    setResults([]);
    setLog("🔍 Yahoo!ショッピングを検索中...");

    if (!hasRakutenKey) {
      await new Promise(r => setTimeout(r, 1200));
      setResults(DEMO_RESULTS);
      setLog(`✅ デモデータ表示中 — "${keyword}" の実際の検索にはAPIキーが必要です`);
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        appid: YAHOO_CLIENT_ID,
        query: keyword,
        results: "20",
        sort: "-sold",
        output: "json",
      });

      const res = await fetch(`/api/yahoo?${params}`);
      if (!res.ok) {
        await new Promise(r => setTimeout(r, 800));
        setResults(DEMO_RESULTS);
        setLog(`⚠ Yahoo!API接続エラー（${res.status}）— デモデータを表示しています`);
        setLoading(false);
        return;
      }
      const data = await res.json();

      const rawItems = data.hits || [];
      const items = rawItems.map((Item) => {
        const buyPrice = Item.price?.value || Item.price || 0;
        const sellPrice = estimateSellPrice(buyPrice);
        return {
          title: (Item.name || "").slice(0, 60),
          buyPrice,
          sellPrice,
          imageUrl: Item.image?.medium || null,
          jan: Item.janCode || null,
          rakutenUrl: Item.url,
        };
      });

      setResults(items);
      setLog(`✅ ${items.length}件取得完了 — 利益率の高い順に並んでいます`);
    } catch (e) {
      setLog(`❌ エラー: ${e.message}`);
    }
    setLoading(false);
  }

  async function runEbaySearch() {
    if (!ebayKeyword.trim()) return;
    setLoading(true);
    setEbayResults([]);
    setEbayLog("🔍 eBayの売れ筋を検索中...");

    if (!hasEbayKey) {
      await new Promise(r => setTimeout(r, 1200));
      setEbayResults(DEMO_EBAY_RESULTS);
      setEbayLog(`✅ デモデータ表示中 — 実際の検索にはeBay APIキーが必要です`);
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        "OPERATION-NAME": "findCompletedItems",
        "SERVICE-VERSION": "1.0.0",
        "SECURITY-APPNAME": EBAY_APP_ID,
        "RESPONSE-DATA-FORMAT": "JSON",
        "keywords": ebayKeyword,
        "itemFilter(0).name": "SoldItemsOnly",
        "itemFilter(0).value": "true",
        "itemFilter(1).name": "ListingType",
        "itemFilter(1).value": "FixedPrice",
        "sortOrder": "BestMatch",
        "paginationInput.entriesPerPage": "20",
      });

      const res = await fetch(`/api/ebay?${params}`);
      if (!res.ok) {
        setEbayResults(DEMO_EBAY_RESULTS);
        setEbayLog(`⚠ eBay API接続エラー（${res.status}）— デモデータを表示しています`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];
      const rawItems = searchResult?.item || [];

      if (rawItems.length === 0) {
        setEbayResults(DEMO_EBAY_RESULTS);
        setEbayLog(`⚠ 検索結果0件 — デモデータを表示しています`);
        setLoading(false);
        return;
      }

      const items = rawItems.map((item) => ({
        title: (item.title?.[0] || "").slice(0, 60),
        soldPrice: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
        soldCount: parseInt(item.sellingStatus?.[0]?.bidCount?.[0] || 0),
        imageUrl: item.galleryURL?.[0] || null,
        ebayUrl: item.viewItemURL?.[0] || null,
      }));

      setEbayResults(items);
      setEbayLog(`✅ ${items.length}件取得完了 — eBay売れ筋商品です`);
    } catch (e) {
      setEbayResults(DEMO_EBAY_RESULTS);
      setEbayLog(`⚠ エラー発生 — デモデータを表示しています: ${e.message}`);
    }
    setLoading(false);
  }

  async function runYahooAuctionSearch() {
    if (!yahooAuctionKeyword.trim()) return;
    setLoading(true);
    setYahooAuctionResults([]);
    setYahooAuctionLog("🔍 ヤフオク!を検索中...");

    const DEMO_AUCTION = [
      { title: `${yahooAuctionKeyword} 美品 送料無料`, buyPrice: 1800, sellPrice: estimateSellPrice(1800), imageUrl: null, bidCount: 5 },
      { title: `${yahooAuctionKeyword} 限定版 箱付き`, buyPrice: 3500, sellPrice: estimateSellPrice(3500), imageUrl: null, bidCount: 12 },
      { title: `${yahooAuctionKeyword} まとめ売り 3点セット`, buyPrice: 2200, sellPrice: estimateSellPrice(2200), imageUrl: null, bidCount: 3 },
      { title: `レア ${yahooAuctionKeyword} 未開封品`, buyPrice: 5800, sellPrice: estimateSellPrice(5800), imageUrl: null, bidCount: 21 },
    ];

    try {
      const params = new URLSearchParams({
        appid: YAHOO_CLIENT_ID,
        query: yahooAuctionKeyword,
        results: "20",
        sort: "end",
        order: "d",
        output: "json",
      });

      const res = await fetch(`/api/yahooauction?${params}`);
      if (!res.ok) {
        setYahooAuctionResults(DEMO_AUCTION);
        setYahooAuctionLog(`⚠ ヤフオクAPI接続エラー（${res.status}）— デモデータを表示しています`);
        setLoading(false);
        return;
      }
      const data = await res.json();

      const rawItems = data.ResultSet?.Result?.Item || [];
      const items = (Array.isArray(rawItems) ? rawItems : [rawItems]).map((item) => {
        const buyPrice = parseInt(item.BidOrBuy || item.CurrentPrice || 0);
        return {
          title: (item.Title || "").slice(0, 60),
          buyPrice,
          sellPrice: estimateSellPrice(buyPrice),
          imageUrl: item.Image || null,
          auctionUrl: item.AuctionItemUrl || null,
          endTime: item.EndTime || null,
          bidCount: parseInt(item.BidCount || 0),
        };
      }).filter(i => i.buyPrice > 0);

      if (items.length === 0) {
        setYahooAuctionResults(DEMO_AUCTION);
        setYahooAuctionLog(`⚠ 検索結果0件 — デモデータを表示しています`);
      } else {
        setYahooAuctionResults(items);
        setYahooAuctionLog(`✅ ${items.length}件取得完了 — 即決価格あり商品`);
      }
    } catch (e) {
      setYahooAuctionResults(DEMO_AUCTION);
      setYahooAuctionLog(`⚠ ヤフオクAPI接続エラー — デモデータを表示しています`);
    }
    setLoading(false);
  }

  const sortedResults = [...results].sort((a, b) => {
    const ra = calcProfit(a.buyPrice, a.sellPrice).profitRate;
    const rb = calcProfit(b.buyPrice, b.sellPrice).profitRate;
    return rb - ra;
  });

  const phases = [
    { phase: 1, label: "Yahoo仕入れ", icon: "🟢", active: true },
    { phase: 2, label: "eBay売れ筋", icon: hasEbayKey ? "🟢" : "🟡", active: true },
    { phase: 3, label: "ヤフオク仕入れ", icon: hasRakutenKey ? "🟢" : "🟡", active: true },
    { phase: 4, label: "Shopee連携", icon: "⏳", active: false },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#eef2f7", color: "#1e293b",
      fontFamily: "'DM Sans', 'Hiragino Kaku Gothic ProN', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #e2e8f0", padding: "0 32px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#ffffff", boxShadow: "0 1px 3px #0000000a",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>🌐</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.5, color: "#0f172a" }}>CrossBorder Research</div>
            <div style={{ color: "#94a3b8", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
              PHASE {activePhase} — {activePhase === 1 ? "楽天仕入れリサーチ" : "eBay売れ筋リサーチ"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            fontSize: 11, color: hasRakutenKey ? "#059669" : "#d97706",
            fontFamily: "'DM Mono', monospace",
            background: hasRakutenKey ? "#d1fae5" : "#fef3c7",
            border: `1px solid ${hasRakutenKey ? "#6ee7b7" : "#fcd34d"}`,
            borderRadius: 6, padding: "4px 10px",
          }}>
            {hasRakutenKey ? "● Yahoo!API" : "○ Yahoo!デモ"}
          </div>
          <div style={{
            fontSize: 11, color: hasEbayKey ? "#059669" : "#d97706",
            fontFamily: "'DM Mono', monospace",
            background: hasEbayKey ? "#d1fae5" : "#fef3c7",
            border: `1px solid ${hasEbayKey ? "#6ee7b7" : "#fcd34d"}`,
            borderRadius: 6, padding: "4px 10px",
          }}>
            {hasEbayKey ? "● eBay API" : "○ eBayデモ"}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        {/* Phase Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          {phases.map(p => (
            <div
              key={p.phase}
              onClick={() => p.active && setActivePhase(p.phase)}
              style={{
                background: activePhase === p.phase ? "#eff6ff" : "#ffffff",
                border: `1px solid ${activePhase === p.phase ? "#bfdbfe" : "#e2e8f0"}`,
                borderRadius: 10, padding: "10px 14px",
                opacity: p.active ? 1 : 0.5,
                cursor: p.active ? "pointer" : "default",
              }}
            >
              <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>PHASE {p.phase}</div>
              <div style={{ color: activePhase === p.phase ? "#2563eb" : "#64748b", fontSize: 13, fontWeight: 600 }}>
                {p.icon} {p.label}
              </div>
            </div>
          ))}
        </div>

        {/* PHASE 1: 楽天リサーチ */}
        {activePhase === 1 && (
          <>
            <div style={{
              background: "#ffffff", border: "1px solid #e2e8f0",
              borderRadius: 16, padding: 24, marginBottom: 24,
              boxShadow: "0 1px 4px #0000000a",
            }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                    KEYWORD — 楽天で仕入れ先を検索
                  </label>
                  <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && runRakutenSearch()}
                    placeholder="例：アニメフィギュア、電気ケトル、日本酒..."
                    style={{
                      width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
                      borderRadius: 8, padding: "10px 14px", color: "#1e293b",
                      fontSize: 14, boxSizing: "border-box", outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    onClick={runRakutenSearch}
                    disabled={loading || !keyword.trim()}
                    style={{
                      padding: "11px 28px",
                      background: loading ? "#cbd5e1" : "linear-gradient(135deg, #0ea5e9, #6366f1)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
                    }}
                  >
                    {loading ? "🔄 検索中..." : "🔍 リサーチ開始"}
                  </button>
                </div>
              </div>
              <div style={{
                display: "flex", gap: 16, flexWrap: "wrap",
                background: "#e2e8f0", borderRadius: 8, padding: "10px 14px",
                fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace",
              }}>
                <span>💱 為替レート：{USD_JPY}円/USD</span>
                <span>📦 国際送料：${SHIPPING_USD}</span>
                <span>💳 eBay手数料：{(EBAY_FEE_RATE * 100)}%＋${EBAY_FEE_FIXED}</span>
                <span>📈 想定マークアップ：2.2倍＋送料</span>
                {!hasRakutenKey && <span style={{ color: "#d97706" }}>⚠ Yahoo!APIキー未設定 — デモ表示中</span>}
              </div>
            </div>

            {log && (
              <div style={{
                background: "#f1f5f9", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "10px 16px", marginBottom: 16,
                color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace",
              }}>
                {log}
              </div>
            )}

            {sortedResults.length > 0 && (
              <div>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
                }}>
                  <div style={{ color: "#64748b", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                    {sortedResults.length} ITEMS — 利益率が高い順
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>
                    クリックで詳細・世界ポケット登録URLを表示
                  </div>
                </div>
                {sortedResults.map((item, i) => (
                  <ResultRow key={i} item={item} index={i} />
                ))}
              </div>
            )}

            {results.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#cbd5e1" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>キーワードを入力してリサーチを開始してください</div>
                <div style={{ fontSize: 12, marginTop: 8, color: "#cbd5e1" }}>
                  楽天市場から仕入れ候補を検索 → 利益計算 → 世界ポケットに登録
                </div>
              </div>
            )}
          </>
        )}

        {/* PHASE 3: ヤフオク仕入れ */}
        {activePhase === 3 && (
          <>
            <div style={{
              background: "#ffffff", border: "1px solid #e2e8f0",
              borderRadius: 16, padding: 24, marginBottom: 24,
              boxShadow: "0 1px 4px #0000000a",
            }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                    KEYWORD — ヤフオク!で中古・掘り出し物を検索
                  </label>
                  <input
                    value={yahooAuctionKeyword}
                    onChange={e => setYahooAuctionKeyword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && runYahooAuctionSearch()}
                    placeholder="例：アニメフィギュア、ゲーム、カメラ..."
                    style={{
                      width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
                      borderRadius: 8, padding: "10px 14px", color: "#1e293b",
                      fontSize: 14, boxSizing: "border-box", outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    onClick={runYahooAuctionSearch}
                    disabled={loading || !yahooAuctionKeyword.trim()}
                    style={{
                      padding: "11px 28px",
                      background: loading ? "#cbd5e1" : "linear-gradient(135deg, #720E9E, #9333ea)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
                    }}
                  >
                    {loading ? "🔄 検索中..." : "🔨 ヤフオク検索"}
                  </button>
                </div>
              </div>
              <div style={{
                display: "flex", gap: 16, flexWrap: "wrap",
                background: "#f3e8ff", borderRadius: 8, padding: "10px 14px",
                fontSize: 11, color: "#581c87", fontFamily: "'DM Mono', monospace",
              }}>
                <span>🔨 ヤフオク!の即決・落札価格を検索</span>
                <span>💡 中古品を安く仕入れてeBayで売る</span>
              </div>
            </div>

            {yahooAuctionLog && (
              <div style={{
                background: "#f1f5f9", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "10px 16px", marginBottom: 16,
                color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace",
              }}>
                {yahooAuctionLog}
              </div>
            )}

            {yahooAuctionResults.length > 0 && (
              <div>
                <div style={{ color: "#64748b", fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>
                  {yahooAuctionResults.length} ITEMS — ヤフオク!仕入れ候補
                </div>
                {yahooAuctionResults.map((item, i) => {
                  const { profitJpy, profitRate } = calcProfit(item.buyPrice, item.sellPrice);
                  return (
                    <div key={i} style={{
                      background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12,
                      marginBottom: 10, padding: "14px 16px", boxShadow: "0 1px 3px #0000000a",
                      display: "grid", gridTemplateColumns: "32px 60px 1fr auto auto auto", gap: 12, alignItems: "center",
                    }}>
                      <span style={{ color: "#cbd5e1", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: 52, height: 52, background: "#f3e8ff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔨</div>
                      )}
                      <div>
                        <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Tag label="ヤフオク" color="#720E9E" />
                          {item.bidCount > 0 && <Tag label={`${item.bidCount}入札`} color="#6366f1" />}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#720E9E", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                          ¥{item.buyPrice?.toLocaleString()}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 11 }}>即決/落札価格</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#f59e0b", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                          ${item.sellPrice}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 11 }}>想定販売価格</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{
                          color: profitRate > 30 ? "#10b981" : profitRate > 10 ? "#f59e0b" : "#ef4444",
                          fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700,
                        }}>
                          {profitRate}%
                        </div>
                        <div style={{ color: "#475569", fontSize: 11 }}>利益率</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {yahooAuctionResults.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#cbd5e1" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔨</div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>ヤフオク!で中古品を検索します</div>
                <div style={{ fontSize: 12, marginTop: 8, color: "#cbd5e1" }}>
                  中古品を安く仕入れ → eBayで海外販売
                </div>
              </div>
            )}
          </>
        )}

        {/* PHASE 2: eBay売れ筋 */}
        {activePhase === 2 && (
          <>
            <div style={{
              background: "#ffffff", border: "1px solid #e2e8f0",
              borderRadius: 16, padding: 24, marginBottom: 24,
              boxShadow: "0 1px 4px #0000000a",
            }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                    KEYWORD — eBayで売れている日本商品を検索（英語推奨）
                  </label>
                  <input
                    value={ebayKeyword}
                    onChange={e => setEbayKeyword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && runEbaySearch()}
                    placeholder="例：japanese figure, japan sake, anime..."
                    style={{
                      width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
                      borderRadius: 8, padding: "10px 14px", color: "#1e293b",
                      fontSize: 14, boxSizing: "border-box", outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    onClick={runEbaySearch}
                    disabled={loading || !ebayKeyword.trim()}
                    style={{
                      padding: "11px 28px",
                      background: loading ? "#cbd5e1" : "linear-gradient(135deg, #E53238, #c0392b)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
                    }}
                  >
                    {loading ? "🔄 検索中..." : "🛍 eBay検索"}
                  </button>
                </div>
              </div>
              <div style={{
                display: "flex", gap: 16, flexWrap: "wrap",
                background: "#fee2e2", borderRadius: 8, padding: "10px 14px",
                fontSize: 11, color: "#7f1d1d", fontFamily: "'DM Mono', monospace",
              }}>
                <span>🛍 eBay成約済み商品を検索</span>
                <span>📊 実際に売れた価格から利益を逆算</span>
                {!hasEbayKey && <span style={{ color: "#d97706" }}>⚠ eBay APIキー未設定 — デモ表示中</span>}
              </div>
            </div>

            {ebayLog && (
              <div style={{
                background: "#f1f5f9", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "10px 16px", marginBottom: 16,
                color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace",
              }}>
                {ebayLog}
              </div>
            )}

            {ebayResults.length > 0 && (
              <div>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
                }}>
                  <div style={{ color: "#64748b", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                    {ebayResults.length} ITEMS — eBay売れ筋商品
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>
                    クリックで詳細・仕入れ上限価格を表示
                  </div>
                </div>
                {ebayResults.map((item, i) => (
                  <EbayResultRow key={i} item={item} index={i} />
                ))}
              </div>
            )}

            {ebayResults.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#cbd5e1" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🛍</div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>eBayで売れている日本商品を検索します</div>
                <div style={{ fontSize: 12, marginTop: 8, color: "#cbd5e1" }}>
                  成約済み価格から仕入れ上限を逆算 → 楽天で仕入れ先を探す
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
