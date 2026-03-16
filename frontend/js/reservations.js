const reservationForm = document.getElementById("reservation-form");
const reservationsList = document.getElementById("reservations-list");
const eventSelect = document.getElementById("event_id");
const ticketTypeInput = document.getElementById("ticket_type");
const editingReservationIdInput = document.getElementById("editing_reservation_id");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const seatMap = document.getElementById("seat-map");

const PRICES = { standard: 27, vip: 267 };

let selectedTicketType = "standard";
let selectedQty = 1;
let selectedSeats = [];
let takenSeats = [];
let editingReservationOriginalSeats = [];

function ensureLoggedIn() {
    if (!getToken()) {
        window.location.href = "login.html";
    }
}

function showMsg(text, type = "error") {
    const el = document.getElementById("reservation-message");
    if (!el) return;

    el.textContent = text;
    el.className = `message ${type}`;

    setTimeout(() => {
        el.className = "message";
        el.textContent = "";
    }, 4000);
}

function parseSeatLabelString(seatLabel) {
    if (!seatLabel) return [];
    return seatLabel.split(",").map(s => s.trim()).filter(Boolean);
}

function getSeatLayout(ticketType) {
    if (ticketType === "vip") {
        return [
            { row: "V1", seats: 10 },
            { row: "V2", seats: 10 }
        ];
    }

    return [
        { row: "A", seats: 16 },
        { row: "B", seats: 16 },
        { row: "C", seats: 16 },
        { row: "D", seats: 16 },
        { row: "E", seats: 16 }
    ];
}

function getValidSeatsForTicketType(ticketType) {
    const layout = getSeatLayout(ticketType);
    const allSeats = [];

    layout.forEach(rowInfo => {
        for (let i = 1; i <= rowInfo.seats; i++) {
            allSeats.push(`${rowInfo.row}-${i}`);
        }
    });

    return allSeats;
}

function updateSelectedSeatsDisplay() {
    const display = document.getElementById("selected-seats-display");
    const requiredCount = document.getElementById("seat-required-count");
    const sumSeats = document.getElementById("sum-seats");

    if (requiredCount) {
        requiredCount.textContent = selectedQty;
    }

    const text = selectedSeats.length
        ? selectedSeats.join(", ")
        : "none";

    if (display) {
        display.textContent = `Selected seats: ${text}`;
    }

    if (sumSeats) {
        sumSeats.textContent = selectedSeats.length ? selectedSeats.join(", ") : "—";
    }
}

function updateSummary() {
    const price = PRICES[selectedTicketType] || 0;
    const base = price * selectedQty;
    const fee = Math.round(base * 0.10);
    const total = base + fee;

    const elBase = document.getElementById("sum-base");
    const elFee = document.getElementById("sum-fee");
    const elTotal = document.getElementById("sum-total");
    const elType = document.getElementById("sum-type");

    if (elBase) elBase.textContent = `${base.toLocaleString()} $`;
    if (elFee) elFee.textContent = `${fee.toLocaleString()} $`;
    if (elTotal) elTotal.textContent = `${total.toLocaleString()} $`;
    if (elType) elType.textContent = `${selectedTicketType === "vip" ? "VIP" : "Standard"} × ${selectedQty}`;

    updateSelectedSeatsDisplay();
}

function isSeatTakenForCurrentView(seatLabel) {
    if (editingReservationIdInput.value && editingReservationOriginalSeats.includes(seatLabel)) {
        return false;
    }
    return takenSeats.includes(seatLabel);
}

function toggleSeatSelection(seatLabel) {
    if (isSeatTakenForCurrentView(seatLabel)) {
        return;
    }

    const alreadySelected = selectedSeats.includes(seatLabel);

    if (alreadySelected) {
        selectedSeats = selectedSeats.filter(seat => seat !== seatLabel);
    } else {
        if (selectedSeats.length >= selectedQty) {
            showMsg(`You can select only ${selectedQty} seat(s).`);
            return;
        }
        selectedSeats.push(seatLabel);
    }

    renderSeatMap();
    updateSummary();
}

function renderSeatMap() {
    if (!seatMap) return;

    const layout = getSeatLayout(selectedTicketType);
    seatMap.innerHTML = "";

    layout.forEach(rowInfo => {
        const row = document.createElement("div");
        row.className = "seat-row";

        const rowLabel = document.createElement("div");
        rowLabel.className = "seat-row-label";
        rowLabel.textContent = rowInfo.row;
        row.appendChild(rowLabel);

        const rowSeats = document.createElement("div");
        rowSeats.className = "seat-row-seats";

        for (let i = 1; i <= rowInfo.seats; i++) {
            const seatLabel = `${rowInfo.row}-${i}`;
            const seat = document.createElement("button");
            seat.type = "button";
            seat.className = "seat";
            seat.textContent = i;
            seat.title = seatLabel;

            if (selectedSeats.includes(seatLabel)) {
                seat.classList.add("selected");
            } else if (isSeatTakenForCurrentView(seatLabel)) {
                seat.classList.add("taken");
                seat.disabled = true;
            }

            seat.addEventListener("click", () => toggleSeatSelection(seatLabel));
            rowSeats.appendChild(seat);
        }

        row.appendChild(rowSeats);
        seatMap.appendChild(row);
    });
}

async function loadTakenSeats() {
    try {
        const eventId = parseInt(eventSelect.value, 10);
        if (!eventId) {
            takenSeats = [];
            renderSeatMap();
            return;
        }

        const data = await apiGet(`/reservations/taken/${eventId}`);
        takenSeats = data.taken_seats || [];
        renderSeatMap();
    } catch (error) {
        console.error(error);
        showMsg("Failed to load taken seats.");
    }
}

function trimSelectedSeatsToQuantity() {
    if (selectedSeats.length > selectedQty) {
        selectedSeats = selectedSeats.slice(0, selectedQty);
    }
}

function filterSelectedSeatsByTicketType() {
    const validSeats = getValidSeatsForTicketType(selectedTicketType);
    selectedSeats = selectedSeats.filter(seat => validSeats.includes(seat));
    editingReservationOriginalSeats = editingReservationOriginalSeats.filter(seat => validSeats.includes(seat));
}

function resetFormToCreateMode() {
    editingReservationIdInput.value = "";
    editingReservationOriginalSeats = [];
    selectedTicketType = "standard";
    selectedQty = 1;
    selectedSeats = [];

    if (ticketTypeInput) ticketTypeInput.value = "standard";
    if (eventSelect) eventSelect.disabled = false;
    if (submitBtn) submitBtn.textContent = "Confirm Booking";
    if (cancelEditBtn) cancelEditBtn.style.display = "none";

    document.querySelectorAll(".ticket-option").forEach(option => {
        option.classList.remove("selected");
    });

    const standardOption = document.querySelector('.ticket-option[data-value="standard"]');
    if (standardOption) standardOption.classList.add("selected");

    const qtyDisplay = document.getElementById("qty-display");
    if (qtyDisplay) qtyDisplay.textContent = "1";

    updateSummary();
    loadTakenSeats();
}

async function fillFormForEdit(reservation) {
    editingReservationIdInput.value = reservation.id;
    selectedTicketType = reservation.ticket_type;
    selectedQty = reservation.quantity;
    selectedSeats = parseSeatLabelString(reservation.seat_label);
    editingReservationOriginalSeats = [...selectedSeats];

    if (ticketTypeInput) ticketTypeInput.value = reservation.ticket_type;

    if (eventSelect) {
        eventSelect.value = reservation.event_id;
        eventSelect.disabled = true;
    }

    document.querySelectorAll(".ticket-option").forEach(option => {
        option.classList.remove("selected");
    });

    const selectedOption = document.querySelector(`.ticket-option[data-value="${reservation.ticket_type}"]`);
    if (selectedOption) selectedOption.classList.add("selected");

    const qtyDisplay = document.getElementById("qty-display");
    if (qtyDisplay) qtyDisplay.textContent = reservation.quantity;

    if (submitBtn) submitBtn.textContent = "Update Booking";
    if (cancelEditBtn) cancelEditBtn.style.display = "block";

    updateSummary();
    await loadTakenSeats();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".ticket-option").forEach(option => {
    option.addEventListener("click", async () => {
        document.querySelectorAll(".ticket-option").forEach(o => o.classList.remove("selected"));
        option.classList.add("selected");

        selectedTicketType = option.dataset.value;
        if (ticketTypeInput) ticketTypeInput.value = selectedTicketType;

        filterSelectedSeatsByTicketType();
        trimSelectedSeatsToQuantity();
        updateSummary();
        await loadTakenSeats();
    });
});

window.changeQty = function(delta) {
    selectedQty = Math.max(1, Math.min(10, selectedQty + delta));

    const qtyDisplay = document.getElementById("qty-display");
    if (qtyDisplay) qtyDisplay.textContent = selectedQty;

    trimSelectedSeatsToQuantity();
    updateSummary();
    renderSeatMap();
};

async function loadEventsForSelect() {
    try {
        const events = await apiGet("/events/");
        eventSelect.innerHTML = "";

        events.forEach(event => {
            const option = document.createElement("option");
            option.value = event.id;
            option.textContent = `${event.title} — ${event.location} (${event.event_date})`;
            eventSelect.appendChild(option);
        });

        await loadTakenSeats();
    } catch (error) {
        console.error(error);
        showMsg("Failed to load events.");
    }
}

async function loadReservations() {
    try {
        const reservations = await apiGet("/reservations/");
        reservationsList.innerHTML = "";

        const countEl = document.getElementById("res-count");
        if (countEl) {
            countEl.textContent = `${reservations.length} booking${reservations.length !== 1 ? "s" : ""}`;
        }

        if (reservations.length === 0) {
            reservationsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i data-lucide="flag"></i>
                    </div>
                    <div class="empty-title">No reservations yet</div>
                    <p>Create your first reservation using the form.</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        reservations.forEach(reservation => {
            const card = document.createElement("div");
            card.className = "res-card";

            const typeBadge = reservation.ticket_type === "vip"
                ? `<span class="badge badge-vip"><i data-lucide="star"></i> VIP</span>`
                : `<span class="badge badge-standard"><i data-lucide="ticket"></i> Standard</span>`;

            const statusBadge = reservation.status === "active"
                ? `<span class="badge badge-active"><i data-lucide="circle-check-big"></i> Active</span>`
                : `<span class="badge badge-cancelled"><i data-lucide="circle-x"></i> Cancelled</span>`;

            card.innerHTML = `
                <div class="res-card-header">
                    <div class="res-card-title">${reservation.event.title}</div>
                </div>

                <div class="res-card-meta">
                    ${typeBadge}
                    ${statusBadge}
                </div>

                <div class="res-card-info">
                    <div class="res-info-item">
                        <div class="res-info-label"><i data-lucide="map-pin"></i> Location</div>
                        <div class="res-info-value">${reservation.event.location}</div>
                    </div>
                    <div class="res-info-item">
                        <div class="res-info-label"><i data-lucide="calendar"></i> Date</div>
                        <div class="res-info-value">${reservation.event.event_date}</div>
                    </div>
                    <div class="res-info-item">
                        <div class="res-info-label"><i data-lucide="ticket"></i> Quantity</div>
                        <div class="res-info-value">${reservation.quantity} ticket${reservation.quantity > 1 ? "s" : ""}</div>
                    </div>
                    <div class="res-info-item">
                        <div class="res-info-label"><i data-lucide="armchair"></i> Seats</div>
                        <div class="res-info-value">${reservation.seat_label || "—"}</div>
                    </div>
                    <div class="res-info-item">
                        <div class="res-info-label"><i data-lucide="hash"></i> Booking ID</div>
                        <div class="res-info-value">#${String(reservation.id).padStart(4, "0")}</div>
                    </div>
                </div>

                <div class="res-card-actions">
                    <button class="btn btn-ghost edit-btn" data-id="${reservation.id}">Edit</button>
                    <button class="btn btn-danger delete-btn" data-id="${reservation.id}">Delete</button>
                </div>
            `;

            reservationsList.appendChild(card);
        });

        document.querySelectorAll(".edit-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const id = button.getAttribute("data-id");

                try {
                    const reservation = await apiGet(`/reservations/${id}`);
                    await fillFormForEdit(reservation);
                } catch (error) {
                    showMsg(error.message);
                }
            });
        });

        document.querySelectorAll(".delete-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const id = button.getAttribute("data-id");
                button.disabled = true;
                button.textContent = "Deleting...";

                try {
                    await apiDelete(`/reservations/${id}`);
                    await loadReservations();
                    await loadTakenSeats();
                    showMsg("Reservation deleted.", "success");

                    if (editingReservationIdInput.value === id) {
                        resetFormToCreateMode();
                    }
                } catch (error) {
                    showMsg(error.message);
                    button.disabled = false;
                    button.textContent = "Delete";
                }
            });
        });

        if (window.lucide) lucide.createIcons();

    } catch (error) {
        showMsg(error.message);
    }
}

if (eventSelect) {
    eventSelect.addEventListener("change", async () => {
        selectedSeats = [];
        updateSummary();
        await loadTakenSeats();
    });
}

if (reservationForm) {
    reservationForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const currentId = editingReservationIdInput.value;
        submitBtn.disabled = true;
        submitBtn.textContent = currentId ? "Updating..." : "Booking...";

        const event_id = parseInt(eventSelect.value, 10);
        const ticket_type = selectedTicketType;
        const quantity = selectedQty;
        const seat_label = selectedSeats.join(",");

        try {
            if (selectedSeats.length !== quantity) {
                throw new Error(`Please select exactly ${quantity} seat(s).`);
            }

            if (currentId) {
                await apiPut(`/reservations/${currentId}`, {
                    ticket_type,
                    quantity,
                    status: "active",
                    seat_label
                });
                showMsg("Reservation updated!", "success");
            } else {
                await apiPost("/reservations/", {
                    event_id,
                    ticket_type,
                    quantity,
                    seat_label
                });
                showMsg("Reservation created!", "success");
            }

            resetFormToCreateMode();
            await loadReservations();
            await loadTakenSeats();
        } catch (error) {
            showMsg(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = editingReservationIdInput.value ? "Update Booking" : "Confirm Booking";
            if (!editingReservationIdInput.value) {
                submitBtn.textContent = "Confirm Booking";
            }
        }
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
        resetFormToCreateMode();
    });
}

ensureLoggedIn();
loadEventsForSelect();
loadReservations();
updateSummary();
renderSeatMap();