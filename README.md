# TrustTicket

TrustTicket is a concert ticketing website built on BOT Chain. It lets organizers create concerts and sell NFT tickets, while customers can connect MetaMask, buy tickets, and present a QR code at the venue.

Concerts, ticket supply, purchases, ticket ownership, and check-in status are recorded on BOT Chain. This means customers and organizers see the same information, and a ticket cannot be checked in twice.

## What Customers Can Do

1. Open the customer website.
2. Connect MetaMask to BOT Chain Mainnet.
3. Browse the available concerts.
4. Select a concert and buy a ticket.
5. Confirm the transaction in MetaMask.
6. Open **My Tickets** to see the purchased NFT ticket.
7. Show the ticket QR code to the organizer at the entrance.

The customer pays the ticket price and a BOT Chain gas fee. The ticket price is sent to the concert organizer.

The customer page shows only active upcoming concerts. The remaining ticket count is calculated from the concert's total ticket supply minus the number of tickets already sold. A purchase is rejected when the concert is inactive, has ended, or is sold out.

## What Organizers Can Do

1. Open the **Organizer Portal** from the customer website.
2. Connect the MetaMask wallet that will manage the concert.
3. Enter the concert name, date, venue, ticket price, and ticket supply.
4. Confirm the concert creation transaction in MetaMask.
5. View concerts created by that wallet and monitor ticket sales.
6. Activate or deactivate a concert created by that wallet.
7. Edit an owned concert before it starts, or delete it while no tickets have been sold.
8. Scan the customer's live QR code or upload a saved QR image.
9. If the QR cannot be detected, enter the numeric ticket ID shown on the customer's ticket.
10. Verify the ticket, then confirm the check-in transaction in MetaMask.

Only the wallet that created a concert can change its status or check in tickets for that concert.

When an organizer deactivates a concert, the concert is not shown anywhere on the customer page and the smart contract rejects new ticket purchases for it. When the organizer activates it again, the concert appears on the customer page and customers can buy its tickets, provided the concert has not ended and tickets remain available.

Organizers can edit or delete only the concerts that belong to their connected wallet. An owned concert can be edited only before its scheduled start. Editing is still allowed after ticket sales, but the total ticket supply cannot be reduced below the number of tickets already sold. An owned concert can be deleted only when zero tickets have been sold; if no tickets were sold, it may still be deleted after its scheduled start. Deleting an event removes it from the organizer and customer event views.

## Concert Management

From the organizer dashboard, an organizer can manage concerts created by the connected wallet:

- **Activate:** Make the concert visible to customers and allow ticket purchases.
- **Deactivate:** Hide the concert from customers and stop new ticket purchases.
- **Edit:** Before the concert starts, update its name, date, venue, ticket price, or ticket supply. If tickets have already been sold, the new supply cannot be lower than the number sold.
- **Delete:** Remove the event from both the organizer dashboard and customer event list only when zero tickets have been sold. A zero-sale event may be deleted even after it has started.

The organizer dashboard shows only concerts created by the connected organizer wallet. Concerts created by another wallet do not appear in that organizer's concert list and cannot be edited, deleted, activated, deactivated, or used for ticket check-in. After a management action is confirmed, refresh the relevant page to display the latest event information.

## Moving Between Portals

- From the customer page, select **Organizer Portal** to open the organizer dashboard.
- From the organizer dashboard, select **Customer site** to return to the main customer page.
- On the customer page, select **Tickets** to browse the active upcoming concerts.

The same MetaMask wallet can move between both portals, but organizer management permissions are always limited to concerts created by that wallet.

## Ticket Lifecycle

Each successful purchase mints a unique NFT ticket to the customer's connected wallet. The ticket appears under **My Tickets** after the transaction is confirmed and the page is refreshed.

A ticket can have one of these states:

- `VALID`: The ticket is ready to be presented and its QR code is available.
- `USED`: The organizer has completed check-in. The customer can no longer open or display the QR code.
- `EXPIRED`: The concert date has passed. The QR code is no longer available.

After a successful check-in, refresh **My Tickets** to load the latest `USED` status from BOT Chain. The used ticket remains visible in ticket history as proof of ownership, but it cannot be used or checked in again.

## Wallet Roles

MetaMask is used instead of a username and password. The same wallet can use both the customer and organizer portals. A wallet becomes the organizer of a concert when it creates that concert. Only that wallet can manage the concert and check in its tickets.

For demonstrations, using separate wallets is recommended:

- One wallet creates and manages the concert as the organizer.
- Another wallet buys and presents the ticket as the customer.

## Transactions and Payments

Actions that change BOT Chain data open MetaMask and require confirmation. This includes creating a concert, buying a ticket, changing event status, and checking in a ticket. Connecting a wallet, viewing concerts, viewing tickets, generating a QR code, scanning a QR code, and verifying a ticket are read-only actions and do not require gas.

During a ticket purchase, the customer pays the ticket price plus a network gas fee. The ticket price is transferred to the concert organizer, while the gas fee is paid to the BOT Chain network. Users should wait for MetaMask to show that the transaction is confirmed before refreshing the website.

## Check-In Rule

Tickets must be checked in only on the scheduled date of the concert. The current deployed smart contract prevents duplicate check-in and restricts check-in to the concert organizer, but it does not automatically enforce the concert date. For this version, the organizer is responsible for following the date rule and rejecting check-in attempts outside the scheduled date.

## Refreshing Blockchain Data

BOT Chain data changes after a transaction is confirmed. Refresh the relevant page after an action to load the latest blockchain state if the data not changes. This includes:

- A newly created concert
- A ticket purchase and updated remaining supply
- Activating or deactivating a concert
- A completed ticket check-in
- A ticket changing from `VALID` to `USED`

Wait for MetaMask to confirm the transaction before refreshing. Refreshing while a transaction is still pending may show the previous state.

## Live Website

The deployed TrustTicket website is available at:

```text
https://REPLACE_WITH_LIVE_DOMAIN
```

The customer portal is the main page. Organizers can open the **Organizer Portal** from its navigation.

## Network

The production website uses BOT Chain Mainnet:

```text
Network: BOT Chain Mainnet
RPC URL: https://rpc.botchain.ai
Chain ID: 677
Currency: BOT
Explorer: https://scan.botchain.ai/
```

TrustTicket uses the deployed mainnet contract at:

```text
REPLACE_WITH_MAINNET_CONTRACT_ADDRESS
```

BOT on mainnet has real monetary value. Concert creation, ticket purchases, event status changes, and ticket check-in require mainnet gas fees.

## Development: Run Locally

Open PowerShell in the project folder and run:

```powershell
python -m http.server 8081 --bind 127.0.0.1
```

Then open these local development pages:

```text
Customer:  http://localhost:8081/index.html
Organizer: http://localhost:8081/organizer.html
```

Keep the PowerShell window open while using the website. Press `Ctrl + C` to stop the server.

## Main Technologies

- Solidity smart contract
- BOT Chain
- MetaMask
- HTML, CSS, and JavaScript
- Ethers.js v6
- QRCode.js
- html5-qrcode

No traditional database or backend server is required for the current project. The website reads its important concert and ticket data from BOT Chain.
