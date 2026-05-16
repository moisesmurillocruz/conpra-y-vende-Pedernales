const installButton = document.querySelector("#installButton");
const installStatus = document.querySelector("#installStatus");

let deferredInstallPrompt = null;

const setInstallState = (message, enabled = false) => {
  installStatus.textContent = message;
  installButton.disabled = !enabled;
};

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  setInstallState("Listo. Toca el boton para descargar la app.", true);
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    setInstallState('Abre el menu del navegador y elige "Agregar a pantalla principal".');
    return;
  }

  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;

  if (choice.outcome === "accepted") {
    setInstallState("Instalacion iniciada. Revisa tu pantalla principal.");
  } else {
    setInstallState("Puedes intentar descargarla de nuevo cuando quieras.");
  }
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  setInstallState("App instalada correctamente.");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch {
      setInstallState("No se pudo preparar la app offline. Intenta recargar.");
    }
  });
} else {
  setInstallState('Tu navegador no instala PWAs. Usa "Agregar a pantalla principal".');
}

setInstallState('Si el boton no se activa, usa "Agregar a pantalla principal" en el menu.');
