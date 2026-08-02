window.TrustQR = {
  open(ticket) {
    const modal = document.querySelector("#qr-modal");
    const box = document.querySelector("#qr-code");
    box.innerHTML = "";

    new QRCode(box, {
      text: `trustticket:${ticket.ticketId}`,
      width: 256,
      height: 256,
      colorDark: "#070908",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });

    document.querySelector("#qr-title").textContent = ticket.concert;
    document.querySelector("#qr-meta").textContent =
      `Ticket #${ticket.ticketId} / Present this code at entry`;
    modal.showModal();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.querySelector("#qr-modal");
  if (!modal) return;
  modal.querySelector(".modal-close").onclick = () => modal.close();
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
});
