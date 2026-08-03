window.TrustQR = {
  open(ticket) {
    if (typeof ticketStatus === "function" && ticketStatus(ticket) !== "VALID") {
      showToast("This ticket can only be used from the concert start time until the end of that day.", true);
      return;
    }

    const modal = document.querySelector("#qr-modal");
    const box = document.querySelector("#qr-code");
    box.innerHTML = "";

    new QRCode(box, {
      text: `trustticket:${ticket.ticketId}`,
      width: 288,
      height: 288,
      colorDark: "#070908",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
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
