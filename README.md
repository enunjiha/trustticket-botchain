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
7. Edit an owned concert only before it starts and before any ticket is sold, or delete it while no tickets have been sold.
8. Scan the customer's live QR code or upload a saved QR image.
9. If the QR cannot be detected, enter the ticket's readable display ID or its numeric blockchain ticket ID.
10. Verify the ticket, then confirm the check-in transaction in MetaMask.

Only the wallet that created a concert can change its status or check in tickets for that concert.

When an organizer deactivates a concert, the concert is not shown anywhere on the customer page and the smart contract rejects new ticket purchases for it. When the organizer activates it again, the concert appears on the customer page and customers can buy its tickets, provided the concert has not ended and tickets remain available.

Organizers can edit or delete only the concerts that belong to their connected wallet. An owned concert can be edited only before its scheduled start and while zero tickets have been sold. Once the first ticket is sold, the concert can no longer be edited. An owned concert can be deleted only when zero tickets have been sold; if no tickets were sold, it may still be deleted after its scheduled start. Deleting an event removes it from the organizer and customer event views.

The organizer website also prevents exact duplicate concert names. Before creation or editing, it trims the name, collapses repeated spaces, and compares it case-insensitively with every readable concert. For example, `MAMAMOO COMEBACK`, ` mamamoo comeback `, and `MAMAMOO   COMEBACK` are treated as the same name. Use a distinct name such as `MAMAMOO COMEBACK 2026` or `MAMAMOO COMEBACK 2.0`. This uniqueness rule is frontend enforcement only; a direct smart-contract interaction can bypass it.

## Concert Management

From the organizer dashboard, an organizer can manage concerts created by the connected wallet:

- **Activate:** Make the concert visible to customers and allow ticket purchases.
- **Deactivate:** Hide the concert from customers and stop new ticket purchases.
- **Edit:** Update the concert name, date, venue, ticket price, or ticket supply only before the concert starts and before any ticket is sold. Editing is permanently unavailable after the first sale.
- **Delete:** Remove the event from both the organizer dashboard and customer event list only when zero tickets have been sold. A zero-sale event may be deleted even after it has started.

The organizer dashboard shows only concerts created by the connected organizer wallet. Concerts created by another wallet do not appear in that organizer's concert list and cannot be edited, deleted, activated, deactivated, or used for ticket check-in. After a management action is confirmed, refresh the relevant page to display the latest event information.

## Moving Between Portals

- From the customer page, select **Organizer Portal** to open the organizer dashboard.
- From the organizer dashboard, select **Tickets** to return to the main customer page.
- On the customer page, select **Tickets** to browse the active upcoming concerts.

The same MetaMask wallet can move between both portals, but organizer management permissions are always limited to concerts created by that wallet.

## Ticket Lifecycle

Each successful purchase mints a unique NFT ticket to the customer's connected wallet. The ticket appears under **My Tickets** after the transaction is confirmed and the page is refreshed.

The website gives each ticket a readable display ID containing the full concert name and the ticket's serial within that concert. Spaces and punctuation in the concert name are converted to hyphens. For example, the first ticket for `MAMAMOO COMEBACK 2026` is displayed as `MAMAMOO-COMEBACK-2026-T01`. Concert names must be unique, which keeps these display IDs clear across concerts. This display ID is a label for customers and organizers; the underlying blockchain ticket ID remains numeric and is still used in QR payloads, verification, and check-in transactions.

A ticket can have one of these states:

- `UPCOMING`: Check-in has not opened yet. The QR code becomes available one hour before the concert starts.
- `VALID`: Check-in is open and the QR code is available. The window remains open until 24 hours after the concert starts.
- `USED`: The organizer has completed check-in. The customer can no longer open or display the QR code.
- `EXPIRED`: The ticket was not checked in before the window closed 24 hours after the concert started. Its QR code is no longer available.

After a successful check-in, refresh **My Tickets** to load the latest `USED` status from BOT Chain. The used ticket remains visible in ticket history as proof of ownership, but it cannot be used or checked in again.

## Wallet Roles

MetaMask is used instead of a username and password. The same wallet can use both the customer and organizer portals. A wallet becomes the organizer of a concert when it creates that concert. Only that wallet can manage the concert and check in its tickets.

Only one wallet is required to use the complete system. An organizer wallet can also use the customer portal and buy tickets, including a ticket for a concert created by that same wallet. The wallet's permissions depend on the current action: it acts as the organizer when managing its concerts and as the customer when purchasing or viewing its tickets.

For a clearer demonstration of the payment and check-in flow, separate wallets are still recommended:

- One wallet creates and manages the concert as the organizer.
- Another wallet buys and presents the ticket as the customer.

## Transactions and Payments

Actions that change BOT Chain data open MetaMask and require confirmation. This includes creating a concert, buying a ticket, changing event status, and checking in a ticket. Connecting a wallet, viewing concerts, viewing tickets, generating a QR code, scanning a QR code, and verifying a ticket are read-only actions and do not require gas.

During a ticket purchase, the customer pays the ticket price plus a network gas fee. The ticket price is transferred to the concert organizer, while the gas fee is paid to the BOT Chain network. Users should wait for MetaMask to show that the transaction is confirmed before expecting the updated blockchain data to appear.

## Check-In Rule

Check-in opens one hour before the concert start time. From that point, the customer's QR code is available and the organizer can verify and check in the ticket. The window closes exactly 24 hours after the concert starts. An unused ticket becomes `EXPIRED` at that time and can no longer be checked in. Once checked in, it becomes `USED` and cannot be used again.

This time window is enforced by the frontend only. The deployed smart contract still enforces organizer ownership and one-time ticket use, but it does not enforce the concert time. Anyone interacting directly with the contract could bypass the frontend time check.

## Loading Blockchain Data

The website automatically loads the latest BOT Chain data after a transaction is confirmed successfully. Loading from BOT Chain may take a few seconds or longer depending on network and RPC response times, so wait for the loading process to finish before trying the action again.

- After an organizer creates, edits, activates, deactivates, or deletes a concert, the organizer dashboard reloads that wallet's concerts and displays **Loading your concerts from BOTChain...** while waiting.
- After a customer buys a ticket, the website opens **My Tickets** and loads the connected wallet's purchased ticket from BOT Chain.
- After check-in, the organizer dashboard reloads the ticket data so the ticket changes from `VALID` to `USED`.
- Updated ticket supply, sales totals, revenue, concert status, and check-in totals are loaded from the contract rather than saved in the browser.

Wait for the MetaMask transaction to be confirmed before expecting the new information. If the system does not show a loading message after confirmation, refresh the page manually. A manual refresh may also be needed if an RPC delay temporarily causes the previous blockchain state to remain visible.

## Live Website

The deployed TrustTicket website is available at:

```
Live Website: https://www.trustticket.website
```

The customer portal is the main page. Organizers can open the **Organizer Portal** from its navigation.

## Network

The production website uses BOT Chain Mainnet:

```
Network: BOT Chain Mainnet
RPC URL: https://rpc.botchain.ai
Chain ID: 677
Currency: BOT
Explorer: https://scan.botchain.ai/
```

TrustTicket uses the deployed mainnet contract at:

```
Mainnet Contract Address:
0x1395b46309db109209aa4A711E94cd0f9444198f
Deployment Block: 18475946
```

BOT on mainnet has real monetary value. Concert creation, ticket purchases, event status changes, and ticket check-in require mainnet gas fees.

## Development: Run Locally

Open PowerShell in the project folder. Start the website with either Python or PHP; only one local server is needed.

### Option 1: Python

```powershell
python -m http.server 8081 --bind 127.0.0.1
```

### Option 2: PHP

If PHP is available in PowerShell:

```powershell
php -S localhost:8081
```

For the XAMPP PHP installation on Windows:

```powershell
C:\xampp\php\php.exe -S localhost:8081
```

Then open these local development pages:

```
Local Website:  http://localhost:8081/index.html
```

Keep the PowerShell window open while using the website. Press `Ctrl + C` to stop the server.

Python and PHP serve the same frontend files and do not change the website's layout or size. If the page looks larger with one server, check the browser zoom level, window width, and cached CSS, then press `Ctrl + F5` to reload the latest files.

## Main Technologies

- Solidity smart contract
- BOT Chain
- MetaMask
- HTML, CSS, and JavaScript
- Ethers.js v6
- QRCode.js
- html5-qrcode

No traditional database or backend server is required for the current project. The website reads its important concert and ticket data from BOT Chain.
