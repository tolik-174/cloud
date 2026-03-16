const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");

function showMessage(id, text, type = "error") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `message ${type}`;
}

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const btn = registerForm.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Creating account...";

        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        try {
            const data = await apiPost("/auth/register", {
                username,
                email,
                password
            });

            setToken(data.access_token);
            showMessage("message", "Account created! Redirecting...", "success");

            setTimeout(() => {
                window.location.href = "reservations.html";
            }, 800);
        } catch (err) {
            showMessage("message", err.message || "Registration failed", "error");
            btn.disabled = false;
            btn.textContent = "Create Account";
        }
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const btn = loginForm.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Signing in...";

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        try {
            const data = await apiPost("/auth/login", {
                email,
                password
            });

            setToken(data.access_token);
            showMessage("message", "Welcome back! Redirecting...", "success");

            setTimeout(() => {
                window.location.href = "reservations.html";
            }, 800);
        } catch (err) {
            showMessage("message", err.message || "Login failed", "error");
            btn.disabled = false;
            btn.textContent = "Sign In";
        }
    });
}