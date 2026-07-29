window.TrustWallet={account:null,signer:null,provider:null,
 short(a){return a?`${a.slice(0,6)}...${a.slice(-4)}`:"Connect wallet"},
 async connect(){
  if(!window.ethereum){window.showToast?.("MetaMask is not installed.",true);return null}
  try{const accounts=await window.ethereum.request({method:"eth_requestAccounts"});this.provider=window.ethereum;this.signer=null;this.account=accounts[0]||null;this.update();await this.checkNetwork();return this.account}catch(e){window.showToast?.(e.shortMessage||e.message,true);return null}
 },
 async checkNetwork(){if(!TrustTicketContract.chainId||TrustTicketContract.chainId==="0x0")return;const chain=await ethereum.request({method:"eth_chainId"});if(chain!==TrustTicketContract.chainId)window.showToast?.(`Switch MetaMask to ${TrustTicketContract.chainName}.`,true)},
 update(){document.querySelectorAll("[data-connect]").forEach(b=>{const s=b.querySelector(".wallet-label");if(s)s.textContent=this.short(this.account);b.classList.toggle("connected",!!this.account)})},
 async restore(){if(!window.ethereum)return;const a=await ethereum.request({method:"eth_accounts"});if(a[0]){this.provider=window.ethereum;this.signer=null;this.account=a[0];this.update()}},
 init(){document.querySelectorAll("[data-connect]").forEach(b=>b.addEventListener("click",()=>this.connect()));this.restore();if(window.ethereum){ethereum.on("accountsChanged",a=>{this.account=a[0]||null;this.update();location.reload()});ethereum.on("chainChanged",()=>location.reload())}}
};
document.addEventListener("DOMContentLoaded",()=>TrustWallet.init());
