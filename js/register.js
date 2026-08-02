const connectButton = document.querySelector("#connect-organizer");
const walletStatus = document.querySelector("#wallet-status");

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

async function openOrganizerPortal(requestAccess = false) {
  if (!window.ethereum) {
    walletStatus.textContent = "MetaMask is required to use the organizer portal.";
    return;
  }

  try {
    await ensureBotChain();
    const method = requestAccess ? "eth_requestAccounts" : "eth_accounts";
    const [account] = await window.ethereum.request({ method });
    if (!account) return;
    sessionStorage.removeItem("trustticket_wallet_disconnected");
    walletStatus.textContent = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
    window.location.replace("organizer.html");
  } catch (error) {
    walletStatus.textContent = error.message || "Wallet connection was cancelled.";
  }
}

connectButton.addEventListener("click", () => openOrganizerPortal(true));
window.ethereum?.on("accountsChanged", ([account]) => {
  if (account) openOrganizerPortal(false);
});

openOrganizerPortal(false);
