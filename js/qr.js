const QR_CHECK_IN_OPENING_LEAD_MS = 60 * 60 * 1000;
const QR_CHECK_IN_WINDOW_AFTER_START_MS = 24 * 60 * 60 * 1000;

function qrCheckInWindowStatus(ticket, now = Date.now()) {
  if (ticket.used) return "USED";
  const concertStart = Number(ticket.eventTimestamp) * 1000;
  if (now < concertStart - QR_CHECK_IN_OPENING_LEAD_MS) return "UPCOMING";
  if (now >= concertStart + QR_CHECK_IN_WINDOW_AFTER_START_MS) return "EXPIRED";
  return "VALID";
}

window.TrustQR = {
  open(ticket) {
    const status = qrCheckInWindowStatus(ticket);
    if (status !== "VALID") {
      showToast(
        status === "USED"
          ? "This ticket has already been checked in."
          : status === "EXPIRED"
            ? "This ticket's check-in window closed 24 hours after the concert started."
            : "This QR becomes available one hour before the concert starts.",
        true
      );
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
      `Ticket ${ticket.displayId} / Present this code at entry`;
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
