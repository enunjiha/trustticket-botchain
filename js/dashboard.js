const toast = document.getElementById("toast");
const walletButton = document.getElementById("walletButton");
const concertGrid = document.getElementById("concertGrid");
const eventModal = document.getElementById("eventModal");
const modalTitle = document.getElementById("modalTitle");
const modalDetails = document.getElementById("modalDetails");
const statusButton = document.getElementById("statusButton");
const editEventButton = document.getElementById("editEventButton");
const deleteEventButton = document.getElementById("deleteEventButton");
const editEventForm = document.getElementById("editEventForm");
const eventInsights = document.getElementById("eventInsights");
const insightGrid = document.getElementById("insightGrid");
const attendeeCount = document.getElementById("attendeeCount");
const attendeeSearch = document.getElementById("attendeeSearch");
const attendeeList = document.getElementById("attendeeList");
const verifyResult = document.getElementById("verifyResult");
const ticketInput = document.getElementById("ticketId");
const sidebar = document.querySelector(".sidebar");
const sidebarScrim = document.querySelector(".sidebar-scrim");

let account = null;
let events = [];
let tickets = [];
let activeEvent = null;
let activeAttendees = [];
let qrScanner = null;

const organizerSectionLinks = [...document.querySelectorAll('.sidebar nav a[href^="#"]')]
  .filter((link) => link.getAttribute("href") !== "#top");

function closeOrganizerNavigation() {
  sidebar?.classList.remove("open");
  sidebarScrim?.classList.remove("open");
  document.querySelector(".menu-btn")?.setAttribute("aria-expanded", "false");
}

function updateActiveOrganizerSection(requestedHash = window.location.hash || "#dashboard") {
  const activeHash = organizerSectionLinks.some((link) => link.getAttribute("href") === requestedHash)
    ? requestedHash
    : "#dashboard";

  organizerSectionLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === activeHash);
  });
}

organizerSectionLinks.forEach((link) => {
  link.addEventListener("click", () => {
    updateActiveOrganizerSection(link.getAttribute("href"));
    closeOrganizerNavigation();
  });
});

window.addEventListener("hashchange", () => updateActiveOrganizerSection());

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function showToast(message, error = false) {
  toast.textContent = message;
  toast.className = `toast show${error ? " error" : ""}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = "toast";
  }, 4000);
}

function errorMessage(error) {
  return error?.shortMessage || error?.reason || error?.message || "Transaction failed.";
}

function sameAddress(left, right) {
  return String(left).toLowerCase() === String(right).toLowerCase();
}

function shortWallet(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected";
}

async function ensureBotChain() {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId === "0x3c8") return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x3c8" }]
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x3c8",
        chainName: "BOT Chain Testnet",
        nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
        rpcUrls: ["https://rpc.bohr.life"],
        blockExplorerUrls: ["https://scan.bohr.life/"]
      }]
    });
  }
}

function updateWalletButton() {
  walletButton.dataset.connected = account ? "true" : "";
  walletButton.innerHTML = account
    ? `<i></i> Disconnect ${shortWallet(account)}`
    : "<i></i> Connect wallet";
}

async function connectWallet() {
  if (!window.ethereum) {
    showToast("MetaMask is required to use the organizer portal.", true);
    return null;
  }

  await ensureBotChain();
  const [selected] = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!selected) return null;
  if (!window.TrustTicketRoles?.isOrganizer(selected)) {
    throw new Error("This wallet has not been approved as an organizer.");
  }

  account = selected;
  sessionStorage.removeItem("trustticket_wallet_disconnected");
  updateWalletButton();
  await loadDashboard();
  return account;
}

walletButton.addEventListener("click", async () => {
  if (account) {
    account = null;
    sessionStorage.setItem("trustticket_wallet_disconnected", "true");
    updateWalletButton();
    events = [];
    tickets = [];
    renderEvents();
    showToast("Wallet disconnected from TrustTicket.");
    return;
  }

  try {
    await connectWallet();
    showToast("Organizer wallet connected.");
  } catch (error) {
    showToast(errorMessage(error), true);
  }
});

function displayDate(timestamp) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp * 1000)).toUpperCase();
}

function dateInputValue(timestamp) {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeInputValue(timestamp) {
  const date = new Date(timestamp * 1000);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

async function loadDashboard() {
  if (!account) return;

  concertGrid.innerHTML = "<p>Loading your concerts from BOTChain...</p>";
  const total = await TrustTicketContract.getTotalConcerts();
  const concertResults = await Promise.allSettled(
    Array.from({ length: total }, (_, index) =>
      TrustTicketContract.getConcert(index + 1)
    )
  );
  const allConcerts = concertResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  concertResults
    .filter((result) => result.status === "rejected")
    .forEach((result) => console.warn("Skipping unavailable concert:", result.reason));

  events = allConcerts
    .filter((concert) => sameAddress(concert.organizer, account) && concert.name.trim())
    .map((concert) => ({
      ...concert,
      sold: concert.ticketsSold,
      supply: concert.totalTickets,
      status: concert.active ? "ACTIVE" : "INACTIVE"
    }));

  try {
    tickets = await TrustTicketContract.getPurchasedTickets();
  } catch (error) {
    console.error("Unable to load ticket events:", error);
    tickets = [];
    showToast("Concerts loaded, but ticket history could not be read.", true);
  }

  renderEvents();
  renderMetrics();
}

function renderMetrics() {
  const eventIds = new Set(events.map((event) => event.id));
  const organizerTickets = tickets.filter((ticket) => eventIds.has(ticket.concertId));
  const sold = events.reduce((sum, event) => sum + event.ticketsSold, 0);
  const revenue = events.reduce(
    (sum, event) => sum + (Number(event.price) * event.ticketsSold),
    0
  );
  const checkedIn = organizerTickets.filter((ticket) => ticket.used).length;

  document.getElementById("totalConcerts").textContent = String(events.length).padStart(2, "0");
  document.getElementById("totalTicketsSold").textContent = sold.toLocaleString();
  document.getElementById("totalRevenue").innerHTML = `${revenue.toFixed(3)} <b>BOT</b>`;
  document.getElementById("totalCheckedIn").textContent = checkedIn.toLocaleString();
}

function renderEvents() {
  concertGrid.replaceChildren();
  if (!account) {
    concertGrid.innerHTML = "<p>Connect an approved organizer wallet to load its concerts.</p>";
    renderMetrics();
    return;
  }
  if (!events.length) {
    concertGrid.innerHTML = "<p>No concerts have been created by this wallet yet.</p>";
    renderMetrics();
    return;
  }

  events.forEach((concert, index) => {
    const card = document.createElement("article");
    card.className = `event-card${index === 0 ? " featured" : ""}`;
    card.innerHTML = `
      <img src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85" alt="${escapeHtml(concert.name)} concert">
      <div class="event-info">
        <span class="status ${concert.active ? "live" : "draft"}">● ${concert.status}</span>
        <h3>${escapeHtml(concert.name)}</h3>
        <p>${displayDate(concert.date)} · ${escapeHtml(concert.venue)}</p>
        <div>
          <strong>${concert.ticketsSold.toLocaleString()}<small> / ${concert.totalTickets.toLocaleString()} SOLD</small></strong>
          <button class="manage" type="button">Manage →</button>
        </div>
      </div>`;
    card.querySelector(".manage").addEventListener("click", () => openEventModal(concert));
    concertGrid.appendChild(card);
  });
}

function attendeesFor(concert) {
  return tickets.filter((ticket) => ticket.concertId === concert.id);
}

function displayTicketId(ticket, concert = events.find((event) => event.id === ticket.concertId)) {
  return concert
    ? TrustTicketContract.ticketDisplayId(concert.name, ticket.concertSerial)
    : `#${ticket.ticketId}`;
}

function renderAttendees(query = "") {
  const term = query.trim().toLowerCase();
  const checkInStatus = activeEvent ? checkInWindowStatus(activeEvent) : "VALID";
  const checkInIsOpen = checkInStatus === "VALID";
  const filtered = activeAttendees.filter((ticket) =>
    String(ticket.ticketId).includes(term) ||
    displayTicketId(ticket, activeEvent).toLowerCase().includes(term) ||
    ticket.owner.toLowerCase().includes(term)
  );
  attendeeList.replaceChildren();
  attendeeCount.textContent = `${activeAttendees.length} ${activeAttendees.length === 1 ? "BUYER" : "BUYERS"}`;

  if (!filtered.length) {
    attendeeList.innerHTML = `<p class="attendee-empty">${
      activeAttendees.length ? "No matching ticket holder." : "No on-chain ticket purchases for this event yet."
    }</p>`;
    return;
  }

  filtered.forEach((ticket) => {
    const row = document.createElement("div");
    row.className = "attendee-row";
    row.innerHTML = `
      <div><span>Ticket</span><strong>${escapeHtml(displayTicketId(ticket, activeEvent))}</strong></div>
      <div class="attendee-owner"><span>Wallet</span><strong title="${ticket.owner}">${shortWallet(ticket.owner)}</strong></div>
      <button class="checkin-small${ticket.used ? " used" : ""}" type="button" ${ticket.used || !checkInIsOpen ? "disabled" : ""}
        ${ticket.used ? "Checked in" : checkInIsOpen ? "Check in" : checkInStatus === "EXPIRED" ? "Window closed" : "Opens 1 hour before"}
      </button>`;
    row.querySelector("button").addEventListener("click", () => checkInTicket(ticket.ticketId));
    attendeeList.appendChild(row);
  });
}

function renderEventInsights(concert) {
  activeAttendees = attendeesFor(concert);
  const checkedIn = activeAttendees.filter((ticket) => ticket.used).length;
  const revenue = Number(concert.price) * concert.ticketsSold;
  insightGrid.innerHTML = `
    <div class="insight"><span>On-chain sales</span><strong>${concert.ticketsSold}</strong></div>
    <div class="insight"><span>Revenue</span><strong>${revenue.toFixed(3)} BOT</strong></div>
    <div class="insight"><span>Checked in</span><strong>${checkedIn} / ${activeAttendees.length}</strong></div>`;
  attendeeSearch.value = "";
  renderAttendees();
}

function openEventModal(concert) {
  activeEvent = concert;
  modalTitle.innerHTML = `${escapeHtml(concert.name)} <em>DETAILS</em>`;
  modalDetails.innerHTML = `
    <div><span>Contract ID</span><strong>#${concert.id}</strong></div>
    <div><span>Date</span><strong>${displayDate(concert.date)}</strong></div>
    <div><span>Venue</span><strong>${escapeHtml(concert.venue)}</strong></div>
    <div><span>Price</span><strong>${concert.price} BOT</strong></div>
    <div><span>Tickets sold</span><strong>${concert.ticketsSold} / ${concert.totalTickets}</strong></div>
    <div><span>Status</span><strong>${concert.status}</strong></div>`;
  statusButton.textContent = concert.active ? "Deactivate event" : "Activate event";
  const hasStarted = concert.date <= Math.floor(Date.now() / 1000);
  editEventForm.hidden = true;
  editEventButton.hidden = false;
  deleteEventButton.hidden = false;
  editEventButton.disabled = false;
  deleteEventButton.disabled = false;
  const lockedMessage = concert.ticketsSold > 0 ? "Unavailable after ticket sales" : "";
  editEventButton.title = hasStarted ? "Unavailable after the event has started" : "";
  deleteEventButton.title = lockedMessage;
  editEventButton.textContent = hasStarted ? "Edit locked" : "Edit event";
  deleteEventButton.textContent = concert.ticketsSold > 0 ? "Delete locked" : "Delete event";
  eventInsights.hidden = false;
  document.querySelector(".modal-actions").hidden = false;
  renderEventInsights(concert);
  eventModal.classList.add("open");
}

function closeEventModal() {
  eventModal.classList.remove("open");
}

async function checkInTicket(ticketId) {
  try {
    if (!account) await connectWallet();
    const ticket = await TrustTicketContract.getTicket(ticketId);
    const concert = await TrustTicketContract.getConcert(ticket.concertId);
    if (!sameAddress(concert.organizer, account)) {
      throw new Error("This ticket belongs to another organizer's concert.");
    }
    if (ticket.used) throw new Error("This ticket has already been checked in.");
    const checkInStatus = checkInWindowStatus(concert);
    if (checkInStatus === "UPCOMING") {
      throw new Error("Check-in opens one hour before the concert starts.");
    }
    if (checkInStatus === "EXPIRED") {
      throw new Error("Check-in closed 24 hours after the concert started.");
    }

    showToast("Confirm the check-in transaction in MetaMask.");
    await TrustTicketContract.checkIn(ticketId);
    const knownTicket = tickets.find((item) => item.ticketId === Number(ticketId));
    showToast(`Ticket ${knownTicket ? displayTicketId(knownTicket, concert) : `#${ticketId}`} checked in on BOTChain.`);
    await loadDashboard();
    if (activeEvent) {
      const refreshed = events.find((event) => event.id === activeEvent.id);
      if (refreshed) openEventModal(refreshed);
    }
    await verifyTicket();
  } catch (error) {
    showToast(errorMessage(error), true);
  }
}

function parsedTicketId(rawValue) {
  const value = String(rawValue).trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return value;
  const compactMatch = value.match(/^trustticket:(\d+)$/i);
  if (compactMatch) return compactMatch[1];
  const displayMatch = tickets.find((ticket) =>
    displayTicketId(ticket).toLowerCase() === value.toLowerCase()
  );
  if (displayMatch) return String(displayMatch.ticketId);
  try {
    const payload = JSON.parse(value);
    return payload && typeof payload === "object"
      ? String(payload.ticketId || "").replace(/^#/, "")
      : null;
  } catch {
    return value.replace(/^#/, "");
  }
}

const CHECK_IN_OPENING_LEAD_SECONDS = 60 * 60;
const CHECK_IN_WINDOW_AFTER_START_SECONDS = 24 * 60 * 60;

function checkInWindowStatus(concert, nowSeconds = Math.floor(Date.now() / 1000)) {
  const concertStart = Number(concert.date);
  if (nowSeconds < concertStart - CHECK_IN_OPENING_LEAD_SECONDS) return "UPCOMING";
  if (nowSeconds >= concertStart + CHECK_IN_WINDOW_AFTER_START_SECONDS) return "EXPIRED";
  return "VALID";
}

async function verifyTicket() {
  const ticketId = parsedTicketId(ticketInput.value);
  verifyResult.replaceChildren();
  if (!ticketId || !/^\d+$/.test(ticketId)) {
    verifyResult.className = "verify-result used";
    verifyResult.textContent = "ENTER A VALID TICKET ID, FOR EXAMPLE CORTIS01";
    return;
  }

  try {
    const ticket = await TrustTicketContract.getTicket(ticketId);
    const concert = await TrustTicketContract.getConcert(ticket.concertId);
    const belongsToOrganizer = account && sameAddress(concert.organizer, account);
    const valid = await TrustTicketContract.verifyTicket(ticketId);

    if (!belongsToOrganizer) {
      verifyResult.className = "verify-result used";
      verifyResult.textContent = `NOT AUTHORIZED · TICKET BELONGS TO ${shortWallet(concert.organizer)}`;
      return;
    }
    if (!valid || ticket.used) {
      verifyResult.className = "verify-result used";
      const knownTicket = tickets.find((item) => item.ticketId === Number(ticketId));
      verifyResult.textContent = `USED · TICKET ${knownTicket ? displayTicketId(knownTicket, concert) : `#${ticketId}`}`;
      return;
    }
    const checkInStatus = checkInWindowStatus(concert);
    if (checkInStatus === "UPCOMING") {
      verifyResult.className = "verify-result used";
      verifyResult.textContent = `TOO EARLY · CHECK-IN OPENS ONE HOUR BEFORE ${escapeHtml(concert.name)}`;
      return;
    }
    if (checkInStatus === "EXPIRED") {
      verifyResult.className = "verify-result used";
      verifyResult.textContent = `EXPIRED · CHECK-IN CLOSED 24 HOURS AFTER ${escapeHtml(concert.name)} STARTED`;
      return;
    }

    verifyResult.className = "verify-result valid";
    const knownTicket = tickets.find((item) => item.ticketId === Number(ticketId));
    const publicId = knownTicket ? displayTicketId(knownTicket, concert) : `#${ticketId}`;
    verifyResult.innerHTML = `VALID · ${escapeHtml(publicId)} · ${escapeHtml(concert.name)} · OWNER ${shortWallet(ticket.owner)} `;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "checkin-small";
    button.textContent = "Check in";
    button.addEventListener("click", () => checkInTicket(ticketId));
    verifyResult.appendChild(button);
  } catch (error) {
    verifyResult.className = "verify-result used";
    verifyResult.textContent = errorMessage(error);
  }
}

document.getElementById("verifyButton").addEventListener("click", verifyTicket);

const scannerPanel = document.getElementById("scanner");
const scanStatus = document.getElementById("scanStatus");
let scanHintTimer = null;
async function stopCamera() {
  if (qrScanner?.isScanning) {
    try {
      await qrScanner.stop();
    } catch (error) {
      console.warn("Unable to stop QR camera cleanly:", error);
    }
  }
  clearTimeout(scanHintTimer);
  scannerPanel.classList.remove("open");
}

function cameraErrorMessage(error) {
  const message = errorMessage(error);
  if (!window.isSecureContext) {
    return "Camera access requires HTTPS. Open this site using an https:// address.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser does not support camera access. Try Chrome or Safari.";
  }
  if (/denied|permission|notallowed/i.test(message)) {
    return "Camera permission was denied. Allow camera access in browser settings, then try again.";
  }
  if (/notfound|no camera|devicesnotfound/i.test(message)) {
    return "No usable camera was found on this device.";
  }
  if (/notreadable|could not start|trackstart/i.test(message)) {
    return "The camera is being used by another app. Close it and try again.";
  }
  return message || "Camera could not start.";
}

document.getElementById("startScanner").addEventListener("click", async () => {
  if (!window.Html5Qrcode) return showToast("QR scanner failed to load.", true);
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access requires HTTPS and a supported browser.");
    }
    scannerPanel.classList.add("open");
    scanStatus.textContent = "Requesting camera access...";

    if (qrScanner) {
      try {
        await qrScanner.clear();
      } catch {
        // A new scanner is created even if the previous instance was already cleared.
      }
    }
    qrScanner = new Html5Qrcode("qrReader", {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      verbose: false
    });
    const scanConfig = {
      fps: 12,
      aspectRatio: 1,
      disableFlip: false,
      qrbox: (width, height) => {
        const size = Math.floor(Math.min(width, height) * 0.9);
        return { width: size, height: size };
      }
    };
    const onScanSuccess = async (decodedText) => {
      scanStatus.textContent = "QR detected. Verifying ticket...";
      ticketInput.value = parsedTicketId(decodedText) || decodedText;
      await stopCamera();
      await verifyTicket();
    };

    try {
      await qrScanner.start(
        { facingMode: "environment" },
        scanConfig,
        onScanSuccess,
        () => {}
      );
    } catch (preferredCameraError) {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) throw preferredCameraError;
      const selectedCamera =
        cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ||
        cameras[0];
      await qrScanner.start(
        selectedCamera.id,
        scanConfig,
        onScanSuccess,
        () => {}
      );
    }
    scanStatus.textContent = "Looking for a QR code...";
    scanHintTimer = setTimeout(() => {
      scanStatus.textContent = "Keep the full QR inside the frame, hold steady, and reduce screen glare.";
    }, 7000);
  } catch (error) {
    const message = cameraErrorMessage(error);
    scannerPanel.classList.add("open");
    scanStatus.textContent = `Camera error: ${message}`;
    showToast(message, true);
  }
});
document.getElementById("stopScanner").addEventListener("click", stopCamera);

async function decodeQrImage(file) {
  if ("BarcodeDetector" in window) {
    try {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      bitmap.close();
      if (results[0]?.rawValue) return results[0].rawValue;
    } catch {
      // Fall through to html5-qrcode for browsers without native QR support.
    }
  }

  const readerId = `qrFileReader-${Date.now()}`;
  const reader = document.createElement("div");
  reader.id = readerId;
  reader.style.cssText = "position:fixed;left:-10000px;top:0;width:600px;height:600px";
  document.body.appendChild(reader);
  const fileScanner = new Html5Qrcode(readerId, {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    verbose: false
  });

  try {
    return await fileScanner.scanFile(file, false);
  } finally {
    try {
      await fileScanner.clear();
    } catch {
      // The temporary reader is removed even if the library has already cleared it.
    }
    reader.remove();
  }
}

document.getElementById("qrImageInput").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const fileStatus = document.getElementById("scanFileStatus");
  fileStatus.textContent = `Reading ${file.name}...`;
  try {
    await stopCamera();
    const decodedText = await decodeQrImage(file);
    ticketInput.value = parsedTicketId(decodedText) || decodedText;
    const matchedTicket = tickets.find((ticket) => ticket.ticketId === Number(ticketInput.value));
    fileStatus.textContent = `QR detected: ticket ${matchedTicket ? displayTicketId(matchedTicket) : `#${ticketInput.value}`}`;
    await verifyTicket();
    showToast("QR image detected.");
  } catch (error) {
    fileStatus.textContent = "No QR code was detected in this image. Use a clear screenshot containing the full QR.";
    showToast(`QR image was not detected: ${errorMessage(error)}`, true);
  } finally {
    event.target.value = "";
  }
});

document.getElementById("concertForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  try {
    if (!account) await connectWallet();
    const data = new FormData(form);
    const eventDateTime = new Date(`${data.get("date")}T${data.get("time")}:00`);
    const timestamp = Math.floor(eventDateTime.getTime() / 1000);
    if (Number.isNaN(timestamp)) {
      throw new Error("Enter a valid concert date and time.");
    }
    if (timestamp <= Math.floor(Date.now() / 1000)) {
      throw new Error("Concert date and time must be in the future.");
    }

    button.disabled = true;
    showToast("Confirm concert creation in MetaMask.");
    await TrustTicketContract.createConcert(
      data.get("name").trim(),
      data.get("venue").trim(),
      timestamp,
      data.get("price"),
      Number(data.get("supply"))
    );
    form.reset();
    await loadDashboard();
    document.getElementById("concerts").scrollIntoView({ behavior: "smooth" });
    showToast("Concert created on BOTChain.");
  } catch (error) {
    showToast(errorMessage(error), true);
  } finally {
    button.disabled = false;
  }
});

statusButton.addEventListener("click", async () => {
  if (!activeEvent) return;
  try {
    statusButton.disabled = true;
    showToast("Confirm the status transaction in MetaMask.");
    await TrustTicketContract.updateConcertStatus(activeEvent.id, !activeEvent.active);
    const eventId = activeEvent.id;
    await loadDashboard();
    const refreshed = events.find((event) => event.id === eventId);
    if (refreshed) openEventModal(refreshed);
    showToast(`Concert ${refreshed?.active ? "activated" : "deactivated"} on BOTChain.`);
  } catch (error) {
    showToast(errorMessage(error), true);
  } finally {
    statusButton.disabled = false;
  }
});

editEventButton.addEventListener("click", () => {
  if (!activeEvent) return;
  if (activeEvent.date <= Math.floor(Date.now() / 1000)) {
    showToast("This event cannot be edited because it has already started.", true);
    return;
  }
  document.getElementById("editEventName").value = activeEvent.name;
  document.getElementById("editEventDate").value = dateInputValue(activeEvent.date);
  document.getElementById("editEventTime").value = timeInputValue(activeEvent.date);
  document.getElementById("editEventVenue").value = activeEvent.venue;
  document.getElementById("editEventPrice").value = activeEvent.price;
  const supplyInput = document.getElementById("editEventSupply");
  supplyInput.min = String(Math.max(1, activeEvent.ticketsSold));
  supplyInput.value = activeEvent.totalTickets;
  eventInsights.hidden = true;
  document.querySelector(".modal-actions").hidden = true;
  editEventForm.hidden = false;
});

document.getElementById("cancelEditEvent").addEventListener("click", () => {
  if (activeEvent) openEventModal(activeEvent);
});

editEventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeEvent) return;
  const button = event.currentTarget.querySelector('button[type="submit"]');
  try {
    const data = new FormData(event.currentTarget);
    const eventDateTime = new Date(`${data.get("date")}T${data.get("time")}:00`);
    const timestamp = Math.floor(eventDateTime.getTime() / 1000);
    if (Number.isNaN(timestamp)) throw new Error("Enter a valid concert date and time.");
    if (timestamp <= Math.floor(Date.now() / 1000)) {
      throw new Error("Concert date and time must be in the future.");
    }
    if (Number(data.get("supply")) < activeEvent.ticketsSold) {
      throw new Error(`Ticket supply cannot be lower than ${activeEvent.ticketsSold} tickets already sold.`);
    }

    button.disabled = true;
    showToast("Confirm the event update in MetaMask.");
    const eventId = activeEvent.id;
    await TrustTicketContract.updateConcert(
      eventId,
      data.get("name").trim(),
      data.get("venue").trim(),
      timestamp,
      data.get("price"),
      Number(data.get("supply"))
    );
    await loadDashboard();
    const refreshed = events.find((concert) => concert.id === eventId);
    if (refreshed) openEventModal(refreshed);
    showToast("Concert updated on BOTChain.");
  } catch (error) {
    showToast(errorMessage(error), true);
  } finally {
    button.disabled = false;
  }
});

deleteEventButton.addEventListener("click", async () => {
  if (!activeEvent) return;
  if (activeEvent.ticketsSold > 0) {
    showToast("This event cannot be deleted because tickets have already been sold.", true);
    return;
  }
  const eventId = activeEvent.id;
  if (!window.confirm(`Delete ${activeEvent.name}? This cannot be undone.`)) return;
  try {
    deleteEventButton.disabled = true;
    showToast("Confirm event deletion in MetaMask.");
    await TrustTicketContract.deleteConcert(eventId);
    closeEventModal();
    activeEvent = null;
    await loadDashboard();
    showToast("Concert deleted from BOTChain.");
  } catch (error) {
    showToast(errorMessage(error), true);
  } finally {
    deleteEventButton.disabled = false;
  }
});

document.getElementById("viewAll").addEventListener("click", () => {
  document.getElementById("concerts").scrollIntoView({ behavior: "smooth" });
});
attendeeSearch.addEventListener("input", () => renderAttendees(attendeeSearch.value));
document.getElementById("exportAttendees").addEventListener("click", () => {
  if (!activeAttendees.length) return showToast("No ticket holders to export.");
  const rows = [
    ["Ticket ID", "Wallet", "Status"],
    ...activeAttendees.map((ticket) => [
      ticket.ticketId,
      ticket.owner,
      ticket.used ? "CHECKED IN" : "VALID"
    ])
  ];
  const csv = rows.map((row) => row.map((value) => `"${value}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = `${activeEvent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-attendees.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("[data-close-modal]").addEventListener("click", closeEventModal);
eventModal.addEventListener("click", (event) => {
  if (event.target === eventModal) closeEventModal();
});
document.getElementById("checkInButton").addEventListener("click", () => {
  closeEventModal();
  document.getElementById("verify").scrollIntoView({ behavior: "smooth" });
  ticketInput.focus();
});

document.querySelector(".menu-btn")?.addEventListener("click", () => {
  const isOpen = sidebar?.classList.toggle("open") ?? false;
  sidebarScrim?.classList.toggle("open", isOpen);
  document.querySelector(".menu-btn")?.setAttribute("aria-expanded", String(isOpen));
});
sidebarScrim?.addEventListener("click", closeOrganizerNavigation);

document.addEventListener("DOMContentLoaded", async () => {
  updateActiveOrganizerSection();
  renderEvents();
  if (!window.ethereum || sessionStorage.getItem("trustticket_wallet_disconnected")) return;
  try {
    const [selected] = await window.ethereum.request({ method: "eth_accounts" });
    if (!selected) return;
    if (!window.TrustTicketRoles?.isOrganizer(selected)) return;
    account = selected;
    updateWalletButton();
    await ensureBotChain();
    await loadDashboard();
  } catch (error) {
    showToast(errorMessage(error), true);
  }
});

window.ethereum?.on("accountsChanged", () => window.location.reload());
window.ethereum?.on("chainChanged", () => window.location.reload());
