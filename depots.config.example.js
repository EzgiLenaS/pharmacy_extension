// depots.config.example.js
// Bu dosya, yerel konfigürasyon için örnek olarak hazırlanmıştır.
// Gerçek projede:
//   1) Bu dosyayı kopyalayıp "depots.config.local.js" ismiyle kaydedin.
//   2) Kendi ecza depolarınızın host, path ve seçicilerini doldurun.
//   3) .gitignore içinde depots.config.local.js zaten ekli olduğu için
//      bu yerel yapılandırma GitHub'a gönderilmeyecektir.

const DEPOT_SITES = [
  {
    // Örnek depo
    host: "example-depot.com",
    pathMatch: (path) =>
      path.toLowerCase().includes("/some/path"),
    selectors: {
      input: "#search",
      button: "button[type='submit']",
    },
    customSubmit(inputEl, buttonEl) {
      if (buttonEl) {
        buttonEl.click();
        return true;
      }
      return false;
    },
  },
];

// content.js buradan çağıracak
function getDepotConfig(host, path) {
  host = host.replace(/^www\./, "").toLowerCase();
  path = (path || "").toLowerCase();

  return (
    DEPOT_SITES.find(
      (site) =>
        site.host.toLowerCase() === host && site.pathMatch(path)
    ) || null
  );
}
