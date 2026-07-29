const toast = document.getElementById('toast');
const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
};

document.getElementById('walletButton').addEventListener('click', async (event) => {
  if (event.currentTarget.dataset.connected === 'true') {
    sessionStorage.setItem('trustticket_wallet_disconnected', 'true');
    event.currentTarget.dataset.connected = '';
    event.currentTarget.innerHTML = '<i></i> Connect wallet';
    showToast('Wallet disconnected from TrustTicket.');
    try {
      await window.ethereum?.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
    } catch {
      // The portal session is still cleared when a wallet does not support permission revocation.
    }
    window.setTimeout(() => window.location.assign('index.html'), 500);
    return;
  }
  if (!window.ethereum) return showToast('MetaMask not found — install it to connect.');
  try {
    const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!window.TrustTicketRoles?.isOrganizer(account)) {
      showToast('This wallet is a customer account. Opening the customer portal.');
      window.setTimeout(() => window.location.assign('index.html'), 900);
      return;
    }
    sessionStorage.removeItem('trustticket_wallet_disconnected');
    event.currentTarget.dataset.connected = 'true';
    event.currentTarget.innerHTML = `<i></i> Disconnect ${account.slice(0, 6)}...${account.slice(-4)}`;
    showToast('Wallet connected');
  } catch {
    showToast('Wallet connection was cancelled.');
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.ethereum || sessionStorage.getItem('trustticket_wallet_disconnected')) return;
  const [account] = await window.ethereum.request({ method: 'eth_accounts' });
  if (account && window.TrustTicketRoles?.isOrganizer(account)) {
    const button = document.getElementById('walletButton');
    button.dataset.connected = 'true';
    button.innerHTML = `<i></i> Disconnect ${account.slice(0, 6)}...${account.slice(-4)}`;
  }
});

function verifyTicket() {
  const result = document.getElementById('verifyResult');
  const ticketId = document.getElementById('ticketId').value.trim();
  if (!ticketId) { result.className = 'verify-result used'; result.textContent = 'ENTER A TICKET ID FIRST'; return; }
  // Replace this demo response with contract.verifyTicket(ticketId).
  result.className = 'verify-result valid';
  result.textContent = `VALID — ${ticketId.toUpperCase()} · READY FOR CHECK-IN`;
}
document.getElementById('verifyButton').addEventListener('click', verifyTicket);

let qrScanner;
const scannerPanel = document.getElementById('scanner');
async function stopCamera() {
  if (qrScanner?.isScanning) await qrScanner.stop();
  scannerPanel.classList.remove('open');
}
document.getElementById('startScanner').addEventListener('click', async () => {
  if (!window.Html5Qrcode) return showToast('Scanner is loading. Refresh and check your internet.');
  try {
    scannerPanel.classList.add('open');
    qrScanner = new Html5Qrcode('qrReader');
    await qrScanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, async (decodedText) => {
      document.getElementById('ticketId').value = decodedText;
      await stopCamera();
      verifyTicket();
      showToast('QR code scanned successfully');
    });
  } catch {
    scannerPanel.classList.remove('open');
    showToast('Camera permission was blocked or no camera was found.');
  }
});
document.getElementById('stopScanner').addEventListener('click', stopCamera);

const DEFAULT_EVENTS = [
  { id: 'neon-waves', name: 'NEON WAVES FESTIVAL', date: '2026-08-24', venue: 'THE WAREHOUSE', price: 0.1, sold: 786, supply: 1000, status: 'ACTIVE', image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=85' },
  { id: 'after-dark', name: 'AFTER DARK', date: '2026-09-07', venue: 'SPECTRUM HALL', price: 0.1, sold: 0, supply: 500, status: 'DRAFT', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=85' },
  { id: 'echo-city', name: 'ECHO CITY LIVE', date: '2026-10-18', venue: 'RIVERFRONT ARENA', price: 0.1, sold: 304, supply: 750, status: 'ACTIVE', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85' },
];
const EVENTS_STORAGE_KEY = 'trustticket_organizer_events';
let savedEvents = null;
try {
  savedEvents = JSON.parse(localStorage.getItem(EVENTS_STORAGE_KEY) || 'null');
} catch {
  localStorage.removeItem(EVENTS_STORAGE_KEY);
}
const events = Array.isArray(savedEvents) ? savedEvents : DEFAULT_EVENTS;
let activeEvent = events[0];
const concertGrid = document.getElementById('concertGrid');
const eventModal = document.getElementById('eventModal');
const modalTitle = document.getElementById('modalTitle');
const modalDetails = document.getElementById('modalDetails');
const statusButton = document.getElementById('statusButton');
const eventInsights = document.getElementById('eventInsights');
const insightGrid = document.getElementById('insightGrid');
const attendeeCount = document.getElementById('attendeeCount');
const attendeeSearch = document.getElementById('attendeeSearch');
const attendeeList = document.getElementById('attendeeList');
const editEventForm = document.getElementById('editEventForm');
const modalActions = document.querySelector('.modal-actions');
const editEventButton = document.getElementById('editEventButton');
const deleteEventButton = document.getElementById('deleteEventButton');
let activeAttendees = [];

function saveEvents() {
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

function displayDate(date) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed).toUpperCase();
}

function renderEvents() {
  concertGrid.replaceChildren();
  document.getElementById('totalConcerts').textContent = String(events.length).padStart(2, '0');
  events.forEach((concert, index) => {
    const card = document.createElement('article');
    card.className = `event-card${index === 0 ? ' featured' : ''}`;
    const image = document.createElement('img');
    image.src = concert.image || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85';
    image.alt = `${concert.name} concert`;
    const info = document.createElement('div');
    info.className = 'event-info';
    const status = document.createElement('span');
    status.className = `status ${concert.status === 'ACTIVE' ? 'live' : 'draft'}`;
    status.textContent = `● ${concert.status}`;
    const title = document.createElement('h3');
    title.textContent = concert.name;
    const meta = document.createElement('p');
    meta.textContent = `${displayDate(concert.date)} · ${concert.venue}`;
    const footer = document.createElement('div');
    const sales = document.createElement('strong');
    sales.textContent = Number(concert.sold || 0).toLocaleString();
    const supply = document.createElement('small');
    supply.textContent = ` / ${Number(concert.supply).toLocaleString()} SOLD`;
    sales.appendChild(supply);
    const manage = document.createElement('button');
    manage.className = 'manage';
    manage.type = 'button';
    manage.textContent = 'Manage →';
    manage.addEventListener('click', () => openEventModal(concert));
    footer.append(sales, manage);
    info.append(status, title, meta, footer);
    card.append(image, info);
    concertGrid.appendChild(card);
  });
}

function storedTickets() {
  try {
    const tickets = JSON.parse(localStorage.getItem('trustticket_tickets') || '[]');
    return Array.isArray(tickets) ? tickets : [];
  } catch {
    return [];
  }
}

function attendeesFor(event) {
  return storedTickets().filter((ticket) =>
    String(ticket.concertId) === String(event.id) ||
    String(ticket.concert || '').trim().toLowerCase() === event.name.trim().toLowerCase()
  );
}

function shortWallet(wallet) {
  const value = String(wallet || 'Unknown');
  return value.length > 15 ? `${value.slice(0, 7)}...${value.slice(-5)}` : value;
}

function renderAttendees(query = '') {
  const term = query.trim().toLowerCase();
  const filtered = activeAttendees.filter((ticket) =>
    String(ticket.ticketId).toLowerCase().includes(term) ||
    String(ticket.owner).toLowerCase().includes(term)
  );
  attendeeList.replaceChildren();
  attendeeCount.textContent = `${activeAttendees.length} ${activeAttendees.length === 1 ? 'BUYER' : 'BUYERS'}`;
  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'attendee-empty';
    empty.textContent = activeAttendees.length ? 'No matching ticket holder.' : 'No ticket purchases recorded for this event yet.';
    attendeeList.appendChild(empty);
    return;
  }
  filtered.forEach((ticket) => {
    const row = document.createElement('div');
    row.className = 'attendee-row';
    const ticketCell = document.createElement('div');
    const ticketLabel = document.createElement('span');
    ticketLabel.textContent = 'Ticket';
    const ticketValue = document.createElement('strong');
    ticketValue.textContent = `#${ticket.ticketId}`;
    ticketCell.append(ticketLabel, ticketValue);
    const ownerCell = document.createElement('div');
    ownerCell.className = 'attendee-owner';
    const ownerLabel = document.createElement('span');
    ownerLabel.textContent = 'Wallet';
    const ownerValue = document.createElement('strong');
    ownerValue.textContent = shortWallet(ticket.owner);
    ownerValue.title = ticket.owner || '';
    ownerCell.append(ownerLabel, ownerValue);
    const action = document.createElement('button');
    action.className = 'checkin-small';
    action.type = 'button';
    action.disabled = Boolean(ticket.used);
    action.textContent = ticket.used ? 'Checked in' : 'Check in';
    if (ticket.used) action.classList.add('used');
    action.addEventListener('click', () => checkInAttendee(ticket.ticketId));
    row.append(ticketCell, ownerCell, action);
    attendeeList.appendChild(row);
  });
}

function checkInAttendee(ticketId) {
  const tickets = storedTickets();
  const ticket = tickets.find((item) => String(item.ticketId) === String(ticketId));
  if (!ticket || ticket.used) return;
  ticket.used = true;
  ticket.status = 'USED';
  ticket.checkedInAt = new Date().toISOString();
  localStorage.setItem('trustticket_tickets', JSON.stringify(tickets));
  activeAttendees = attendeesFor(activeEvent);
  renderEventInsights(activeEvent);
  showToast(`Ticket #${ticketId} checked in.`);
}

function renderEventInsights(event) {
  const isPortfolio = event.status === 'PORTFOLIO';
  eventInsights.hidden = isPortfolio;
  if (isPortfolio) return;
  activeAttendees = attendeesFor(event);
  const checkedIn = activeAttendees.filter((ticket) => ticket.used || ticket.status === 'USED').length;
  const recordedSales = Math.max(Number(event.sold || 0), activeAttendees.length);
  const revenue = recordedSales * Number(event.price || 0);
  insightGrid.innerHTML = `
    <div class="insight"><span>Recorded sales</span><strong>${recordedSales.toLocaleString()}</strong></div>
    <div class="insight"><span>Revenue</span><strong>${revenue.toFixed(3)} BOT</strong></div>
    <div class="insight"><span>Checked in</span><strong>${checkedIn} / ${activeAttendees.length}</strong></div>
  `;
  attendeeSearch.value = '';
  renderAttendees();
}

function openEventModal(event) {
  activeEvent = event;
  editEventForm.hidden = true;
  modalActions.hidden = false;
  modalTitle.replaceChildren();
  modalTitle.append(`${event.name.split(' ').slice(0, 2).join(' ')} `);
  const detailsAccent = document.createElement('em');
  detailsAccent.textContent = 'DETAILS';
  modalTitle.appendChild(detailsAccent);
  modalDetails.innerHTML = `<div><span>Date</span><strong>${event.date}</strong></div><div><span>Venue</span><strong>${event.venue}</strong></div><div><span>Tickets sold</span><strong>${event.sold} / ${event.supply}</strong></div><div><span>Status</span><strong>${event.status}</strong></div>`;
  statusButton.textContent = event.status === 'ACTIVE' ? 'Deactivate event' : 'Activate event';
  editEventButton.hidden = event.status === 'PORTFOLIO';
  deleteEventButton.hidden = event.status === 'PORTFOLIO';
  renderEventInsights(event);
  eventModal.classList.add('open');
}
function closeEventModal() { eventModal.classList.remove('open'); }

document.getElementById('concertForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const concert = {
    id: `local-${Date.now()}`,
    name: data.get('name').trim().toUpperCase(),
    date: data.get('date'),
    venue: data.get('venue').trim().toUpperCase(),
    price: Number(data.get('price')),
    sold: 0,
    supply: Number(data.get('supply')),
    status: 'DRAFT'
  };
  events.unshift(concert);
  saveEvents();
  renderEvents();
  event.currentTarget.reset();
  document.getElementById('concerts').scrollIntoView({ behavior: 'smooth' });
  showToast(`${concert.name} added to Your Concerts.`);
});

document.getElementById('viewAll').addEventListener('click', () => {
  const sold = events.reduce((total, concert) => total + Number(concert.sold || 0), 0);
  const supply = events.reduce((total, concert) => total + Number(concert.supply || 0), 0);
  openEventModal({ name: 'ALL CONCERTS', date: `${events.length} EVENTS`, venue: events.map((concert) => concert.name).join(' · '), sold, supply, status: 'PORTFOLIO' });
});
attendeeSearch.addEventListener('input', () => renderAttendees(attendeeSearch.value));
document.getElementById('exportAttendees').addEventListener('click', () => {
  if (!activeAttendees.length) return showToast('No ticket holders to export.');
  const rows = [['Ticket ID', 'Wallet', 'Status', 'Checked in at'], ...activeAttendees.map((ticket) => [
    ticket.ticketId,
    ticket.owner,
    ticket.used || ticket.status === 'USED' ? 'CHECKED IN' : 'VALID',
    ticket.checkedInAt || ''
  ])];
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `${activeEvent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-attendees.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});
editEventButton.addEventListener('click', () => {
  document.getElementById('editEventName').value = activeEvent.name;
  document.getElementById('editEventDate').value = activeEvent.date;
  document.getElementById('editEventVenue').value = activeEvent.venue;
  document.getElementById('editEventPrice').value = Number(activeEvent.price || 0);
  const supplyInput = document.getElementById('editEventSupply');
  supplyInput.min = Math.max(1, Number(activeEvent.sold || 0));
  supplyInput.value = Number(activeEvent.supply || 1);
  eventInsights.hidden = true;
  modalActions.hidden = true;
  editEventForm.hidden = false;
});
document.getElementById('cancelEditEvent').addEventListener('click', () => openEventModal(activeEvent));
editEventForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const newSupply = Number(data.get('supply'));
  if (newSupply < Number(activeEvent.sold || 0)) {
    return showToast(`Supply cannot be lower than ${activeEvent.sold} tickets already sold.`);
  }
  activeEvent.name = data.get('name').trim().toUpperCase();
  activeEvent.date = data.get('date');
  activeEvent.venue = data.get('venue').trim().toUpperCase();
  activeEvent.price = Number(data.get('price'));
  activeEvent.supply = newSupply;
  saveEvents();
  renderEvents();
  openEventModal(activeEvent);
  showToast(`${activeEvent.name} updated successfully.`);
});
deleteEventButton.addEventListener('click', () => {
  const buyerCount = attendeesFor(activeEvent).length;
  const warning = buyerCount
    ? `This event has ${buyerCount} recorded ticket holder(s). Delete ${activeEvent.name}?`
    : `Delete ${activeEvent.name}? This action cannot be undone.`;
  if (!window.confirm(warning)) return;
  const eventIndex = events.indexOf(activeEvent);
  if (eventIndex === -1) return;
  const deletedName = activeEvent.name;
  events.splice(eventIndex, 1);
  saveEvents();
  renderEvents();
  closeEventModal();
  activeEvent = events[0] || null;
  showToast(`${deletedName} deleted.`);
});
document.querySelector('[data-close-modal]').addEventListener('click', closeEventModal);
eventModal.addEventListener('click', (event) => { if (event.target === eventModal) closeEventModal(); });
statusButton.addEventListener('click', () => {
  if (activeEvent.status === 'PORTFOLIO') return showToast('Choose Manage on a specific concert.');
  activeEvent.status = activeEvent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  saveEvents();
  renderEvents();
  openEventModal(activeEvent);
  showToast(`${activeEvent.name} is now ${activeEvent.status}.`);
});
document.getElementById('checkInButton').addEventListener('click', () => {
  closeEventModal();
  document.getElementById('verify').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('ticketId').focus();
});

renderEvents();
