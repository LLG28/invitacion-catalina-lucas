const welcome = document.querySelector("#welcome");
const invitation = document.querySelector("#invitation");
const envelope = document.querySelector("#openInvitation");
const openLabel = document.querySelector("#openLabel");
const accessGate = document.querySelector("#accessGate");
const accessForm = document.querySelector("#accessForm");
const accessError = document.querySelector("#accessError");
const accessCode = document.querySelector("#accessCode");
const guestGreeting = document.querySelector("#guestGreeting");
const guestPasses = document.querySelector("#guestPasses");

const ACCESS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyawLCMjaiokN4PChH_KcH7JxxOI6fUTaMLXUY5noxDFu4vZJ2pTZNdeBHPAsuBF5_H/exec";
// Acceso por código temporalmente desactivado. Cambiar a true para reactivarlo.
const ACCESS_ENABLED = false;

if (ACCESS_ENABLED) {
  accessGate.hidden = false;
}

function authorizeGuest(guest = {}) {
  const name = String(guest.nombre || "").trim();
  const passes = Math.max(1, Number(guest.cupos) || 2);
  const code = String(guest.codigo || "").trim();

  guestGreeting.textContent = name ? `Bienvenido/a, ${name}` : "";
  guestPasses.textContent = `${passes} ${passes === 1 ? "lugar" : "lugares"}`;
  accessGate.classList.add("authorized");
  accessGate.setAttribute("aria-hidden", "true");
  sessionStorage.setItem(
    "wedding-access",
    JSON.stringify({ nombre: name, cupos: passes, codigo: code }),
  );
}

function validateAccessCode(code) {
  return new Promise((resolve, reject) => {
    const callbackName = `weddingAccess_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("No pudimos validar el código. Intenta nuevamente."));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }

    window[callbackName] = (response) => {
      cleanup();
      resolve(response);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("No pudimos conectar con el servicio de invitaciones."));
    };

    const params = new URLSearchParams({
      action: "validate",
      codigo: code,
      callback: callbackName,
    });
    script.src = `${ACCESS_ENDPOINT}?${params.toString()}`;
    document.head.appendChild(script);
  });
}

if (!ACCESS_ENABLED) {
  authorizeGuest();
} else {
  try {
    const savedGuest = JSON.parse(sessionStorage.getItem("wedding-access"));
    if (savedGuest) authorizeGuest(savedGuest);
  } catch {
    sessionStorage.removeItem("wedding-access");
  }
}

accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = accessForm.querySelector("[type='submit']");
  const code = accessCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  accessError.textContent = "";
  button.disabled = true;
  button.textContent = "Validando...";

  try {
    const result = await validateAccessCode(code);
    if (!result || !result.ok) {
      throw new Error("El código no es válido o está desactivado.");
    }
    authorizeGuest(result);
  } catch (error) {
    accessError.textContent = error.message;
    accessCode.select();
  } finally {
    button.disabled = false;
    button.textContent = "Continuar";
  }
});

function openInvitation() {
  if (envelope.classList.contains("is-opening")) return;

  envelope.classList.add("is-opening");
  window.setTimeout(() => {
    welcome.classList.add("opened");
    invitation.classList.add("visible");
    invitation.setAttribute("aria-hidden", "false");
    document.body.classList.remove("locked");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, 1050);
}

envelope.addEventListener("click", openInvitation);
openLabel.addEventListener("click", openInvitation);

const weddingDate = new Date("2026-10-31T18:00:00-03:00").getTime();

function updateCountdown() {
  const distance = Math.max(0, weddingDate - Date.now());
  const values = {
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance % 86400000) / 3600000),
    minutes: Math.floor((distance % 3600000) / 60000),
    seconds: Math.floor((distance % 60000) / 1000),
  };

  Object.entries(values).forEach(([id, value]) => {
    const digits = id === "days" ? 3 : 2;
    document.querySelector(`#${id}`).textContent = String(value).padStart(digits, "0");
  });
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 },
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

const bankDetails = document.querySelector("#bankDetails");
document.querySelector("#showBank").addEventListener("click", () => {
  bankDetails.classList.add("visible");
  bankDetails.setAttribute("aria-hidden", "false");
});

document.querySelector("#closeBank").addEventListener("click", () => {
  bankDetails.classList.remove("visible");
  bankDetails.setAttribute("aria-hidden", "true");
});

document.querySelector(".copy-data").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = "Datos copiados ✓";
  } catch {
    button.textContent = button.dataset.copy;
  }
});

const rsvpForm = document.querySelector("#rsvpForm");
const formSuccess = document.querySelector("#formSuccess");

// Pega aquí la URL /exec obtenida al desplegar google-apps-script.gs.
const RSVP_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyawLCMjaiokN4PChH_KcH7JxxOI6fUTaMLXUY5noxDFu4vZJ2pTZNdeBHPAsuBF5_H/exec";
const RSVP_ENABLED = true;

rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = rsvpForm.querySelector("[type='submit']");
  const response = Object.fromEntries(new FormData(rsvpForm).entries());
  try {
    response.codigo = JSON.parse(sessionStorage.getItem("wedding-access"))?.codigo || "";
  } catch {
    response.codigo = "";
  }

  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";
  localStorage.setItem("wedding-rsvp", JSON.stringify(response));

  try {
    if (!RSVP_ENDPOINT || !RSVP_ENABLED) {
      throw new Error(
        "Google Sheets aún no permite respuestas públicas. Hay que corregir el acceso de la implementación.",
      );
    }

    // Apps Script no expone cabeceras CORS; no-cors permite enviar desde cualquier
    // dominio y también desde la versión local de la invitación.
    await fetch(RSVP_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: new URLSearchParams(response),
    });

    rsvpForm.hidden = true;
    formSuccess.classList.add("visible");
  } catch (error) {
    submitButton.disabled = false;
    submitButton.textContent = "Enviar confirmación";
    window.alert(
      `${error.message}\n\nLa respuesta quedó guardada temporalmente en este dispositivo.`,
    );
  }
});
