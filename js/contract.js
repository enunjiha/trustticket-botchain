window.TrustTicketContract = {
    address: "0x405F33dFF4708F57905e59ce4Fa8ffd47daD5566",

    configured() {
        return !!this.address;
    },

    async provider() {
        return new ethers.BrowserProvider(window.ethereum);
    },

    async signer() {
        const provider = await this.provider();
        return await provider.getSigner();
    },

    abi: [
        "function getTotalConcerts() view returns (uint256)",
        "function getConcert(uint256) view returns ((uint256 id,address organizer,string name,string venue,uint256 date,uint256 price,uint256 totalTickets,uint256 ticketsSold,bool active))",
        "function buyTicket(uint256) payable",
        "function verifyTicket(uint256) view returns (bool)",
        "function checkIn(uint256)",
        "function updateConcertStatus(uint256,bool)"
    ],

    async readContract() {
        const provider = await this.provider();
        return new ethers.Contract(
            this.address,
            this.abi,
            provider
        );
    },

    async writeContract() {
        const signer = await this.signer();

        return new ethers.Contract(
            this.address,
            this.abi,
            signer
        );
    },

    async getTotalConcerts() {
        const contract = await this.readContract();
        return Number(await contract.getTotalConcerts());
    },

    async getConcert(id) {
        const contract = await this.readContract();

        const c = await contract.getConcert(id);

        return {
            id: Number(c.id),
            organizer: c.organizer,
            name: c.name,
            venue: c.venue,
            date: Number(c.date),
            price: ethers.formatEther(c.price),
            totalTickets: Number(c.totalTickets),
            ticketsSold: Number(c.ticketsSold),
            active: c.active
        };
    },

    async buyTicket(id) {

        const concert = await this.getConcert(id);

        const contract = await this.writeContract();

        const tx = await contract.buyTicket(id, {
            value: ethers.parseEther(concert.price)
        });

        await tx.wait();

        return tx;
    },

    async verifyTicket(ticketId) {

        const contract = await this.readContract();

        return await contract.verifyTicket(ticketId);
    },

    async checkIn(ticketId) {

        const contract = await this.writeContract();

        const tx = await contract.checkIn(ticketId);

        await tx.wait();

        return tx;
    }
};