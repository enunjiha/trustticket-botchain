window.TrustTicketRoles = {
  organizerAddresses: ["0x30d68cd5099A00C433Fa4715c17156Ff2ca87D96"],

  isOrganizer(address) {
    return typeof address === "string" && this.organizerAddresses
      .some((organizer) => organizer.toLowerCase() === address.toLowerCase());
  },

  destinationFor(address) {
    return this.isOrganizer(address) ? "organizer.html" : "index.html";
  }
};
