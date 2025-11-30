const ta = document.getElementById("codes");
const statusEl = document.getElementById("status");

async function refresh() {
    const { codes = [], index = 0, running = false } = await chrome.storage.local.get(["codes", "index", "running"]);
    ta.value = codes.join("\n");
    statusEl.textContent = `Toplam: ${codes.length} | Sıradaki: ${index+1} | Durum: ${running ? "Çalışıyor" : "Durdu"}`;
}
refresh();

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "STATUS" && statusEl) {
    statusEl.textContent = msg.text;
  }
});

document.getElementById("save").addEventListener("click", async () => {
    const lines = ta.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    await chrome.storage.local.set({ codes: lines, index: 0 });
    statusEl.textContent = `Kaydedildi. Toplam ${lines.length} kod.`;
});

document.getElementById("clear").addEventListener("click", async () => {
    await chrome.storage.local.set({ codes: [], index: 0, running: false });
    statusEl.textContent = "Temizlendi.";
    ta.value = "";
});

document.getElementById("start").addEventListener("click", async () => {
    await chrome.storage.local.set({ running: true });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
        try { await chrome.tabs.sendMessage(tab.id, { type: "START" }); } catch {}
        statusEl.textContent = "Başlatıldı.";
    }
    else {
        statusEl.textContent = "Aktif sekme bulunamadı."
    }
});

document.getElementById("next").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "STEP" });
      statusEl.textContent = "Sonraki kod gönderildi.";
    } catch (e) {
      statusEl.textContent = "İçerik betiği bulunamadı. Sayfayı yenileyip tekrar deneyin.";
    }
  }
});

document.getElementById("stop").addEventListener("click", async () => {
    await chrome.storage.local.set({ running: false });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
        try { await chrome.tabs.sendMessage(tab.id, { type: "STOP" }); } catch {}
    }
    statusEl.textContent = "Durduruldu";
});

// popup.js
document.getElementById("readClipboardBtn").addEventListener("click", async () => {
  try {
    // Kullanıcı tıklaması → gesture var
    const text = await navigator.clipboard.readText();
    document.getElementById("codes").value = text || "";
    // burada istersen parse edip storage'a kaydedebilirsin
    await chrome.storage.local.set({ codesText: text || "" });
  } catch (e) {
    alert("Panodan okuma izni verilmedi ya da pano boş.");
    console.error(e);
  }
});

chrome.storage.onChanged.addListener(refresh);
