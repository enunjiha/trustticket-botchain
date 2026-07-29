window.TrustWallet={account:null,signer:null,provider:null,
 short(a){return a?`${a.slice(0,6)}...${a.slice(-4)}`:"Connect wallet"},
 async connect(){
  const needsAccountSelection=sessionStorage.getItem("trustticket_wallet_disconnected")==="true";
  sessionStorage.removeItem("trustticket_wallet_disconnected");
  if(!window.ethereum){window.showToast?.("MetaMask is not installed.",true);return null}
  try{if(needsAccountSelection)await window.ethereum.request({method:"wallet_requestPermissions",params:[{eth_accounts:{}}]});const accounts=await window.ethereum.request({method:"eth_requestAccounts"});this.provider=window.ethereum;this.signer=null;this.account=accounts[0]||null;this.update();await this.checkNetwork();this.routeByRole();return this.account}catch(e){sessionStorage.setItem("trustticket_wallet_disconnected","true");window.showToast?.(e.shortMessage||e.message,true);return null}
 },
 async checkNetwork(){if(!TrustTicketContract.chainId||TrustTicketContract.chainId==="0x0")return;const chain=await ethereum.request({method:"eth_chainId"});if(chain!==TrustTicketContract.chainId)window.showToast?.(`Switch MetaMask to ${TrustTicketContract.chainName}.`,true)},
 update(){document.querySelectorAll("[data-connect]").forEach(b=>{const s=b.querySelector(".wallet-label");if(s)s.textContent=this.account?`Disconnect ${this.short(this.account)}`:"Connect wallet";b.classList.toggle("connected",!!this.account)})},
 async disconnect(){this.account=null;this.signer=null;this.provider=null;sessionStorage.setItem("trustticket_wallet_disconnected","true");this.update();try{await window.ethereum?.request({method:"wallet_revokePermissions",params:[{eth_accounts:{}}]})}catch(e){}window.showToast?.("Wallet disconnected from TrustTicket.")},
 routeByRole(){if(!this.account||!window.TrustTicketRoles?.isOrganizer(this.account))return;window.location.assign("organizer.html")},
 async restore(){if(!window.ethereum||sessionStorage.getItem("trustticket_wallet_disconnected"))return;const a=await ethereum.request({method:"eth_accounts"});if(a[0]){this.provider=window.ethereum;this.signer=null;this.account=a[0];this.update();this.routeByRole()}},
 init(){document.querySelectorAll("[data-connect]").forEach(b=>b.addEventListener("click",()=>this.account?this.disconnect():this.connect()));this.restore();if(window.ethereum){ethereum.on("accountsChanged",a=>{if(sessionStorage.getItem("trustticket_wallet_disconnected"))return;this.account=a[0]||null;this.update();location.reload()});ethereum.on("chainChanged",()=>location.reload())}}
};
document.addEventListener("DOMContentLoaded",()=>TrustWallet.init());
