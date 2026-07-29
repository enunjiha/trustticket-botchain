window.TrustQR={open(ticket){
 const modal=document.querySelector("#qr-modal"),box=document.querySelector("#qr-code");box.innerHTML="";
 const payload=JSON.stringify({app:"TrustTicket",version:1,ticketId:ticket.ticketId,concertId:ticket.concertId,owner:ticket.owner});
 new QRCode(box,{text:payload,width:200,height:200,colorDark:"#070908",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});
 document.querySelector("#qr-title").textContent=ticket.concert;document.querySelector("#qr-meta").textContent=`Ticket #${ticket.ticketId} / Present this code at entry`;modal.showModal();
}};
document.addEventListener("DOMContentLoaded",()=>{const m=document.querySelector("#qr-modal");if(!m)return;m.querySelector(".modal-close").onclick=()=>m.close();m.addEventListener("click",e=>{if(e.target===m)m.close()})});
