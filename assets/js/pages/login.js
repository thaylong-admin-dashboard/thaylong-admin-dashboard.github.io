import { loginAndStore, redirectToDashboard, restoreSession } from "../modules/auth.js";

const form = document.querySelector("#login-form");
const button = document.querySelector("#login-button");
const feedback = document.querySelector("#form-feedback");

function setFeedback(message, tone = "info") {
  feedback.textContent = message;
  feedback.className = `feedback is-${tone}`;
}

async function bootstrap() {
  try {
    const session = await restoreSession();

    if (session?.token) {
      redirectToDashboard();
    }
  } catch (error) {
    setFeedback("Phien dang nhap da het han. Vui long dang nhap lai.", "info");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!username || !password) {
    setFeedback("Vui long nhap day du tai khoan va mat khau.", "error");
    return;
  }

  button.disabled = true;
  setFeedback("Dang xac thuc tai khoan...", "info");

  try {
    await loginAndStore(username, password);
    setFeedback("Dang nhap thanh cong, dang chuyen huong...", "success");
    redirectToDashboard();
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

bootstrap();
