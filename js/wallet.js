window.TrustWallet = {
  account: null,
  provider: null,

  short(address) {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect wallet";
  },

  async connect() {
    if (!window.ethereum) {
      window.showToast?.("MetaMask is not installed.", true);
      return null;
    }

    try {
      await this.ensureNetwork();
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      this.account = accounts[0] || null;
      this.provider = window.ethereum;
      sessionStorage.removeItem("trustticket_wallet_disconnected");
      this.update();
      window.dispatchEvent(new CustomEvent("trustticket:wallet", {
        detail: { account: this.account }
      }));
      return this.account;
    } catch (error) {
      window.showToast?.(error.shortMessage || error.message, true);
      return null;
    }
  },

  async ensureNetwork() {
    const expected = `0x${Number(TrustTicketContract.chainId).toString(16)}`;
    const current = await window.ethereum.request({ method: "eth_chainId" });
    if (current === expected) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expected }]
      });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: expected,
          chainName: "BOT Chain Mainnet",
          nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
          rpcUrls: [TrustTicketContract.rpcUrl],
          blockExplorerUrls: ["https://scan.botchain.ai/"]
        }]
      });
    }
  },

  update() {
    document.querySelectorAll("[data-connect]").forEach((button) => {
      const label = button.querySelector(".wallet-label");
      if (label) {
        label.textContent = this.account
          ? `Disconnect ${this.short(this.account)}`
          : "Connect wallet";
      }
      button.classList.toggle("connected", Boolean(this.account));
    });
  },

  async disconnect() {
    this.account = null;
    this.provider = null;
    sessionStorage.setItem("trustticket_wallet_disconnected", "true");
    this.update();
    window.dispatchEvent(new CustomEvent("trustticket:wallet", {
      detail: { account: null }
    }));
    window.showToast?.("Wallet disconnected from TrustTicket.");
  },

  async restore() {
    if (!window.ethereum || sessionStorage.getItem("trustticket_wallet_disconnected")) return;
    const [account] = await window.ethereum.request({ method: "eth_accounts" });
    if (!account) return;
    this.account = account;
    this.provider = window.ethereum;
    this.update();
    window.dispatchEvent(new CustomEvent("trustticket:wallet", {
      detail: { account }
    }));
  },

  init() {
    document.querySelectorAll("[data-connect]").forEach((button) => {
      button.addEventListener("click", () => {
        if (this.account) {
          this.disconnect();
        } else {
          this.connect();
        }
      });
    });
    this.restore();
    window.ethereum?.on("accountsChanged", (accounts) => {
      this.account = accounts[0] || null;
      if (this.account) {
        sessionStorage.removeItem("trustticket_wallet_disconnected");
      }
      this.update();
      window.dispatchEvent(new CustomEvent("trustticket:wallet", {
        detail: { account: this.account }
      }));
    });
    window.ethereum?.on("chainChanged", () => window.location.reload());
  }
};

document.addEventListener("DOMContentLoaded", () => TrustWallet.init());
