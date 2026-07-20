import { useState, useEffect } from "react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

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

function extractYahooItemCode(url) {
  if (!url) return null;
  // https://store.shopping.yahoo.co.jp/{storeId}/{itemId}.html
  const m1 = url.match(/store\.shopping\.yahoo\.co\.jp\/([^/]+)\/([^/?#.]+)/);
  if (m1) return `${m1[1]}_${m1[2]}`;
  // https://item.shopping.yahoo.co.jp/detail/{storeId}-{itemId}
  const m2 = url.match(/item\.shopping\.yahoo\.co\.jp\/detail\/([^/?#]+)/);
  if (m2) return m2[1].replace(/-/, "_");
  return null;
}

async function submitToSekaiPocket(itemCode) {
  const res = await fetch("/api/sekaipocket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemCode }),
  });
  return res.json();
}

function Tag({ label, color }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
    }}>{label}</span>
  );
}

function ResultRow({ item, index, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const { profitJpy, profitRate } = calcProfit(item.buyPrice, item.sellPrice);

  const ebaySearchUrl = item.ebaySearchKeyword
    ? `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(item.ebaySearchKeyword)}&LH_ItemCondition=1000`
    : `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(item.title.slice(0, 40))}`;

  async function handleSubmit(e) {
    e.stopPropagation();
    const itemCode = extractYahooItemCode(item.rakutenUrl);
    if (!itemCode) { setSubmitStatus("error"); return; }
    setSubmitStatus("loading");
    const result = await submitToSekaiPocket(itemCode);
    setSubmitStatus(result.success ? "ok" : "error");
  }

  if (isMobile) {
    return (
      <div style={{
        background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12,
        marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px #0000000a",
      }}>
        <div onClick={() => setExpanded(!expanded)} style={{ padding: "12px 14px", cursor: "pointer" }}>
          {/* 画像＋タイトル行 */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 6, background: "#f8fafc", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 52, height: 52, background: "#1e3a4a", borderRadius: 6, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>
                {item.title}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Tag label="Yahoo!" color={platformColors.yahoo} />
                {item.jan && <Tag label="JAN" color="#10b981" />}
              </div>
            </div>
          </div>
          {/* 価格・利益率行 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#64748b" }}>
              <span>仕入れ <b style={{ color: "#0ea5e9" }}>¥{item.buyPrice?.toLocaleString()}</b></span>
              <span>販売 <b style={{ color: "#f59e0b" }}>${item.sellPrice}</b></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                color: profitRate > 30 ? "#10b981" : profitRate > 10 ? "#f59e0b" : "#ef4444",
                fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700,
              }}>{profitRate}%</span>
              <button onClick={handleSubmit} disabled={submitStatus === "loading" || submitStatus === "ok"} style={{
                padding: "6px 12px", fontSize: 12, fontWeight: 700, borderRadius: 6, border: "none",
                cursor: submitStatus === "loading" || submitStatus === "ok" ? "default" : "pointer",
                background: submitStatus === "ok" ? "#d1fae5" : submitStatus === "error" ? "#fee2e2" : "#720E9E",
                color: submitStatus === "ok" ? "#065f46" : submitStatus === "error" ? "#991b1b" : "#fff",
              }}>
                {submitStatus === "loading" ? "投入中..." : submitStatus === "ok" ? "✓" : submitStatus === "error" ? "✗" : "🌐"}
              </button>
            </div>
          </div>
        </div>
        {expanded && (
          <div style={{ borderTop: "1px solid #f1f5f9", padding: "12px 14px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", padding: "10px 14px", color: "#475569", fontSize: 12, lineHeight: 1.8 }}>
              <span style={{ color: "#0ea5e9", fontWeight: 600 }}>利益試算：</span>
              　仕入れ ¥{item.buyPrice?.toLocaleString()} ＋ 送料 ¥{(SHIPPING_USD * USD_JPY).toLocaleString()}
              　→　eBay ＄{item.sellPrice}（¥{(item.sellPrice * USD_JPY).toLocaleString()}）
              　→　<span style={{ color: profitJpy > 0 ? "#10b981" : "#ef4444", fontWeight: 700 }}>利益 ¥{profitJpy.toLocaleString()}（{profitRate}%）</span>
            </div>
            {item.rakutenUrl && (
              <a href={item.rakutenUrl} target="_blank" rel="noreferrer" style={{ background: "#BF000011", border: "1px solid #BF000033", borderRadius: 8, padding: "10px 14px", color: "#ef4444", textDecoration: "none", fontSize: 12 }}>
                🛒 Yahoo!で見る（仕入れ）
              </a>
            )}
            <a href={ebaySearchUrl} target="_blank" rel="noreferrer" style={{ background: "#E5323811", border: "1px solid #E5323833", borderRadius: 8, padding: "10px 14px", color: "#E53238", textDecoration: "none", fontSize: 12 }}>
              🛍 eBayで見る（現行出品）
            </a>
            <div onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(item.rakutenUrl || ""); }} style={{ background: "#0ea5e911", border: "1px solid #0ea5e933", borderRadius: 8, padding: "10px 14px", color: "#7dd3fc", fontSize: 12, cursor: "pointer" }}>
              📋 URLコピー
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12,
      marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px #0000000a",
    }}>
      {/* PC: 7列グリッド */}
      <div onClick={() => setExpanded(!expanded)} style={{
        padding: "12px 16px", cursor: "pointer",
        display: "grid",
        gridTemplateColumns: "32px 56px 1fr 110px 100px 70px 44px",
        gap: 12, alignItems: "center",
      }}>
        <span style={{ color: "#cbd5e1", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 6, background: "#f8fafc" }} />
        ) : (
          <div style={{ width: 48, height: 48, background: "#1e3a4a", borderRadius: 6 }} />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.title}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Tag label="Yahoo!" color={platformColors.yahoo} />
            {item.jan && <Tag label="JAN" color="#10b981" />}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#0ea5e9", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>¥{item.buyPrice?.toLocaleString() || "—"}</div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>仕入れ</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#f59e0b", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>${item.sellPrice || "—"}</div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>販売</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: profitRate > 30 ? "#10b981" : profitRate > 10 ? "#f59e0b" : "#ef4444", fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700 }}>{profitRate}%</div>
          <div style={{ color: "#475569", fontSize: 11 }}>利益率</div>
        </div>
        <button onClick={handleSubmit} disabled={submitStatus === "loading" || submitStatus === "ok"} style={{
          padding: "6px 8px", fontSize: 11, fontWeight: 700, borderRadius: 6, border: "none",
          cursor: submitStatus === "loading" || submitStatus === "ok" ? "default" : "pointer",
          background: submitStatus === "ok" ? "#d1fae5" : submitStatus === "error" ? "#fee2e2" : "#720E9E",
          color: submitStatus === "ok" ? "#065f46" : submitStatus === "error" ? "#991b1b" : "#fff",
        }}>
          {submitStatus === "loading" ? "..." : submitStatus === "ok" ? "✓" : submitStatus === "error" ? "✗" : "🌐"}
        </button>
      </div>
      {/* 展開パネル */}
      {expanded && (
        <div style={{
          borderTop: "1px solid #f1f5f9", padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 8,
          background: "#f8fafc",
        }}>
          <div style={{
            background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0",
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {item.rakutenUrl && (
              <a href={item.rakutenUrl} target="_blank" rel="noreferrer" style={{
                background: "#BF000011", border: "1px solid #BF000033",
                borderRadius: 8, padding: "10px 14px", color: "#ef4444",
                textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 6,
              }}>
                🛒 Yahoo!で見る（仕入れ）
              </a>
            )}
            <a href={ebaySearchUrl} target="_blank" rel="noreferrer" style={{
              background: "#E5323811", border: "1px solid #E5323833",
              borderRadius: 8, padding: "10px 14px", color: "#E53238",
              textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 6,
            }}>
              🛍 eBayで見る（現行出品）
            </a>
            <div
              onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(item.rakutenUrl || ""); }}
              style={{
                background: "#0ea5e911", border: "1px solid #0ea5e933",
                borderRadius: 8, padding: "10px 14px", color: "#7dd3fc",
                fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
              }}
            >
              📋 URLコピー
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResearchRow({ item, index, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const shippingJpy = item.ebayPrice < 30 ? 1200 : item.ebayPrice < 80 ? 1950 : 2700;

  const statusColor = item.sourcingFound
    ? (item.profitRate >= 25 ? "#10b981" : item.profitRate >= 0 ? "#f59e0b" : "#ef4444")
    : "#94a3b8";
  const statusLabel = item.sourcingFound
    ? (item.profitRate >= 25 ? "利益あり" : item.profitRate >= 0 ? "薄利" : "赤字")
    : "仕入先未発見";

  if (isMobile) {
    return (
      <div style={{ background: "#fff", border: `1px solid ${item.sourcingFound ? "#e2e8f0" : "#f1f5f9"}`, borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px #0000000a", opacity: item.sourcingFound ? 1 : 0.7 }}>
        <div onClick={() => setExpanded(!expanded)} style={{ padding: "12px 14px", cursor: "pointer" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
            {item.ebayImage
              ? <img src={item.ebayImage} alt="" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 6, background: "#f8fafc", flexShrink: 0 }} />
              : <div style={{ width: 52, height: 52, background: "#fee2e2", borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛍</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{item.ebayTitle}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Tag label="eBay" color={platformColors.ebay} />
                <Tag label={statusLabel} color={statusColor} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              <span>eBay <b style={{ color: "#E53238" }}>${item.ebayPrice}</b></span>
              {item.yahooPrice && <span style={{ marginLeft: 12 }}>仕入れ <b style={{ color: "#0ea5e9" }}>¥{item.yahooPrice.toLocaleString()}</b></span>}
            </div>
            {item.sourcingFound && (
              <span style={{ color: statusColor, fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700 }}>
                {item.profitRate}%
              </span>
            )}
          </div>
        </div>
        {expanded && (
          <div style={{ borderTop: "1px solid #f1f5f9", padding: "12px 14px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 8 }}>
            {item.sourcingFound ? (
              <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", padding: "10px 14px", color: "#475569", fontSize: 12, lineHeight: 1.8 }}>
                <span style={{ color: "#0ea5e9", fontWeight: 600 }}>利益試算：</span>
                　仕入れ ¥{item.yahooPrice?.toLocaleString()} ＋ 送料 ¥{shippingJpy.toLocaleString()}
                　→　eBay ${item.ebayPrice}（¥{(item.ebayPrice * USD_JPY).toLocaleString()}）
                　→　<span style={{ color: item.profitJpy > 0 ? "#10b981" : "#ef4444", fontWeight: 700 }}>利益 ¥{item.profitJpy?.toLocaleString()}（{item.profitRate}%）</span>
              </div>
            ) : (
              <div style={{ background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", padding: "10px 14px", color: "#94a3b8", fontSize: 12 }}>
                🔍 検索キーワード：「{item.jaKeyword || "翻訳中..."}」でYahoo!に該当なし
              </div>
            )}
            {item.yahooUrl && <a href={item.yahooUrl} target="_blank" rel="noreferrer" style={{ background: "#BF000011", border: "1px solid #BF000033", borderRadius: 8, padding: "10px 14px", color: "#ef4444", textDecoration: "none", fontSize: 12 }}>🛒 Yahoo!で見る（仕入れ）</a>}
            <a href={item.ebayUrl} target="_blank" rel="noreferrer" style={{ background: "#E5323811", border: "1px solid #E5323833", borderRadius: 8, padding: "10px 14px", color: "#E53238", textDecoration: "none", fontSize: 12 }}>🛍 eBayで見る（現行出品）</a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${item.sourcingFound ? "#e2e8f0" : "#f1f5f9"}`, borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px #0000000a", opacity: item.sourcingFound ? 1 : 0.75 }}>
      <div onClick={() => setExpanded(!expanded)} style={{
        padding: "12px 16px", cursor: "pointer",
        display: "grid", gridTemplateColumns: "32px 56px 1fr 90px 110px 100px 70px",
        gap: 12, alignItems: "center",
      }}>
        <span style={{ color: "#cbd5e1", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{String(index + 1).padStart(2, "0")}</span>
        {item.ebayImage
          ? <img src={item.ebayImage} alt="" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 6, background: "#f8fafc" }} />
          : <div style={{ width: 48, height: 48, background: "#fee2e2", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛍</div>
        }
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.ebayTitle}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Tag label="eBay" color={platformColors.ebay} />
            <Tag label={statusLabel} color={statusColor} />
            {item.jaKeyword && <Tag label={item.jaKeyword.slice(0, 12)} color="#6366f1" />}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#E53238", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>${item.ebayPrice}</div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>eBay価格</div>
        </div>
        <div style={{ textAlign: "right" }}>
          {item.yahooPrice
            ? <><div style={{ color: "#0ea5e9", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>¥{item.yahooPrice.toLocaleString()}</div><div style={{ color: "#94a3b8", fontSize: 11 }}>Yahoo!仕入れ</div></>
            : <div style={{ color: "#cbd5e1", fontSize: 11 }}>仕入先なし</div>
          }
        </div>
        <div style={{ textAlign: "right" }}>
          {item.yahooName
            ? <div style={{ color: "#475569", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.yahooName}</div>
            : <div style={{ color: "#cbd5e1", fontSize: 11 }}>—</div>
          }
        </div>
        <div style={{ textAlign: "right" }}>
          {item.sourcingFound
            ? <><div style={{ color: statusColor, fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700 }}>{item.profitRate}%</div><div style={{ color: "#475569", fontSize: 11 }}>利益率</div></>
            : <div style={{ color: "#cbd5e1", fontSize: 12 }}>—</div>
          }
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: "14px 16px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 8 }}>
          {item.sourcingFound ? (
            <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", padding: "10px 14px", color: "#475569", fontSize: 12, lineHeight: 1.8 }}>
              <span style={{ color: "#0ea5e9", fontWeight: 600 }}>利益試算：</span>
              　仕入れ ¥{item.yahooPrice?.toLocaleString()} ＋ 送料 ¥{shippingJpy.toLocaleString()} ＋ eBay手数料
              　→　eBay販売 ${item.ebayPrice}（¥{(item.ebayPrice * USD_JPY).toLocaleString()}）
              　→　<span style={{ color: item.profitJpy > 0 ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                利益 ¥{item.profitJpy?.toLocaleString()}（{item.profitRate}%）
              </span>
            </div>
          ) : (
            <div style={{ background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", padding: "10px 14px", color: "#94a3b8", fontSize: 12 }}>
              🔍 「{item.jaKeyword || "キーワード翻訳失敗"}」でYahoo!を検索しましたが仕入先が見つかりませんでした。手動でYahoo!を検索するか、出品のみ試みることができます。
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {item.yahooUrl && (
              <a href={item.yahooUrl} target="_blank" rel="noreferrer" style={{ flex: 1, background: "#BF000011", border: "1px solid #BF000033", borderRadius: 8, padding: "10px 14px", color: "#ef4444", textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                🛒 Yahoo!で見る（仕入れ）
              </a>
            )}
            <a href={item.ebayUrl} target="_blank" rel="noreferrer" style={{ flex: 1, background: "#E5323811", border: "1px solid #E5323833", borderRadius: 8, padding: "10px 14px", color: "#E53238", textDecoration: "none", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              🛍 eBayで見る（出品元）
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

const EBAY_PRESETS = [
  { label: "🎯 おすすめ全ジャンル",  keyword: "japanese collectible figure anime" },
  { label: "━━ フィギュア・トイ ━━", keyword: null },
  { label: "　アニメフィギュア",       keyword: "japanese anime figure collectible" },
  { label: "　ねんどろいど",           keyword: "nendoroid good smile figure" },
  { label: "　ガンプラ",               keyword: "gunpla gundam model kit bandai" },
  { label: "━━ カード・ゲーム ━━",   keyword: null },
  { label: "　ポケモンカード",         keyword: "pokemon card japanese booster pack" },
  { label: "　遊戯王カード",           keyword: "yugioh card japanese" },
  { label: "　ワンピースカード",       keyword: "one piece card game japanese" },
  { label: "━━ ファッション ━━",     keyword: null },
  { label: "　ブランド腕時計",         keyword: "japanese brand watch seiko citizen" },
  { label: "　スニーカー",             keyword: "japanese sneaker limited edition" },
  { label: "━━ 食品・飲料 ━━",       keyword: null },
  { label: "　日本酒・ウイスキー",     keyword: "japanese sake whisky premium" },
  { label: "　抹茶・和菓子",           keyword: "japanese matcha green tea snack" },
  { label: "━━ 家電・雑貨 ━━",       keyword: null },
  { label: "　家電製品",               keyword: "japanese electronics gadget" },
  { label: "　キッチン用品",           keyword: "japanese kitchen knife cookware" },
  { label: "━━ コスメ・美容 ━━",     keyword: null },
  { label: "　スキンケア",             keyword: "japanese skincare shiseido hada labo" },
  { label: "━━ サブカル・レア ━━",   keyword: null },
  { label: "　鬼滅・呪術廻戦グッズ", keyword: "demon slayer jujutsu kaisen merchandise" },
  { label: "　限定コラボグッズ",       keyword: "japan limited collaboration goods" },
];

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

const CANDIDATES_KEY = "crossborder_candidates_v1";

function loadCandidates() {
  try { return JSON.parse(localStorage.getItem(CANDIDATES_KEY) || "[]"); } catch { return []; }
}
function saveCandidates(list) {
  localStorage.setItem(CANDIDATES_KEY, JSON.stringify(list));
}

export default function App() {
  const isMobile = useIsMobile();
  const [activePhase, setActivePhase] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [ebayKeyword, setEbayKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [researchResults, setResearchResults] = useState([]);
  const [ebayResults, setEbayResults] = useState([]);
  const [log, setLog] = useState("");
  const [researchLog, setResearchLog] = useState("");
  const [ebayLog, setEbayLog] = useState("");
  const [ebayMode, setEbayMode] = useState("seller"); // "seller" | "keyword"
  const [sellerResults, setSellerResults] = useState([]);
  const [japanItems, setJapanItems] = useState([]);
  const [sellerLog, setSellerLog] = useState("");
  const [sellerView, setSellerView] = useState("sellers"); // "sellers" | "japan"
  const [minProfitRate, setMinProfitRate] = useState(0);
  const [yahooAuctionKeyword, setYahooAuctionKeyword] = useState("");
  const [yahooAuctionResults, setYahooAuctionResults] = useState([]);
  const [yahooAuctionLog, setYahooAuctionLog] = useState("");
  const [myListings, setMyListings] = useState([]);
  const [listingsLog, setListingsLog] = useState("");
  const [listingsLoading, setListingsLoading] = useState(false);
  const [replaceList, setReplaceList] = useState([]);
  const [teraCSV, setTeraCSV] = useState("");
  const [teraResults, setTeraResults] = useState([]);
  const [teraLog, setTeraLog] = useState("");
  const [teraLoading, setTeraLoading] = useState(false);
  const [candidateList, setCandidateList] = useState(loadCandidates);
  const [showCandidates, setShowCandidates] = useState(false);

  function mergeIntoCandidates(results) {
    const current = loadCandidates();
    const existingTitles = new Set(current.map(c => c.ebayTitle));
    const newItems = results
      .filter(r => r.sourcingFound && !existingTitles.has(r.ebayTitle))
      .map(r => ({
        ebayTitle: r.ebayTitle, ebayPrice: r.ebayPrice,
        bestPrice: r.bestPrice, bestUrl: r.bestUrl, bestSource: r.bestSource,
        bestName: r.bestName, amazonAsin: r.amazonAsin,
        profitRate: r.profitRate, profitJpy: r.profitJpy,
        jaKeyword: r.jaKeyword, addedAt: new Date().toISOString().slice(0, 10),
      }));
    if (newItems.length > 0) {
      const updated = [...current, ...newItems];
      saveCandidates(updated);
      setCandidateList(updated);
    }
  }

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
        results: "100",
        sort: "-sold",
        output: "json",
        condition: "new",      // 新品のみ
        in_stock: "true",      // 在庫あり
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

      // 予約・中古・在庫僅少・オリパを除外
      const EXCLUDE_KEYWORDS = ["予約", "中古", "残りわずか", "取り寄せ", "入荷待ち", "【予約】", "pre-order", "オリパ", "くじ", "ガチャ"];
      const today = new Date();
      const filteredItems = rawItems.filter(Item => {
        const condition = Item.condition || "";
        if (condition && condition !== "new") return false;
        // 名前に除外キーワードが含まれる場合はスキップ
        if (EXCLUDE_KEYWORDS.some(kw => (Item.name || "").includes(kw))) return false;
        // 発売日が未来の場合はスキップ（予約品）
        if (Item.releaseDate) {
          const releaseDate = new Date(Item.releaseDate);
          if (releaseDate > today) return false;
        }
        // availability が "preOrder" や "outOfStock" の場合はスキップ
        const availability = Item.availability || "";
        if (["preOrder", "outOfStock", "backOrder"].includes(availability)) return false;
        return true;
      });

      // Yahoo商品ごとにeBayの実際の販売価格を検索
      setLog(`⏳ ${filteredItems.length}件のeBay販売価格を調査中...（予約・中古除外済み）`);
      const items = [];
      for (const Item of filteredItems) {
        const buyPrice = Item.price?.value || Item.price || 0;
        let sellPrice = estimateSellPrice(buyPrice);
        let ebayActualPrice = null;
        const jan = Item.janCode || null;
        let searchKeyword = jan || (Item.name || "").slice(0, 50);

        try {
          if (!jan) {
            const translateRes = await fetch("/api/translate-keyword", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: Item.name, jan }),
            });
            if (translateRes.ok) {
              const translated = await translateRes.json();
              searchKeyword = translated.keyword || (Item.name || "").slice(0, 50);
            }
          }

          const ebayParams = new URLSearchParams({ keywords: searchKeyword, results: "5" });
          const ebayRes = await fetch(`/api/ebay?${ebayParams}`);
          if (ebayRes.ok) {
            const ebayData = await ebayRes.json();
            const ebayItems = ebayData.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
            if (ebayItems.length > 0) {
              const buyPriceUsd = buyPrice / USD_JPY;
              const prices = ebayItems
                .map(i => parseFloat(i.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || "0"))
                .filter(p => {
                  if (p <= 0) return false;
                  const ratio = p / buyPriceUsd;
                  return ratio >= 1.2 && ratio <= 10;
                });
              if (prices.length > 0) {
                ebayActualPrice = Math.min(...prices);
                sellPrice = ebayActualPrice;
              }
            }
          }
        } catch (_) {}

        items.push({
          title: (Item.name || "").slice(0, 60),
          buyPrice,
          sellPrice,
          ebayActualPrice,
          imageUrl: Item.image?.medium || null,
          jan,
          rakutenUrl: Item.url,
          ebaySearchKeyword: searchKeyword,
        });
      }

      setResults(items);
      setLog(`✅ ${items.length}件取得完了 — eBay実際価格で利益率を計算済み`);
    } catch (e) {
      setLog(`❌ エラー: ${e.message}`);
    }
    setLoading(false);
  }

  async function runSellerResearch() {
    if (!ebayKeyword.trim()) return;
    setLoading(true);
    setSellerResults([]);
    setSellerLog("🔍 日本人セラーの実売データを収集中...");
    try {
      const res = await fetch(`/api/seller-research?keyword=${encodeURIComponent(ebayKeyword)}&maxSellers=8`);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        setSellerLog(`❌ APIエラー (${res.status}): ${text.slice(0, 100)}`);
        setLoading(false);
        return;
      }
      if (data.error) { setSellerLog(`❌ ${data.error}`); setLoading(false); return; }
      setSellerResults(data.sellers || []);
      setJapanItems(data.japanItems || []);
      setSellerLog((data.log || []).join(" → ") || `✅ ${data.sellers?.length}セラー分析完了`);
    } catch (e) {
      setSellerLog(`❌ ${e.message}`);
    }
    setLoading(false);
  }

  async function runResearch() {
    if (!ebayKeyword.trim()) return;
    setLoading(true);
    setResearchResults([]);
    setResearchLog("🔍 eBayで売れ筋を検索中...");

    try {
      const res = await fetch(`/api/research?keyword=${encodeURIComponent(ebayKeyword)}&limit=20`);
      if (!res.ok) {
        setResearchLog(`❌ エラー（${res.status}）`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setResearchLog(`❌ ${data.error}`);
        setLoading(false);
        return;
      }
      setResearchResults(data.results || []);
      const found = (data.results || []).filter(r => r.sourcingFound).length;
      setResearchLog(
        (data.log || []).join(" / ") ||
        `✅ eBay ${data.results?.length}件 → 仕入先発見 ${found}件`
      );
    } catch (e) {
      setResearchLog(`❌ ${e.message}`);
    }
    setLoading(false);
  }

  async function runEbaySearch() {
    // 旧フロー（後方互換）
    runResearch();
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

  async function runTeraAnalysis() {
    if (!teraCSV.trim()) return;
    setTeraLoading(true);
    setTeraResults([]);
    setTeraLog("📊 Teraﾋﾟｰｸデータを解析中...");
    try {
      // CSV解析（ヘッダー行をスキップ）
      const lines = teraCSV.trim().split("\n").filter(l => l.trim());
      const items = [];
      for (const line of lines) {
        const cols = line.split(",");
        if (cols.length < 5) continue;
        const title = cols[0].trim();
        const avgPrice = parseFloat(cols[1]);
        const sales = parseInt(cols[3]);
        const revenue = parseFloat(cols[4]);
        if (!title || isNaN(avgPrice) || title === "タイトル") continue;
        items.push({ title, avgPrice, sales, revenue });
      }
      if (items.length === 0) {
        setTeraLog("⚠ CSVの解析に失敗しました。フォーマットを確認してください。");
        setTeraLoading(false);
        return;
      }
      setTeraLog(`📋 ${items.length}件を検出 → Yahoo!仕入れ検索中...`);
      const res = await fetch("/api/terapeak-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      setTeraResults(data.results || []);
      mergeIntoCandidates(data.results || []);
      setTeraLog((data.log || []).join(" / "));
    } catch (e) {
      setTeraLog(`❌ エラー: ${e.message}`);
    }
    setTeraLoading(false);
  }

  const sortedResults = [...results]
    .sort((a, b) => {
      const ra = calcProfit(a.buyPrice, a.sellPrice).profitRate;
      const rb = calcProfit(b.buyPrice, b.sellPrice).profitRate;
      return rb - ra;
    })
    .filter(item => calcProfit(item.buyPrice, item.sellPrice).profitRate >= minProfitRate);

  const PLATFORM_GROUPS = [
    {
      label: "仕入れ先",
      platforms: [
        { phase: 1, label: "Yahoo!", icon: "🛒", color: "#720E9E", ready: true },
        { phase: 3, label: "ヤフオク", icon: "🔨", color: "#9333ea", ready: true },
        { phase: 5, label: "Amazon", icon: "📦", color: "#FF9900", ready: false },
        { phase: 6, label: "楽天", icon: "🎁", color: "#BF0000", ready: false },
      ],
    },
    {
      label: "売り先",
      platforms: [
        { phase: 2, label: "eBay", icon: "🛍", color: "#E53238", ready: true },
        { phase: 7, label: "Shopee", icon: "🧡", color: "#EE4D2D", ready: false },
      ],
    },
    {
      label: "管理",
      platforms: [
        { phase: 4, label: "回転管理", icon: "🔄", color: "#10b981", ready: true },
      ],
    },
    {
      label: "リサーチ",
      platforms: [
        { phase: 8, label: "週次売れ筋", icon: "📊", color: "#0ea5e9", ready: true },
      ],
    },
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
              越境EC自動化システム
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

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: isMobile ? "16px" : "24px 32px" }}>

        {/* モバイル: プラットフォーム横スクロールタブ */}
        {isMobile && (
          <div style={{ marginBottom: 12 }}>
            {PLATFORM_GROUPS.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 10 }}>
                <div style={{
                  fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace",
                  letterSpacing: 1, marginBottom: 6,
                }}>
                  {group.label}
                </div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                  {group.platforms.map(p => (
                    <button
                      key={p.phase}
                      onClick={() => p.ready && setActivePhase(p.phase)}
                      style={{
                        flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none",
                        cursor: p.ready ? "pointer" : "not-allowed",
                        background: activePhase === p.phase ? p.color : p.ready ? "#f1f5f9" : "#f1f5f9",
                        color: activePhase === p.phase ? "#fff" : p.ready ? "#374151" : "#9ca3af",
                        fontSize: 12, fontWeight: 600,
                        opacity: p.ready ? 1 : 0.5,
                      }}
                    >
                      {p.icon} {p.label}
                      {!p.ready && " 🚧"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>

          {/* LEFT SIDEBAR (PCのみ) */}
          {!isMobile && <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Phase-specific search form */}
            <div style={{
              background: "#ffffff", border: "1px solid #e2e8f0",
              borderRadius: 16, padding: 20, boxShadow: "0 1px 4px #0000000a",
            }}>
              {/* Phase 1: Yahoo仕入れ */}
              {activePhase === 1 && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                      KEYWORD — Yahoo!で仕入れ先を検索
                    </label>
                    <input
                      value={keyword}
                      onChange={e => setKeyword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && runRakutenSearch()}
                      placeholder="例：アニメフィギュア、電気ケトル..."
                      style={{
                        width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
                        borderRadius: 8, padding: "10px 14px", color: "#1e293b",
                        fontSize: 14, boxSizing: "border-box", outline: "none",
                      }}
                    />
                  </div>
                  <button
                    onClick={runRakutenSearch}
                    disabled={loading || !keyword.trim()}
                    style={{
                      width: "100%", padding: "11px 0", marginBottom: 12,
                      background: loading ? "#cbd5e1" : "linear-gradient(135deg, #720E9E, #9333ea)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
                    }}
                  >
                    {loading ? "🔄 検索中..." : "🔍 リサーチ開始"}
                  </button>
                  <div style={{
                    background: "#f8f0ff", borderRadius: 8, padding: "10px 12px",
                    fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace",
                    display: "flex", flexDirection: "column", gap: 4,
                  }}>
                    <span>💱 為替レート：{USD_JPY}円/USD</span>
                    <span>📦 国際送料：${SHIPPING_USD}</span>
                    <span>💳 eBay手数料：{(EBAY_FEE_RATE * 100)}%＋${EBAY_FEE_FIXED}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      🎯 利益率フィルター：
                      <select
                        value={minProfitRate}
                        onChange={e => setMinProfitRate(Number(e.target.value))}
                        style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                      >
                        <option value={0}>全て表示</option>
                        <option value={20}>20%以上</option>
                        <option value={30}>30%以上</option>
                        <option value={40}>40%以上</option>
                        <option value={50}>50%以上</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Phase 2: eBay→Yahoo!リサーチ */}
              {activePhase === 2 && (
                <>
                  {/* モード切替 */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    {[
                      { id: "seller", label: "👤 日本人セラー分析" },
                      { id: "keyword", label: "🔍 キーワード検索" },
                    ].map(m => (
                      <button key={m.id} onClick={() => setEbayMode(m.id)} style={{
                        flex: 1, padding: "7px 4px", borderRadius: 8, border: "none",
                        background: ebayMode === m.id ? "#E53238" : "#f1f5f9",
                        color: ebayMode === m.id ? "#fff" : "#64748b",
                        fontSize: 11, fontWeight: 700, cursor: "pointer",
                      }}>{m.label}</button>
                    ))}
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                      ① カテゴリから選ぶ
                    </label>
                    <select
                      onChange={e => { if (e.target.value) setEbayKeyword(e.target.value); }}
                      defaultValue=""
                      style={{
                        width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
                        borderRadius: 8, padding: "10px 14px", color: "#1e293b",
                        fontSize: 13, boxSizing: "border-box", outline: "none", cursor: "pointer",
                      }}
                    >
                      <option value="">── カテゴリを選択 ──</option>
                      {EBAY_PRESETS.map((p, i) =>
                        p.keyword
                          ? <option key={i} value={p.keyword}>{p.label}</option>
                          : <option key={i} value="" disabled style={{ color: "#94a3b8", fontWeight: 700 }}>{p.label}</option>
                      )}
                    </select>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                      ② または直接入力（英語）
                    </label>
                    <input
                      value={ebayKeyword}
                      onChange={e => setEbayKeyword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && runResearch()}
                      placeholder="例：japanese figure, pokemon card..."
                      style={{
                        width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
                        borderRadius: 8, padding: "10px 14px", color: "#1e293b",
                        fontSize: 14, boxSizing: "border-box", outline: "none",
                      }}
                    />
                  </div>
                  <button
                    onClick={ebayMode === "seller" ? runSellerResearch : runResearch}
                    disabled={loading || !ebayKeyword.trim()}
                    style={{
                      width: "100%", padding: "11px 0", marginBottom: 12,
                      background: loading ? "#cbd5e1" : "linear-gradient(135deg, #E53238, #c0392b)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
                    }}
                  >
                    {loading ? "🔄 分析中..." : ebayMode === "seller" ? "👤 セラー分析開始" : "🛍 リサーチ開始"}
                  </button>
                  <div style={{
                    background: "#fff1f0", borderRadius: 8, padding: "10px 12px",
                    fontSize: 11, color: "#7f1d1d", fontFamily: "'DM Mono', monospace",
                    display: "flex", flexDirection: "column", gap: 4,
                  }}>
                    {ebayMode === "seller" ? <>
                      <span>① 実際に売れた商品から日本人セラーを抽出</span>
                      <span>② そのセラーの現在の出品一覧を取得</span>
                      <span>③ Yahoo!で仕入れ値を調べ利益率を表示</span>
                      <span style={{ color: "#9ca3af", marginTop: 2 }}>根拠ある出品候補を効率よく発見</span>
                    </> : <>
                      <span>① eBayで既に売れている商品を発見</span>
                      <span>② Claude翻訳でYahoo!Japanを逆引き</span>
                      <span>③ 利益率を自動計算して表示</span>
                    </>}
                  </div>
                </>
              )}

              {/* Phase 3: ヤフオク仕入れ */}
              {activePhase === 3 && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                      KEYWORD — ヤフオク!で中古を検索
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
                  <button
                    onClick={runYahooAuctionSearch}
                    disabled={loading || !yahooAuctionKeyword.trim()}
                    style={{
                      width: "100%", padding: "11px 0", marginBottom: 12,
                      background: loading ? "#cbd5e1" : "linear-gradient(135deg, #720E9E, #9333ea)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
                    }}
                  >
                    {loading ? "🔄 検索中..." : "🔨 ヤフオク検索"}
                  </button>
                  <div style={{
                    background: "#f3e8ff", borderRadius: 8, padding: "10px 12px",
                    fontSize: 11, color: "#581c87", fontFamily: "'DM Mono', monospace",
                    display: "flex", flexDirection: "column", gap: 4,
                  }}>
                    <span>🔨 ヤフオク!の即決・落札価格を検索</span>
                    <span>💡 中古品を安く仕入れてeBayで売る</span>
                  </div>
                </>
              )}

              {/* Phase 4: 回転管理 */}
              {activePhase === 4 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 8 }}>
                    🔄 eBay出品回転管理
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>
                    出品中の商品を一覧表示。売れていない商品（30日以上）を検出して入れ替え候補に追加できます。
                  </div>
                  <button
                    onClick={async () => {
                      setListingsLoading(true);
                      setListingsLog("🔍 eBay出品一覧を取得中...");
                      try {
                        const res = await fetch("/api/ebay-listings");
                        const data = await res.json();
                        if (data.error) {
                          setListingsLog(`❌ エラー: ${data.error}`);
                        } else {
                          setMyListings(data.items || []);
                          setListingsLog(`✅ ${data.total}件の出品中商品を取得 — 長期出品順に表示`);
                        }
                      } catch (e) {
                        setListingsLog(`❌ ${e.message}`);
                      }
                      setListingsLoading(false);
                    }}
                    disabled={listingsLoading}
                    style={{
                      width: "100%", padding: "11px 0",
                      background: listingsLoading ? "#cbd5e1" : "linear-gradient(135deg, #10b981, #0d9488)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: listingsLoading ? "not-allowed" : "pointer", fontSize: 14,
                    }}
                  >
                    {listingsLoading ? "🔄 取得中..." : "📋 出品一覧を取得"}
                  </button>
                  {replaceList.length > 0 && (
                    <div style={{
                      marginTop: 10, background: "#fef3c7", border: "1px solid #fcd34d",
                      borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400e",
                    }}>
                      ⚠ 入れ替え候補 {replaceList.length}件
                    </div>
                  )}
                </>
              )}

              {/* Phase 8: 週次売れ筋 */}
              {activePhase === 8 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 8 }}>
                    📊 売れ筋リサーチ
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, lineHeight: 1.6 }}>
                    eBayの売れ筋を自動取得するか、TeraﾋﾟｰｸCSVを貼り付けてください。
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 6, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                      KEYWORD
                    </label>
                    <input
                      value={ebayKeyword}
                      onChange={e => setEbayKeyword(e.target.value)}
                      placeholder="空白で全カテゴリ横断検索"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0", boxSizing: "border-box" }}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      setTeraLoading(true);
                      setTeraResults([]);
                      setTeraLog("🔍 eBay売れ筋を自動取得中...");
                      try {
                        const kw = ebayKeyword.trim();
                        const url = kw
                          ? `/api/ebay-sold?keyword=${encodeURIComponent(kw)}&days=30&limit=50`
                          : `/api/ebay-sold?limit=50`;
                        const r = await fetch(url);
                        const data = await r.json();
                        if (data.items?.length > 0) {
                          setTeraLog(`📦 ${data.items.length}件取得 → Yahoo!仕入れ検索中...`);
                          const r2 = await fetch("/api/terapeak-analyze", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ items: data.items }),
                          });
                          const d2 = await r2.json();
                          setTeraResults(d2.results || []);
                          mergeIntoCandidates(d2.results || []);
                          setTeraLog((d2.log || []).join(" / "));
                        } else {
                          setTeraLog("⚠ 売れ筋データが取得できませんでした");
                        }
                      } catch (e) {
                        setTeraLog(`❌ エラー: ${e.message}`);
                      }
                      setTeraLoading(false);
                    }}
                    disabled={teraLoading}
                    style={{
                      width: "100%", padding: "11px 0", marginBottom: 12,
                      background: teraLoading ? "#cbd5e1" : "linear-gradient(135deg, #E53238, #c0392b)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: teraLoading ? "not-allowed" : "pointer", fontSize: 13,
                    }}
                  >
                    {teraLoading ? "🔄 取得中..." : "🛍 eBay売れ筋を自動取得"}
                  </button>
                  <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: 11, marginBottom: 12 }}>— または手動でCSVを貼り付け —</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, lineHeight: 1.6 }}>
                    TeraﾋﾟｰｸCSVを貼り付け
                  </div>
                  <textarea
                    value={teraCSV}
                    onChange={e => setTeraCSV(e.target.value)}
                    placeholder={"タイトル,平均価格,送料,販売数,売上合計,最終販売日\nFigure Name,49.96,13.88,33,1648.68,Jul 12 2026\n..."}
                    rows={8}
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 11,
                      border: "1px solid #e2e8f0", fontFamily: "'DM Mono', monospace",
                      resize: "vertical", marginBottom: 10, boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
                    <button
                      onClick={runTeraAnalysis}
                      disabled={teraLoading || !teraCSV.trim()}
                      style={{
                        flex: 1, padding: "11px 0",
                        background: teraLoading ? "#cbd5e1" : "linear-gradient(135deg, #0ea5e9, #0284c7)",
                        border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                        cursor: (teraLoading || !teraCSV.trim()) ? "not-allowed" : "pointer", fontSize: 14,
                      }}
                    >
                      {teraLoading ? "🔄 分析中..." : "📊 分析"}
                    </button>
                    <button
                      onClick={() => { setTeraCSV(""); setTeraResults([]); setTeraLog(""); }}
                      style={{
                        padding: "11px 14px", border: "1px solid #e2e8f0",
                        borderRadius: 8, background: "#f8fafc", color: "#64748b",
                        cursor: "pointer", fontSize: 13,
                      }}
                    >
                      ✕ クリア
                    </button>
                  </div>
                  {teraResults.length > 0 && (
                    <div style={{
                      marginTop: 10, background: "#e0f2fe", border: "1px solid #7dd3fc",
                      borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#0369a1",
                    }}>
                      ✅ 仕入先発見: {teraResults.filter(r => r.sourcingFound).length}件 / {teraResults.length}件
                    </div>
                  )}
                  <div style={{
                    marginTop: 10, background: candidateList.length >= 100 ? "#d1fae5" : "#f0fdf4",
                    border: `1px solid ${candidateList.length >= 100 ? "#6ee7b7" : "#bbf7d0"}`,
                    borderRadius: 8, padding: "10px 12px", fontSize: 12,
                  }}>
                    <div style={{ fontWeight: 700, color: "#065f46", marginBottom: 4 }}>
                      📌 累積候補リスト
                    </div>
                    <div style={{ color: "#047857", fontSize: 18, fontWeight: 800, fontFamily: "'DM Mono', monospace" }}>
                      {candidateList.length} <span style={{ fontSize: 12, fontWeight: 400 }}>/ 100件</span>
                    </div>
                    <div style={{ height: 6, background: "#d1fae5", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(candidateList.length, 100)}%`, background: "#10b981", borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => setShowCandidates(v => !v)} style={{ flex: 1, padding: "5px 0", fontSize: 11, borderRadius: 6, border: "1px solid #6ee7b7", background: "#fff", color: "#065f46", cursor: "pointer", fontWeight: 600 }}>
                        {showCandidates ? "▲ 閉じる" : "▼ 一覧を見る"}
                      </button>
                      {candidateList.length > 0 && (
                        <button onClick={() => { if (confirm(`候補リスト${candidateList.length}件を全削除しますか？`)) { saveCandidates([]); setCandidateList([]); } }} style={{ padding: "5px 8px", fontSize: 11, borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", cursor: "pointer" }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Coming soon phases */}
              {[5, 6, 7].includes(activePhase) && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🚧</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>準備中</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>近日対応予定</div>
                </div>
              )}
            </div>

            {/* Platform Navigation */}
            <div style={{
              background: "#ffffff", border: "1px solid #e2e8f0",
              borderRadius: 16, padding: 16, boxShadow: "0 1px 4px #0000000a",
            }}>
              {PLATFORM_GROUPS.map((group, gi) => (
                <div key={gi} style={{ marginBottom: gi < PLATFORM_GROUPS.length - 1 ? 16 : 0 }}>
                  <div style={{
                    fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace",
                    letterSpacing: 1, marginBottom: 8, paddingBottom: 6,
                    borderBottom: "1px solid #f1f5f9",
                  }}>
                    {group.label}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: group.platforms.length === 1 ? "1fr" : "1fr 1fr", gap: 6 }}>
                    {group.platforms.map(p => (
                      <button
                        key={p.phase}
                        onClick={() => p.ready && setActivePhase(p.phase)}
                        style={{
                          padding: "8px 10px", borderRadius: 8, border: "none",
                          cursor: p.ready ? "pointer" : "not-allowed",
                          background: activePhase === p.phase
                            ? p.color + "22"
                            : p.ready ? "#f8fafc" : "#f1f5f9",
                          boxShadow: activePhase === p.phase ? `inset 0 0 0 1.5px ${p.color}` : "inset 0 0 0 1px #e2e8f0",
                          textAlign: "left", position: "relative", overflow: "hidden",
                          opacity: p.ready ? 1 : 0.6,
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ fontSize: 14, marginBottom: 2 }}>{p.icon}</div>
                        <div style={{
                          fontSize: 11, fontWeight: 700,
                          color: activePhase === p.phase ? p.color : p.ready ? "#374151" : "#9ca3af",
                        }}>
                          {p.label}
                        </div>
                        {!p.ready && (
                          <div style={{
                            fontSize: 9, color: "#9ca3af", fontFamily: "'DM Mono', monospace",
                            letterSpacing: 0.5,
                          }}>
                            準備中
                          </div>
                        )}
                        {p.ready && activePhase === p.phase && (
                          <div style={{
                            position: "absolute", top: 4, right: 6,
                            width: 6, height: 6, borderRadius: "50%",
                            background: p.color,
                          }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>}{/* end LEFT SIDEBAR (PC) */}

          {/* モバイル: 検索フォーム（全幅） */}
          {isMobile && (
            <div style={{
              width: "100%", background: "#ffffff", border: "1px solid #e2e8f0",
              borderRadius: 16, padding: 16, boxShadow: "0 1px 4px #0000000a",
            }}>
              {activePhase === 1 && (
                <>
                  <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && runRakutenSearch()}
                    placeholder="例：アニメフィギュア、電気ケトル..."
                    style={{
                      width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
                      borderRadius: 8, padding: "10px 14px", color: "#1e293b",
                      fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 10,
                    }}
                  />
                  <button
                    onClick={runRakutenSearch}
                    disabled={loading || !keyword.trim()}
                    style={{
                      width: "100%", padding: "11px 0",
                      background: loading ? "#cbd5e1" : "linear-gradient(135deg, #720E9E, #9333ea)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
                    }}
                  >
                    {loading ? "🔄 検索中..." : "🔍 リサーチ開始"}
                  </button>
                </>
              )}
              {activePhase === 2 && (
                <>
                  <select
                    onChange={e => { if (e.target.value) setEbayKeyword(e.target.value); }}
                    defaultValue=""
                    style={{
                      width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
                      borderRadius: 8, padding: "10px 14px", color: "#1e293b",
                      fontSize: 13, boxSizing: "border-box", outline: "none",
                      cursor: "pointer", marginBottom: 8,
                    }}
                  >
                    <option value="">── カテゴリを選択 ──</option>
                    {EBAY_PRESETS.map((p, i) =>
                      p.keyword
                        ? <option key={i} value={p.keyword}>{p.label}</option>
                        : <option key={i} value="" disabled style={{ color: "#94a3b8" }}>{p.label}</option>
                    )}
                  </select>
                  <input
                    value={ebayKeyword}
                    onChange={e => setEbayKeyword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && runResearch()}
                    placeholder="または英語で直接入力..."
                    style={{
                      width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
                      borderRadius: 8, padding: "10px 14px", color: "#1e293b",
                      fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 10,
                    }}
                  />
                  <button
                    onClick={runResearch}
                    disabled={loading || !ebayKeyword.trim()}
                    style={{
                      width: "100%", padding: "11px 0",
                      background: loading ? "#cbd5e1" : "linear-gradient(135deg, #E53238, #c0392b)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
                    }}
                  >
                    {loading ? "🔄 リサーチ中..." : "🛍 リサーチ開始"}
                  </button>
                </>
              )}
              {activePhase === 3 && (
                <>
                  <input
                    value={yahooAuctionKeyword}
                    onChange={e => setYahooAuctionKeyword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && runYahooAuctionSearch()}
                    placeholder="例：アニメフィギュア、ゲーム..."
                    style={{
                      width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
                      borderRadius: 8, padding: "10px 14px", color: "#1e293b",
                      fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 10,
                    }}
                  />
                  <button
                    onClick={runYahooAuctionSearch}
                    disabled={loading || !yahooAuctionKeyword.trim()}
                    style={{
                      width: "100%", padding: "11px 0",
                      background: loading ? "#cbd5e1" : "linear-gradient(135deg, #720E9E, #9333ea)",
                      border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer", fontSize: 14,
                    }}
                  >
                    {loading ? "🔄 検索中..." : "🔨 ヤフオク検索"}
                  </button>
                </>
              )}
              {activePhase === 4 && (
                <button
                  onClick={async () => {
                    setListingsLoading(true);
                    setListingsLog("🔍 eBay出品一覧を取得中...");
                    try {
                      const res = await fetch("/api/ebay-listings");
                      const data = await res.json();
                      if (data.error) {
                        setListingsLog(`❌ エラー: ${data.error}`);
                      } else {
                        setMyListings(data.items || []);
                        setListingsLog(`✅ ${data.total}件の出品中商品を取得`);
                      }
                    } catch (e) {
                      setListingsLog(`❌ ${e.message}`);
                    }
                    setListingsLoading(false);
                  }}
                  disabled={listingsLoading}
                  style={{
                    width: "100%", padding: "11px 0",
                    background: listingsLoading ? "#cbd5e1" : "linear-gradient(135deg, #10b981, #0d9488)",
                    border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
                    cursor: listingsLoading ? "not-allowed" : "pointer", fontSize: 14,
                  }}
                >
                  {listingsLoading ? "🔄 取得中..." : "📋 出品一覧を取得"}
                </button>
              )}
              {[5, 6, 7].includes(activePhase) && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "10px 0" }}>🚧 準備中</div>
              )}
            </div>
          )}

          {/* RIGHT CONTENT */}
          <div style={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : undefined }}>

        {/* PHASE 1: Yahoo仕入れリサーチ */}
        {activePhase === 1 && (
          <>
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
                  <ResultRow key={i} item={item} index={i} isMobile={isMobile} />
                ))}
              </div>
            )}

            {results.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#cbd5e1" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>キーワードを入力してリサーチを開始してください</div>
                <div style={{ fontSize: 12, marginTop: 8, color: "#cbd5e1" }}>
                  Yahoo!ショッピングから仕入れ候補を検索 → 利益計算 → 世界ポケットに登録
                </div>
              </div>
            )}
          </>
        )}

        {/* PHASE 3: ヤフオク仕入れ */}
        {activePhase === 3 && (
          <>
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

        {/* PHASE 2: eBay→Yahoo!リサーチ */}
        {activePhase === 2 && (
          <>
            {/* セラー分析モード */}
            {ebayMode === "seller" && (
              <>
                {sellerLog && (
                  <div style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                    {sellerLog}
                  </div>
                )}
                {/* ビュー切替タブ */}
                {(sellerResults.length > 0 || japanItems.length > 0) && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[
                      { id: "sellers", label: `👤 日本人セラー (${sellerResults.length}人)` },
                      { id: "japan",   label: `🗾 日本からの出品 (${japanItems.length}件)` },
                    ].map(v => (
                      <button key={v.id} onClick={() => setSellerView(v.id)} style={{
                        flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                        background: sellerView === v.id ? "#1e293b" : "#f1f5f9",
                        color: sellerView === v.id ? "#f1f5f9" : "#64748b",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}>{v.label}</button>
                    ))}
                  </div>
                )}

                {/* 日本からの出品フラット一覧 */}
                {sellerView === "japan" && japanItems.length > 0 && (
                  <div>
                    <div style={{ color: "#64748b", fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>
                      {japanItems.filter(i => i.sourcingFound).length} SOURCED / {japanItems.length} ITEMS — 日本発送・全セラー
                    </div>
                    {japanItems.map((item, i) => (
                      <ResearchRow key={i} item={item} index={i} isMobile={isMobile} />
                    ))}
                  </div>
                )}
                {sellerView === "japan" && japanItems.length === 0 && !loading && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>分析中またはデータなし</div>
                )}

                {/* セラー別分析 */}
                {sellerView === "sellers" && sellerResults.map((seller, si) => (
                  <div key={si} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, marginBottom: 16, overflow: "hidden", boxShadow: "0 1px 4px #0000000a" }}>
                    {/* セラーヘッダー */}
                    <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 15 }}>👤 {seller.name}</div>
                        <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
                          フィードバック {seller.feedbackScore?.toLocaleString()} ({seller.feedbackPct}%) ／ 出品 {seller.listingCount}件
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <a href={seller.ebayStoreUrl} target="_blank" rel="noreferrer" style={{ background: "#E5323822", border: "1px solid #E5323844", borderRadius: 8, padding: "6px 12px", color: "#fca5a5", textDecoration: "none", fontSize: 12 }}>
                          🛍 ストアを見る
                        </a>
                      </div>
                    </div>
                    {/* 出品サンプル */}
                    {(seller.sampleItems || []).length > 0 && (
                      <div style={{ padding: "10px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>出品サンプル</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {(seller.sampleItems || []).map((s, i) => (
                            <a key={i} href={s.itemUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#475569", display: "flex", gap: 6, alignItems: "center" }}>
                              {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4 }} />}
                              <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                              <span style={{ color: "#E53238", fontWeight: 700, whiteSpace: "nowrap" }}>${s.price}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 現在の出品一覧 */}
                    <div style={{ padding: "12px 18px" }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>現在の出品 ({seller.activeListings.length}件) — クリックで利益詳細</div>
                      {seller.activeListings.length === 0 && (
                        <div style={{ color: "#cbd5e1", fontSize: 12 }}>現在の出品なし</div>
                      )}
                      {seller.activeListings.map((item, li) => {
                        const statusColor = item.sourcingFound
                          ? (item.profitRate >= 25 ? "#10b981" : item.profitRate >= 0 ? "#f59e0b" : "#ef4444")
                          : "#94a3b8";
                        return (
                          <ResearchRow key={li} item={item} index={li} isMobile={isMobile} />
                        );
                      })}
                    </div>
                  </div>
                ))}
                {sellerResults.length === 0 && japanItems.length === 0 && !loading && (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "#cbd5e1" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
                    <div style={{ fontSize: 14, color: "#94a3b8" }}>日本人セラー分析 ＆ 日本からの出品を一括リサーチ</div>
                    <div style={{ fontSize: 12, marginTop: 8, color: "#cbd5e1", lineHeight: 1.8 }}>
                      カテゴリを選んでセラー分析を開始してください<br />
                      👤 日本人セラー別の出品戦略 ／ 🗾 日本発送の全出品物
                    </div>
                  </div>
                )}
              </>
            )}

            {/* キーワード検索モード */}
            {ebayMode === "keyword" && <>
            {researchLog && (
              <div style={{
                background: "#f1f5f9", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "10px 16px", marginBottom: 16,
                color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace",
              }}>
                {researchLog}
              </div>
            )}

            {researchResults.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ color: "#64748b", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                    {researchResults.filter(r => r.sourcingFound).length} SOURCED / {researchResults.length} ITEMS
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 11, color: "#10b981" }}>● 仕入先あり</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>● 仕入先なし（無在庫候補）</span>
                  </div>
                </div>
                {researchResults.map((item, i) => (
                  <ResearchRow key={i} item={item} index={i} isMobile={isMobile} />
                ))}
              </div>
            )}

            {researchResults.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#cbd5e1" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🛍</div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>eBay売れ筋 → Yahoo!仕入れ先を自動リサーチ</div>
                <div style={{ fontSize: 12, marginTop: 8, color: "#cbd5e1", lineHeight: 1.8 }}>
                  ① eBayで実際に売れている商品を発見<br />
                  ② Yahoo!Japanで仕入れ先を逆引き検索<br />
                  ③ 利益率付きで一覧表示
                </div>
              </div>
            )}
            </>}
          </>
        )}
        {/* PHASE 4: 回転管理 */}
        {activePhase === 4 && (
          <>
            {listingsLog && (
              <div style={{
                background: "#f1f5f9", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "10px 16px", marginBottom: 16,
                color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace",
              }}>
                {listingsLog}
              </div>
            )}

            {replaceList.length > 0 && (
              <div style={{
                background: "#fff7ed", border: "1px solid #fed7aa",
                borderRadius: 12, padding: 16, marginBottom: 16,
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 10 }}>
                  ⚠ 入れ替え候補（{replaceList.length}件）— 売れ行き不振
                </div>
                {replaceList.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "#ffffff", borderRadius: 8, padding: "8px 12px",
                    marginBottom: 6, border: "1px solid #fed7aa", fontSize: 12,
                  }}>
                    <div style={{ flex: 1, color: "#1e293b" }}>{item.title}</div>
                    <div style={{ color: "#ef4444", fontWeight: 700, marginLeft: 12 }}>{item.daysListed}日出品中</div>
                    {item.viewUrl && (
                      <a href={item.viewUrl} target="_blank" rel="noreferrer" style={{
                        marginLeft: 12, color: "#E53238", fontSize: 11, textDecoration: "none",
                      }}>eBayで見る →</a>
                    )}
                    <button
                      onClick={() => setReplaceList(r => r.filter((_, j) => j !== i))}
                      style={{
                        marginLeft: 8, background: "none", border: "none",
                        color: "#94a3b8", cursor: "pointer", fontSize: 14,
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {myListings.length > 0 && (
              <div>
                <div style={{ color: "#64748b", fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>
                  {myListings.length} ITEMS — 長期出品順（要入れ替え検出）
                </div>
                {myListings.map((item, i) => {
                  const isStale = item.daysListed >= 30;
                  const inReplaceList = replaceList.some(r => r.itemId === item.itemId);
                  return (
                    <div key={i} style={{
                      background: "#ffffff",
                      border: `1px solid ${isStale ? "#fed7aa" : "#e2e8f0"}`,
                      borderRadius: 12, marginBottom: 10, padding: "14px 16px",
                      boxShadow: "0 1px 3px #0000000a",
                      display: "grid", gridTemplateColumns: "32px 60px 1fr auto auto auto auto",
                      gap: 12, alignItems: "center",
                    }}>
                      <span style={{ color: "#cbd5e1", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: 52, height: 52, background: "#f0fdf4", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
                      )}
                      <div>
                        <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                          {item.title}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {isStale && <Tag label={`⚠ ${item.daysListed}日出品中`} color="#f59e0b" />}
                          {!isStale && <Tag label={`${item.daysListed}日`} color="#10b981" />}
                          {item.watchCount > 0 && <Tag label={`👁 ${item.watchCount}件ウォッチ`} color="#6366f1" />}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#10b981", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                          ${item.price?.toFixed(2)}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 11 }}>出品価格</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#6366f1", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                          {item.hitCount || 0}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 11 }}>ページビュー</div>
                      </div>
                      {item.viewUrl && (
                        <a href={item.viewUrl} target="_blank" rel="noreferrer" style={{
                          background: "#E5323811", border: "1px solid #E5323833",
                          borderRadius: 6, padding: "6px 10px", color: "#E53238",
                          textDecoration: "none", fontSize: 11, whiteSpace: "nowrap",
                        }}>eBayで見る</a>
                      )}
                      <button
                        onClick={() => {
                          if (inReplaceList) {
                            setReplaceList(r => r.filter(x => x.itemId !== item.itemId));
                          } else {
                            setReplaceList(r => [...r, item]);
                          }
                        }}
                        style={{
                          background: inReplaceList ? "#fef3c7" : isStale ? "#fff7ed" : "#f8fafc",
                          border: `1px solid ${inReplaceList ? "#fcd34d" : isStale ? "#fed7aa" : "#e2e8f0"}`,
                          borderRadius: 6, padding: "6px 10px",
                          color: inReplaceList ? "#92400e" : isStale ? "#d97706" : "#94a3b8",
                          cursor: "pointer", fontSize: 11, whiteSpace: "nowrap",
                        }}
                      >
                        {inReplaceList ? "✓ 候補済み" : "入れ替え候補"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {myListings.length === 0 && !listingsLoading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#cbd5e1" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>「出品一覧を取得」ボタンでeBayの出品商品を表示</div>
                <div style={{ fontSize: 12, marginTop: 8, color: "#cbd5e1" }}>
                  30日以上売れていない商品を検出 → 入れ替え候補に追加
                </div>
              </div>
            )}
          </>
        )}

        {/* PHASE 8: 週次売れ筋 */}
        {activePhase === 8 && (
          <>
            {/* 候補リストパネル */}
            {showCandidates && candidateList.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #6ee7b7", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: "#065f46", fontSize: 14 }}>
                    📌 累積候補リスト — {candidateList.length}件 / 100件目標
                  </div>
                  <button
                    onClick={() => {
                      const text = candidateList.map((c, i) =>
                        `【${i + 1}】${c.ebayTitle}\n仕入先: ${c.bestUrl}\n仕入値: ¥${c.bestPrice?.toLocaleString()} / eBay: $${c.ebayPrice} / 利益率: ${c.profitRate}%\n追加日: ${c.addedAt}\n`
                      ).join("\n");
                      navigator.clipboard.writeText(text);
                      alert(`✅ ${candidateList.length}件をコピーしました`);
                    }}
                    style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    📋 全件コピー
                  </button>
                </div>
                {candidateList.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0fdf4" }}>
                    <span style={{ color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: 11, width: 24, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.ebayTitle}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: "#64748b" }}>eBay ${c.ebayPrice}</span>
                        <span style={{ fontSize: 11, color: "#0ea5e9" }}>仕入 ¥{c.bestPrice?.toLocaleString()}</span>
                        <span style={{ fontSize: 11, color: c.addedAt }}>追加 {c.addedAt}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: c.profitRate >= 30 ? "#10b981" : c.profitRate >= 0 ? "#d97706" : "#dc2626", fontFamily: "'DM Mono', monospace" }}>{c.profitRate}%</div>
                    </div>
                    {c.bestUrl && (
                      <button onClick={() => navigator.clipboard.writeText(c.bestUrl)} style={{ fontSize: 10, padding: "2px 6px", border: "1px solid #e2e8f0", borderRadius: 4, background: "#f8fafc", cursor: "pointer", color: "#64748b", whiteSpace: "nowrap" }}>URLコピー</button>
                    )}
                    <button onClick={() => { const updated = candidateList.filter((_, j) => j !== i); saveCandidates(updated); setCandidateList(updated); }} style={{ fontSize: 12, padding: "2px 6px", border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {teraLog && (
              <div style={{
                background: "#f0f9ff", border: "1px solid #bae6fd",
                borderRadius: 8, padding: "10px 16px", marginBottom: 16,
                color: "#0369a1", fontSize: 12, fontFamily: "'DM Mono', monospace",
              }}>
                {teraLog}
              </div>
            )}
            {teraResults.length > 0 ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ color: "#64748b", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                    {teraResults.length} ITEMS — 利益率高い順
                  </div>
                  <button
                    onClick={() => {
                      const profitable = teraResults.filter(r => r.sourcingFound && r.profitRate >= 0);
                      const text = profitable.map((r, i) =>
                        `【${i + 1}】${r.ebayTitle}\n仕入先: ${r.bestUrl}\n仕入値: ¥${r.bestPrice?.toLocaleString()} / eBay: $${r.ebayPrice} / 利益率: ${r.profitRate}%\n販売数: ${r.ebaySales}件\n`
                      ).join("\n");
                      navigator.clipboard.writeText(text);
                      alert(`✅ ${profitable.length}件をコピーしました`);
                    }}
                    style={{
                      background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                      color: "#fff", border: "none", borderRadius: 8,
                      padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    📋 SekaiPocket入力リストをコピー
                  </button>
                </div>
                {teraResults.map((item, i) => {
                  const hasSourcing = item.sourcingFound;
                  return (
                    <div key={i} style={{
                      background: "#fff",
                      border: `1px solid ${hasSourcing ? "#bfdbfe" : "#e2e8f0"}`,
                      borderRadius: 12, marginBottom: 10, padding: "14px 16px",
                      boxShadow: "0 1px 3px #0000000a",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                            {item.ebayTitle}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={{ background: "#fef2f2", color: "#b91c1c", fontSize: 11, padding: "2px 8px", borderRadius: 4, fontFamily: "'DM Mono', monospace" }}>
                              eBay ${item.ebayPrice}
                            </span>
                            <span style={{ background: "#f0fdf4", color: "#15803d", fontSize: 11, padding: "2px 8px", borderRadius: 4, fontFamily: "'DM Mono', monospace" }}>
                              販売数 {item.ebaySales}件
                            </span>
                            {item.jaKeyword && (
                              <span style={{ background: "#f8fafc", color: "#64748b", fontSize: 11, padding: "2px 8px", borderRadius: 4, fontFamily: "'DM Mono', monospace" }}>
                                🔑 {item.jaKeyword}
                              </span>
                            )}
                          </div>
                          {hasSourcing && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                              {item.bestSource === "yahoo" && item.yahooUrl && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ background: "#720E9E", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>Yahoo!</span>
                                  <a href={item.yahooUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0369a1" }}>
                                    ¥{item.bestPrice?.toLocaleString()} — {item.yahooName}
                                  </a>
                                  <button onClick={() => navigator.clipboard.writeText(item.yahooUrl)} style={{ fontSize: 10, padding: "1px 6px", border: "1px solid #e2e8f0", borderRadius: 4, background: "#f8fafc", cursor: "pointer", color: "#64748b" }}>URLコピー</button>
                                </div>
                              )}
                              {item.bestSource === "amazon" && item.amazonUrl && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ background: "#FF9900", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>Amazon</span>
                                  <a href={item.amazonUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0369a1" }}>
                                    ¥{item.bestPrice?.toLocaleString()} — {item.amazonName}
                                  </a>
                                  {item.amazonAsin && (
                                    <button onClick={() => navigator.clipboard.writeText(item.amazonAsin)} style={{ fontSize: 10, padding: "1px 6px", border: "1px solid #fed7aa", borderRadius: 4, background: "#fff7ed", cursor: "pointer", color: "#92400e", fontWeight: 700 }}>ASIN: {item.amazonAsin}</button>
                                  )}
                                </div>
                              )}
                              {item.yahooPrice && item.amazonPrice && (
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                  Yahoo! ¥{item.yahooPrice?.toLocaleString()} / Amazon ¥{item.amazonPrice?.toLocaleString()} → 最安を選択
                                </div>
                              )}
                            </div>
                          )}
                          {!hasSourcing && (
                            <div style={{ fontSize: 12, color: "#94a3b8" }}>仕入先見つからず</div>
                          )}
                        </div>
                        {hasSourcing && item.profitRate !== null && (
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{
                              fontSize: 20, fontWeight: 800,
                              color: item.profitRate >= 30 ? "#16a34a" : item.profitRate >= 0 ? "#d97706" : "#dc2626",
                              fontFamily: "'DM Mono', monospace",
                            }}>
                              {item.profitRate}%
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                              ¥{item.profitJpy?.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !teraLoading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#cbd5e1" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>左のフォームにTeraﾋﾟｰｸのCSVデータを貼り付けてください</div>
                <div style={{ fontSize: 12, marginTop: 8, color: "#cbd5e1" }}>
                  eBay Seller Hub → 製品の調査 → CSVをコピー＆ペースト
                </div>
              </div>
            )}
          </>
        )}

          </div>{/* end RIGHT CONTENT */}
        </div>{/* end flex row */}
      </div>
    </div>
  );
}
