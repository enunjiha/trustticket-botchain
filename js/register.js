const connectButton = document.querySelector('#connect-organizer');
const form = document.querySelector('#organizer-form');
const walletField = document.querySelector('#organizer-wallet');
const walletStatus = document.querySelector('#wallet-status');
const result = document.querySelector('#registration-result');

async function connectWallet() {
  if (!window.ethereum) {
    walletStatus.textContent = 'MetaMask is required to register an organizer wallet.';
    return;
  }
  try {
    const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!account) return;
    if (window.TrustTicketRoles.isOrganizer(account)) {
      window.location.assign('organizer.html');
      return;
    }
    walletField.value = account;
    walletStatus.textContent = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
    connectButton.hidden = true;
    form.hidden = false;
  } catch (error) {
    walletStatus.textContent = error.message || 'Wallet connection was cancelled.';
  }
}

connectButton.addEventListener('click', connectWallet);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const request = Object.fromEntries(new FormData(form));
  const requests = JSON.parse(localStorage.getItem('trustticket_organizer_requests') || '[]');
  if (!requests.some((item) => item.wallet.toLowerCase() === request.wallet.toLowerCase())) {
    requests.push({ ...request, status: 'PENDING', submittedAt: new Date().toISOString() });
    localStorage.setItem('trustticket_organizer_requests', JSON.stringify(requests));
  }
  form.hidden = true;
  result.hidden = false;
  result.textContent = 'Registration submitted. An existing organizer must approve this wallet before it can access the organizer portal.';
});
