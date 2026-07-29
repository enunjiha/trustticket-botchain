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

function openEventModal(event) {
  activeEvent = event;
  modalTitle.innerHTML = `${event.name.split(' ').slice(0, 2).join(' ')} <em>DETAILS</em>`;
  modalDetails.innerHTML = `<div><span>Date</span><strong>${event.date}</strong></div><div><span>Venue</span><strong>${event.venue}</strong></div><div><span>Tickets sold</span><strong>${event.sold} / ${event.supply}</strong></div><div><span>Status</span><strong>${event.status}</strong></div>`;
  statusButton.textContent = event.status === 'ACTIVE' ? 'Deactivate event' : 'Activate event';
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
