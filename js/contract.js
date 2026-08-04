window.TrustTicketContract = {
    address: "0xC1D0A74e2FC13814d8C0cbA8c1D523b9a305BD77",
    rpcUrl: "https://rpc.bohr.life",
    chainId: 968,
    deploymentBlock: 18005127,

    configured() {
        return !!this.address;
    },

    async provider() {
        return new ethers.JsonRpcProvider(
            this.rpcUrl,
            this.chainId,
            { staticNetwork: true }
        );
    },

    async signer() {
        if (!window.ethereum) {
            throw new Error("MetaMask is required to buy a ticket.");
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        return await provider.getSigner();
    },

    abi: [
        "event TicketPurchased(uint256 ticketId,uint256 concertId,address buyer,uint256 purchaseTime)",
        "event ConcertUpdated(uint256 concertId)",
        "event ConcertDeleted(uint256 concertId)",
        "function getTotalConcerts() view returns (uint256)",
        "function getConcert(uint256) view returns ((uint256 id,address organizer,string name,string venue,uint256 date,uint256 price,uint256 totalTickets,uint256 ticketsSold,bool active))",
        "function createConcert(string,string,uint256,uint256,uint256)",
        "function buyTicket(uint256) payable",
        "function tickets(uint256) view returns (uint256 concertId,bool used,uint256 purchaseTime)",
        "function ownerOf(uint256) view returns (address)",
        "function verifyTicket(uint256) view returns (bool)",
        "function checkIn(uint256)",
        "function updateConcertStatus(uint256,bool)",
        "function updateConcert(uint256,string,string,uint256,uint256,uint256)",
        "function deleteConcert(uint256)"
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
            priceWei: c.price.toString(),
            totalTickets: Number(c.totalTickets),
            ticketsSold: Number(c.ticketsSold),
            active: c.active
        };
    },

    async buyTicket(id) {

        const concert = await this.getConcert(id);

        const contract = await this.writeContract();

        const tx = await contract.buyTicket(id, {
            value: concert.priceWei
        });

        const receipt = await tx.wait();
        const purchased = receipt.logs
            .map((log) => {
                try {
                    return contract.interface.parseLog(log);
                } catch {
                    return null;
                }
            })
            .find((log) => log?.name === "TicketPurchased");

        if (!purchased) {
            throw new Error("Ticket purchase succeeded, but its ticket ID was not found.");
        }

        const updatedConcert = await this.getConcert(id);
        return {
            tx,
            receipt,
            ticketId: Number(purchased.args.ticketId),
            displayId: this.ticketDisplayId(updatedConcert.name, updatedConcert.ticketsSold)
        };
    },

    concertCode(name) {
        const firstWord = String(name || "TICKET").trim().split(/\s+/)[0];
        return firstWord.replace(/[^a-z0-9]/gi, "").toUpperCase() || "TICKET";
    },

    ticketDisplayId(concertName, concertSerial) {
        return `${this.concertCode(concertName)}${String(concertSerial).padStart(2, "0")}`;
    },

    async createConcert(name, venue, date, price, totalTickets) {
        const contract = await this.writeContract();
        const tx = await contract.createConcert(
            name,
            venue,
            date,
            ethers.parseEther(String(price)),
            totalTickets
        );
        await tx.wait();
        return tx;
    },

    async getTicket(ticketId) {
        const contract = await this.readContract();
        const ticket = await contract.tickets(ticketId);
        const owner = await contract.ownerOf(ticketId);

        return {
            ticketId: Number(ticketId),
            concertId: Number(ticket.concertId),
            used: ticket.used,
            purchaseTime: Number(ticket.purchaseTime),
            owner
        };
    },

    async getPurchasedTickets() {
        const contract = await this.readContract();
        const latestBlock = await contract.runner.provider.getBlockNumber();
        const logs = [];

        for (let fromBlock = this.deploymentBlock; fromBlock <= latestBlock; fromBlock += 5000) {
            const toBlock = Math.min(fromBlock + 4999, latestBlock);
            logs.push(...await contract.queryFilter(
                contract.filters.TicketPurchased(),
                fromBlock,
                toBlock
            ));
        }

        const serials = new Map();
        return Promise.all(logs.map(async (log) => {
            const concertId = Number(log.args.concertId);
            const concertSerial = (serials.get(concertId) || 0) + 1;
            serials.set(concertId, concertSerial);
            return {
                ...await this.getTicket(log.args.ticketId),
                buyer: log.args.buyer,
                concertSerial
            };
        }));
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
    },

    async updateConcertStatus(concertId, active) {
        const contract = await this.writeContract();
        const tx = await contract.updateConcertStatus(concertId, active);
        await tx.wait();
        return tx;
    },

    async updateConcert(concertId, name, venue, date, price, totalTickets) {
        const contract = await this.writeContract();
        const tx = await contract.updateConcert(
            concertId,
            name,
            venue,
            date,
            ethers.parseEther(String(price)),
            totalTickets
        );
        await tx.wait();
        return tx;
    },

    async deleteConcert(concertId) {
        const contract = await this.writeContract();
        const tx = await contract.deleteConcert(concertId);
        await tx.wait();
        return tx;
    }
};
