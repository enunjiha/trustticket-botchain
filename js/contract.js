/* Contract adapter. The customer UI only calls these methods and never reads Solidity tuples directly. */
window.TrustTicketContract={
 address:"",
 chainId:"0x0", // BOTChain chain ID in hexadecimal
 chainName:"BOTChain",
 abi:[
  "function getConcert(uint256 id) view returns (string name,string venue,uint256 date,uint256 price,uint256 supply,uint256 sold,bool active)",
  "function buyTicket(uint256 concertId) payable returns (uint256)",
  "function getOwnedTickets(address owner) view returns (uint256[])",
  "function getTicket(uint256 ticketId) view returns (uint256 concertId,address owner,bool used)"
 ],
 configured(){return /^0x[a-fA-F0-9]{40}$/.test(this.address)},
 readContract(){
  if(!this.configured())throw new Error("DEMO_MODE");
  const provider=window.TrustWallet?.provider||new ethers.BrowserProvider(window.ethereum);
  return new ethers.Contract(this.address,this.abi,provider);
 },
 async getConcert(id){
  const value=await this.readContract().getConcert(id);
  return {id:Number(id),name:value.name,venue:value.venue,date:Number(value.date),price:value.price,supply:Number(value.supply),sold:Number(value.sold),active:value.active};
 },
 async buyTicket(concertId,price){
  if(!this.configured())throw new Error("DEMO_MODE");
  if(!window.TrustWallet?.signer)throw new Error("Connect your wallet first.");
  const contract=new ethers.Contract(this.address,this.abi,window.TrustWallet.signer);
  const tx=await contract.buyTicket(concertId,{value:ethers.parseEther(String(price))});
  return tx.wait();
 },
 async getOwnedTickets(owner){
  const ids=await this.readContract().getOwnedTickets(owner);
  return ids.map(Number);
 },
 async getTicket(id){
  const value=await this.readContract().getTicket(id);
  return {id:Number(id),concertId:Number(value.concertId),owner:value.owner,used:value.used};
 }
};
