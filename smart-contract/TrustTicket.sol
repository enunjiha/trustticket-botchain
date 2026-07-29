// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TrustTicket is ERC721, Ownable {

    constructor() ERC721("TrustTicket", "TTK") Ownable(msg.sender) {

    }

    uint256 private nextConcertId = 1;
    uint256 private nextTicketId = 1;

    struct Concert {
        uint256 id;
        address payable organizer;
        string name;
        string venue;
        uint256 date;
        uint256 price;
        uint256 totalTickets;
        uint256 ticketsSold;
        bool active;
    }

    struct TicketInfo {
        uint256 concertId;
        bool used;
        uint256 purchaseTime;
    }

    mapping(uint256 => Concert) public concerts;
    mapping(uint256 => TicketInfo) public tickets;

    event ConcertCreated(
        uint256 concertId,
        address organizer,
        string name
    );

    event TicketPurchased(
        uint256 ticketId,
        uint256 concertId,
        address buyer,
        uint256 purchaseTime
    );

    event TicketCheckedIn(
        uint256 ticketId,
        address attendee
    );

    function createConcert(
        string memory _name,
        string memory _venue,
        uint256 _date,
        uint256 _price,
        uint256 _totalTickets
    ) 
    public {
        require(bytes(_name).length > 0, "Concert name required");
        require(_price > 0, "Price must be greater than zero");
        require(_totalTickets > 0, "Total tickets must be greater than zero");
        require(_date > block.timestamp, "Concert date must be in the future");

        concerts[nextConcertId] = Concert({
            id: nextConcertId,
            organizer: payable(msg.sender),
            name: _name,
            venue: _venue,
            date: _date,
            price: _price,
            totalTickets: _totalTickets,
            ticketsSold: 0,
            active: true
        });

        emit ConcertCreated(nextConcertId, msg.sender, _name);

        nextConcertId++;

    }

    function buyTicket(uint256 _concertId)
        public
        payable
    {
        Concert storage concert = concerts[_concertId];

        require(concert.id != 0, "Concert not found");
        require(concert.active, "Concert is not active");
        require(block.timestamp < concert.date, "Concert has ended");
        require(concert.ticketsSold < concert.totalTickets, "Tickets sold out");
        require(msg.value == concert.price, "Incorrect payment");

        _safeMint(msg.sender, nextTicketId);

        tickets[nextTicketId] = TicketInfo({
        concertId: _concertId,
        used: false,
        purchaseTime: block.timestamp
        });

        concert.ticketsSold++;

        (bool success, ) = concert.organizer.call{value: msg.value}("");
        require(success, "Payment failed");

        emit TicketPurchased(
            nextTicketId,
            _concertId,
            msg.sender,
            block.timestamp
        );

        nextTicketId++;


    }

    function getConcert(uint256 _concertId)
        public
        view
        returns (Concert memory)
    {
        require(concerts[_concertId].id != 0, "Concert not found");

        return concerts[_concertId];
    }

    function verifyTicket(uint256 _ticketId)
        public
        view
        returns (bool)
    {
        require(_ownerOf(_ticketId) != address(0), "Ticket does not exist");

        return !tickets[_ticketId].used;
    }

    function checkIn(uint256 _ticketId)
        public
    {
        require(_ownerOf(_ticketId) != address(0), "Ticket does not exist");

        TicketInfo storage ticket = tickets[_ticketId];
        Concert storage concert = concerts[ticket.concertId];

        require(msg.sender == concert.organizer, "Only organizer can check in");
        require(!ticket.used, "Ticket already checked in");

        ticket.used = true;

        emit TicketCheckedIn(_ticketId, ownerOf(_ticketId));
    }

    function updateConcertStatus(
        uint256 _concertId,
        bool _status
    )
        public
    {
        Concert storage concert = concerts[_concertId];

        require(concert.id != 0, "Concert not found");
        require(msg.sender == concert.organizer, "Only organizer can update");

        concert.active = _status;
    }

    function getTotalConcerts()
        public
        view
        returns (uint256)
    {
        return nextConcertId - 1;
    }


}