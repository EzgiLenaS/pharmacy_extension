(() => {
    // let overlay, nextBtn, infoEl;
    let running = false;
    let currentHost;
    let currentDepotConfig = null; // Aktif sitenin konfigürasyonu

    function status(text) {
        try {
            chrome.runtime.sendMessage({ type: "STATUS", text });
        } catch (e) {}
    }

    function guessSelectors() {
        // Bilinmeyen siteler için genel tahminler
        const candidates = [
            "input[type='search']",
            "input[name='search']",
            "input[placeholder*='ara' i]",
            "input[placeholder*='arama' i]",
            "input[name='q']",
            "input[type='text']"
        ];

        const btns = [
            "button[type='submit']",
            "input[type='submit']",
            "button[aria-label*='ara' i]",
            "button:has(svg)"
        ];

        return { input: candidates.join(","), button: btns.join(",") };
    }

    function setInputValue(el, value) {
        el.focus();
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function clickElement(el) {
        el.click();
    }

    async function step() {
        const { codes = [], index = 0, running: runFlag = false } =
            await chrome.storage.local.get(["codes", "index", "running"]);
        running = runFlag;
        if (!running) {
            status("Durdu (çalışmıyor).");
            return;
        }
        if (!codes.length) {
            status("Kod listesi boş.");
            return;
        }
        if (index >= codes.length) {
            status("Tüm kodlar bitti.");
            return;
        }

        const code = codes[index];
        status(`(${index + 1}/${codes.length}) Kod: ${code}`);

        // Site konfigürasyonunu al (önce depot config, yoksa genel tahminler)
        const sels =
            typeof getSiteConfig === "function"
                ? getSiteConfig()
                : guessSelectors();

        // Boş seçici koruması + doğru input seçimi
        let input = null;
        if (sels.input && sels.input.trim()) {
            const list = document.querySelectorAll(sels.input);
            // Özellikle bazı sitelerde birden fazla arama kutusu olabilir.
            // Genel mantık: id'si txtIlcArama olanı varsa onu, yoksa ilkini al.
            input =
                Array.from(list).find((el) => el.id === "txtIlcArama") ||
                list[0] ||
                null;
        }

        let button = null;
        if (
            sels.button &&
            typeof sels.button === "string" &&
            sels.button.trim().length
        ) {
            button = document.querySelector(sels.button);
        }

        if (!input) {
            status(
                `Arama kutusu bulunamadı: ${location.host} — seçici yapılandırması gerekli.`
            );
            return;
        }

        // Arama filtresi otomatik seçimi (opsiyonel, varsa)
        const tumu = document.querySelector(
            "input[name='search_itemscope'][value='0']"
        );
        if (tumu && !tumu.checked) tumu.click();

        const iceren = document.getElementById("iceren");
        if (iceren && !iceren.checked) iceren.click();

        // Arama kutusuna yaz
        setInputValue(input, code);

        // Aramayı tetikle (buton varsa tıkla; yoksa Enter → form.submit)
        submitSearch(input, button);

        // Küçük bekleme, sonra index ilerlet
        setTimeout(async () => {
            const newIndex = index + 1;
            await chrome.storage.local.set({ index: newIndex });
            status(
                `Aratıldı: ${code}. Sıradaki: ${Math.min(
                    newIndex + 1,
                    codes.length
                )}/${codes.length}.`
            );
        }, 200);
    }

    function submitSearch(inputEl, buttonEl) {
        // 1) Eğer aktif depo için özel submit tanımı varsa önce onu dene
        if (
            currentDepotConfig &&
            typeof currentDepotConfig.customSubmit === "function"
        ) {
            const handled = currentDepotConfig.customSubmit(inputEl, buttonEl);
            if (handled) return;
        }

        // 2) Genel davranış: buton → Enter → form submit

        if (buttonEl) {
            buttonEl.click();
            return;
        }

        // Enter fallback
        inputEl.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                bubbles: true
            })
        );
        inputEl.dispatchEvent(
            new KeyboardEvent("keyup", {
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                bubbles: true
            })
        );

        // Form submit fallback
        const form = inputEl.closest("form");
        if (form) form.submit();
    }

    function getSiteConfig() {
        const host = location.host.replace(/^www\./, "");
        const path = location.pathname || "";

        currentHost = host;

        // depots.config.local.js veya depots.config.example.js içindeki fonksiyon tanımlıysa onu kullan
        if (typeof getDepotConfig === "function") {
            const cfg = getDepotConfig(host, path);
            if (cfg && cfg.selectors) {
                currentDepotConfig = cfg; // submitSearch için saklıyoruz
                return cfg.selectors;
            }
        }

        // Bilinmeyen site → genel tahminler
        currentDepotConfig = null;
        return guessSelectors();
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type === "START") {
            running = true;
            status(
                "Başlatıldı. “Sonraki Kod →” ile aratabilirsiniz."
            );
        } else if (msg?.type === "STOP") {
            running = false;
            status("Durduruldu.");
        } else if (msg?.type === "STEP") {
            step();
        }
    });

    // Sayfa yenilense de çalışma durumunu geri yükle
    (async function autoBoot() {
        const { running: wasRunning = false } =
            await chrome.storage.local.get(["running"]);
        running = wasRunning;
        if (running) {
            status(
                "Hazır. “Sonraki Kod →” ile aratabilirsiniz."
            );
        }
    })();
})();
