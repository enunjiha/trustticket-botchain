window.TrustTicketRoles = {
  isOrganizer(address) {
    return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  destinationFor() {
    return "organizer.html";
  }
};
