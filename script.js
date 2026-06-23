const welcome = document.querySelector("#welcome");
const invitation = document.querySelector("#invitation");
const envelope = document.querySelector("#openInvitation");
const openLabel = document.querySelector("#openLabel");

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
