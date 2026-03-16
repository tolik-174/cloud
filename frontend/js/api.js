const API_URL = `${window.location.protocol}//${window.location.hostname}:8000`;
// http://localhost:8080

function getToken() {
    return localStorage.getItem("token");
}

function setToken(token) {
    localStorage.setItem("token", token);
}

function removeToken() {
    localStorage.removeItem("token");
}

function isLoggedIn() {
    return !!getToken();
}

function updateNavbar() {
    const loginLink = document.getElementById("nav-login");
    const registerLink = document.getElementById("nav-register");
    const reservationsLink = document.getElementById("nav-reservations");
    const logoutBtn = document.getElementById("logout-btn");

    if (isLoggedIn()) {
        if (loginLink) loginLink.style.display = "none";
        if (registerLink) registerLink.style.display = "none";
        if (reservationsLink) reservationsLink.style.display = "inline-flex";
        if (logoutBtn) logoutBtn.style.display = "inline-flex";
    } else {
        if (loginLink) loginLink.style.display = "inline-flex";
        if (registerLink) registerLink.style.display = "inline-flex";
        if (reservationsLink) reservationsLink.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "none";
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            removeToken();
            window.location.href = "login.html";
        };
    }

    const currentPage = window.location.pathname.split("/").pop();
    document.querySelectorAll(".nav-links a").forEach(a => {
        const href = a.getAttribute("href");
        if (href === currentPage || (currentPage === "" && href === "index.html")) {
            a.classList.add("active");
        }
    });
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const headers = { ...(options.headers || {}) };

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    let data = null;

    if (response.status !== 204) {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const text = await response.text();
            data = text ? JSON.parse(text) : null;
        } else {
            const text = await response.text();
            data = text || null;
        }
    }

    if (!response.ok) {
        if (data && typeof data === "object" && data.detail) {
            throw new Error(data.detail);
        }
        throw new Error("Request failed");
    }

    return data;
}

async function apiGet(endpoint) {
    return apiRequest(endpoint, { method: "GET" });
}

async function apiPost(endpoint, data) {
    return apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(data)
    });
}

async function apiPut(endpoint, data) {
    return apiRequest(endpoint, {
        method: "PUT",
        body: JSON.stringify(data)
    });
}

async function apiDelete(endpoint) {
    return apiRequest(endpoint, { method: "DELETE" });
}

document.addEventListener("DOMContentLoaded", updateNavbar);