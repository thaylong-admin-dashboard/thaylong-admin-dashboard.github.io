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
    setFeedback("Phiên cũ không còn hợp lệ. Vui lòng đăng nhập lại.", "info");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!username || !password) {
    setFeedback("Vui lòng nhập đầy đủ tài khoản và mật khẩu.", "error");
    return;
  }

  button.disabled = true;
  setFeedback("Đang xác thực tài khoản...", "info");

  try {
    await loginAndStore(username, password);
    setFeedback("Đăng nhập thành công, đang chuyển hướng...", "success");
    redirectToDashboard();
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

bootstrap();
