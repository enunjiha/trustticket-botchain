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

document.getElementById('concertForm').addEventListener('submit', (event) => {
  event.preventDefault();
  // Replace this with: contract.createConcert(...) after ABI integration.
  event.currentTarget.reset();
  showToast('Concert ready to create — connect your contract call here.');
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

const events = [
  { name: 'NEON WAVES FESTIVAL', date: '24 AUG 2026', venue: 'THE WAREHOUSE', sold: 786, supply: 1000, status: 'ACTIVE' },
  { name: 'AFTER DARK', date: '07 SEP 2026', venue: 'SPECTRUM HALL', sold: 0, supply: 500, status: 'DRAFT' },
  { name: 'ECHO CITY LIVE', date: '18 OCT 2026', venue: 'RIVERFRONT ARENA', sold: 304, supply: 750, status: 'ACTIVE' },
];
let activeEvent = events[0];
const eventModal = document.getElementById('eventModal');
const modalTitle = document.getElementById('modalTitle');
const modalDetails = document.getElementById('modalDetails');
const statusButton = document.getElementById('statusButton');

function openEventModal(event) {
  activeEvent = event;
  modalTitle.innerHTML = `${event.name.split(' ').slice(0, 2).join(' ')} <em>DETAILS</em>`;
  modalDetails.innerHTML = `<div><span>Date</span><strong>${event.date}</strong></div><div><span>Venue</span><strong>${event.venue}</strong></div><div><span>Tickets sold</span><strong>${event.sold} / ${event.supply}</strong></div><div><span>Status</span><strong>${event.status}</strong></div>`;
  statusButton.textContent = event.status === 'ACTIVE' ? 'Deactivate event' : 'Activate event';
  eventModal.classList.add('open');
}
function closeEventModal() { eventModal.classList.remove('open'); }

document.querySelectorAll('.manage').forEach((button, index) => button.addEventListener('click', () => openEventModal(events[index])));
document.getElementById('viewAll').addEventListener('click', () => openEventModal({ name: 'ALL CONCERTS', date: '3 EVENTS', venue: 'NEON WAVES · AFTER DARK · ECHO CITY LIVE', sold: 1090, supply: 2250, status: 'PORTFOLIO' }));
document.querySelector('[data-close-modal]').addEventListener('click', closeEventModal);
eventModal.addEventListener('click', (event) => { if (event.target === eventModal) closeEventModal(); });
statusButton.addEventListener('click', () => {
  if (activeEvent.status === 'PORTFOLIO') return showToast('Choose Manage on a specific concert.');
  activeEvent.status = activeEvent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  openEventModal(activeEvent);
  showToast(`${activeEvent.name} is now ${activeEvent.status}.`);
});
document.getElementById('checkInButton').addEventListener('click', () => {
  closeEventModal();
  document.getElementById('verify').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('ticketId').focus();
});
