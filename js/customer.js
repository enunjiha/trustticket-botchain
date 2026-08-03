let CONCERTS = [];

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function dateParts(timestamp) {
    const date = new Date(timestamp * 1000);
    const day = new Intl.DateTimeFormat("en-MY", { day: "2-digit" }).format(date);
    const month = new Intl.DateTimeFormat("en-MY", { month: "short" }).format(date).toUpperCase();
    const fullDate = new Intl.DateTimeFormat("en-MY", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
    const time = new Intl.DateTimeFormat("en-MY", {
        hour: "numeric",
        minute: "2-digit"
    }).format(date);

    return { short: `${day} ${month}`, full: fullDate, time };
}

async function loadConcerts() {
    if (!TrustTicketContract.configured()) {
        throw new Error("The TrustTicket contract address is not configured.");
    }

    const total = await TrustTicketContract.getTotalConcerts();
    const results = await Promise.allSettled(
        Array.from({ length: total }, (_, index) =>
            TrustTicketContract.getConcert(index + 1)
        )
    );
    const records = results
        .filter(result => result.status === "fulfilled")
        .map(result => result.value);

    results
        .filter(result => result.status === "rejected")
        .forEach(result => console.warn("Skipping unavailable concert:", result.reason));

    CONCERTS = records
        .filter(concert => concert.active && concert.date * 1000 > Date.now())
        .map((concert, index) => {
            const date = dateParts(concert.date);
            return {
                ...concert,
                fullDate: date.full,
                time: date.time,
                eventTimestamp: concert.date,
                date: date.short,
                left: Math.max(0, concert.totalTickets - concert.ticketsSold),
                img: index === 0 ? "hero" : `p${((index - 1) % 3) + 1}`
            };
        });
}

function renderFeaturedConcert() {
    const hero = document.querySelector(".hero");
    const count = document.querySelector(".section-head > .muted");
    if (count) count.textContent = `${CONCERTS.length} event${CONCERTS.length === 1 ? "" : "s"}`;
    if (!hero) return;

    const c = CONCERTS[0];
    if (!c) {
        hero.innerHTML = `
            <img src="images/hero.png" alt="Concert stage under violet lights">
            <div class="shell hero-content">
                <p class="eyebrow">BOTChain verified events</p>
                <h1>No live <span>concerts</span><br>yet</h1>
                <div class="hero-actions">
                    <a class="btn" href="register.html">Create an event</a>
                </div>
            </div>`;
        return;
    }

    hero.innerHTML = `
        <img src="images/hero.png" alt="${escapeHtml(c.name)} concert">
        <div class="shell hero-content">
            <p class="eyebrow">Featured / On-chain event</p>
            <h1>${escapeHtml(c.name)}</h1>
            <div class="event-meta">
                <span><i data-lucide="calendar" size="17"></i> ${c.fullDate}</span>
                <span><i data-lucide="map-pin" size="17"></i> ${escapeHtml(c.venue)}</span>
                <span><i data-lucide="ticket" size="17"></i> ${c.price} BOT</span>
            </div>
            <div class="hero-actions">
                <a class="btn" href="#concert/${c.id}">Get tickets <i data-lucide="arrow-up-right" size="18"></i></a>
                <a class="btn secondary" href="#events">View lineup</a>
            </div>
        </div>
        <div class="shell hero-index"><strong>01</strong> / ${String(CONCERTS.length).padStart(2, "0")}</div>`;
}

window.showToast=(msg,error=false)=>{
    const t=document.querySelector(".toast");
    if(!t)return;
    t.textContent=msg;
    t.className=`toast show${error?" error":""}`;
    clearTimeout(t._timer);
    t._timer=setTimeout(()=>t.className="toast",3500)
};

function renderHome() {
    const list = document.querySelector("#concert-list");
    if (!list) return;

    if (!CONCERTS.length) {
        list.innerHTML = `
            <div class="empty">
                <i data-lucide="calendar-x" size="40"></i>
                <h2>No active concerts</h2>
                <p class="muted">New on-chain concerts will appear here after an organizer creates them.</p>
            </div>`;
        return;
    }

    list.innerHTML = CONCERTS.map(c => `
        <article class="concert-row">
            <div class="concert-image ${c.img}" role="img" aria-label="${escapeHtml(c.name)} live performance"></div>

            <div class="date-block">
                <small>${c.date.split(" ")[1]}</small>
                ${c.date.split(" ")[0]}
                <span class="start-time">${c.time}</span>
            </div>

            <div>
                <h3>${escapeHtml(c.name)}</h3>
                <div class="muted">${escapeHtml(c.venue)}</div>
                <div class="availability ${c.left < 25 ? "low" : ""}">
                    ${c.left} tickets remaining
                </div>
            </div>

            <div class="price">
                ${Number(c.price).toFixed(3)} BOT
            </div>

            <a class="btn secondary" href="#concert/${c.id}">
                View event
            </a>
        </article>
    `).join("");
}

function concertIdFromHash(){
    const match=location.hash.match(/^#concert\/(\d+)$/);
    return Number(match?.[1]||1)
}

function renderDetail() {
    const root = document.querySelector("#event-detail");
    if (!root) return;

    const c = CONCERTS.find(x => x.id === concertIdFromHash());

    if (!c) {
        root.innerHTML = `
            <div class="empty">
                <i data-lucide="calendar-x" size="40"></i>
                <h2>Event unavailable</h2>
                <p class="muted">This event does not exist or is not active on the contract.</p>
                <a class="btn" href="#discover">Browse events</a>
            </div>`;
        lucide.createIcons();
        return;
    }

    const visual = c.img === "hero"
        ? `<img src="images/hero.png" alt="${escapeHtml(c.name)} performing live">`
        : `<div class="concert-image ${c.img}" style="height:100%;border-radius:0" role="img" aria-label="${escapeHtml(c.name)} performing live"></div>`;

    root.innerHTML = `
        <section class="detail-visual">
            ${visual}
            <div class="detail-caption">
                <p class="eyebrow">${c.fullDate}</p>
                <h1>${escapeHtml(c.name)}</h1>
            </div>
        </section>

        <aside class="purchase-panel">
            <p class="eyebrow">General admission</p>
            <h2>Your ticket</h2>

            <div class="fact">
                <span>Date</span>
                <strong>${c.date}</strong>
            </div>

            <div class="fact">
                <span>Time</span>
                <strong>${c.time}</strong>
            </div>

            <div class="fact">
                <span>Venue</span>
                <strong>${escapeHtml(c.venue)}</strong>
            </div>

            <div class="fact">
                <span>Availability</span>
                <strong>${c.left} left</strong>
            </div>

            <div class="purchase-price">
                ${Number(c.price).toFixed(3)} BOT
            </div>

            <div class="muted">
                Network fee not included
            </div>

            <button class="btn" id="buy-ticket">
                <i data-lucide="ticket"></i>
                Buy ticket
            </button>

            <div class="progress" id="tx-progress">
                <div class="progress-line"></div>
                <p>Waiting for confirmation...</p>
            </div>
        </aside>
    `;

    document.querySelector("#buy-ticket").onclick = () => buyTicket(c);

    lucide.createIcons();
}

async function buyTicket(c) {

    const btn = document.querySelector("#buy-ticket");
    const progress = document.querySelector("#tx-progress");

    btn.disabled = true;
    progress.classList.add("active");

    try {

        let owner = TrustWallet.account;

        if (!owner) {
            owner = await TrustWallet.connect();
        }

        if (!owner) throw new Error("Wallet connection is required.");

        const purchase = await TrustTicketContract.buyTicket(c.id);
        showToast(`Ticket #${purchase.ticketId} confirmed on BOTChain.`);

        setTimeout(() => {
            location.hash = "#tickets";
        }, 650);

    } catch (error) {

        showToast(
            error.shortMessage || error.message,
            true
        );

        btn.disabled = false;
        progress.classList.remove("active");

    }

}

function ticketStatus(ticket, now = new Date()){
    if (ticket.used) return "USED";

    const eventTime = new Date(ticket.eventTimestamp * 1000);
    if (now < eventTime) return "UPCOMING";

    const endOfEventDay = new Date(eventTime);
    endOfEventDay.setHours(23, 59, 59, 999);

    return now <= endOfEventDay ? "VALID" : "EXPIRED";
}

function ticketMarkup(ticket, index) {

    const status = ticketStatus(ticket);
    const canShowQr = status === "VALID";

    return `
        <article class="ticket ticket-${status.toLowerCase()}">

            <div class="ticket-stub">
                <span>TRUST<br>TICKET</span>
                <strong>#${ticket.ticketId}</strong>
            </div>

            <div class="ticket-body">

                <span class="ticket-status status-${status.toLowerCase()}">
                    ${status}
                </span>

                <h2>${escapeHtml(ticket.concert)}</h2>

                <div class="ticket-info">
                    <div>
                        <strong>Date</strong><br>
                        ${ticket.date}
                    </div>

                    <div>
                        <strong>Venue</strong><br>
                        ${escapeHtml(ticket.venue)}
                    </div>

                    <div>
                        <strong>Owner</strong><br>
                        ${TrustWallet.short(ticket.owner)}
                    </div>
                </div>

                ${
                    canShowQr
                        ? `
                        <button class="btn secondary" data-qr="${index}">
                            <i data-lucide="qr-code" size="17"></i>
                            View QR
                        </button>
                        `
                        : `
                        <p class="ticket-closed">
                            <i data-lucide="${status === "USED" ? "circle-check" : status === "UPCOMING" ? "clock" : "calendar-x"}" size="17"></i>
                            ${status === "USED" ? "Already checked in" : status === "UPCOMING" ? "QR available at concert time" : "Event check-in has ended"}
                        </p>
                        `
                }

            </div>

        </article>
    `;
}

function renderTicketSection(title, description, tickets, allTickets) {

    const id = title.toLowerCase().replaceAll(" ", "-");

    return `
        <section class="ticket-group" aria-labelledby="${id}">

            <header class="ticket-group-head">

                <div>
                    <p class="eyebrow">${description}</p>
                    <h2 id="${id}">${title}</h2>
                </div>

                <span class="ticket-count">
                    ${tickets.length}
                </span>

            </header>

            <div class="ticket-list">

                ${
                    tickets.length
                        ? tickets
                            .map(ticket =>
                                ticketMarkup(
                                    ticket,
                                    allTickets.indexOf(ticket)
                                )
                            )
                            .join("")
                        : `
                            <div class="empty compact">
                                <i data-lucide="ticket"></i>
                                <h3>No ${title.toLowerCase()}</h3>
                                <p class="muted">
                                    Your ${title.toLowerCase()} will appear here.
                                </p>
                            </div>
                        `
                }

            </div>

        </section>
    `;
}

async function renderTickets() {

    const root = document.querySelector("#ticket-list");
    if (!root) return;

    let owner = TrustWallet.account;
    if (!owner && window.ethereum) {
        [owner] = await window.ethereum.request({ method: "eth_accounts" });
    }

    if (!owner) {
        root.innerHTML = `
            <div class="empty">
                <i data-lucide="wallet" size="40"></i>
                <h2>Connect Your Wallet</h2>
                <p class="muted">Your NFT tickets are loaded from BOTChain for the connected address.</p>
                <button class="btn" id="connect-tickets">Connect wallet</button>
            </div>`;
        document.querySelector("#connect-tickets").onclick = async () => {
            if (await TrustWallet.connect()) renderTickets();
        };
        lucide.createIcons();
        return;
    }

    root.innerHTML = `<div class="empty"><p class="muted">Loading your tickets from BOTChain...</p></div>`;

    let purchased;
    try {
        purchased = await TrustTicketContract.getPurchasedTickets();
    } catch (error) {
        root.innerHTML = `
            <div class="empty">
                <i data-lucide="triangle-alert" size="40"></i>
                <h2>Unable to Load Tickets</h2>
                <p class="muted">${error.shortMessage || error.message}</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    const owned = purchased.filter(ticket =>
        ticket.owner.toLowerCase() === owner.toLowerCase()
    );
    const concertCache = new Map();
    const tickets = await Promise.all(owned.map(async ticket => {
        if (!concertCache.has(ticket.concertId)) {
            concertCache.set(
                ticket.concertId,
                TrustTicketContract.getConcert(ticket.concertId)
            );
        }
        const concert = await concertCache.get(ticket.concertId);
        const formatted = dateParts(concert.date);
        return {
            ...ticket,
            concert: concert.name,
            date: formatted.full,
            eventTimestamp: concert.date,
            venue: concert.venue
        };
    }));

    if (!tickets.length) {

        root.innerHTML = `
            <div class="empty">
                <i data-lucide="ticket" size="40"></i>

                <h2>No Tickets Yet</h2>

                <p class="muted">
                    You haven't purchased any tickets yet.
                </p>

                <a href="#discover" class="btn">
                    Browse Events
                </a>
            </div>
        `;

        lucide.createIcons();
        return;
    }

    const active = tickets.filter(ticket =>
        ["UPCOMING", "VALID"].includes(ticketStatus(ticket))
    );

    const history = tickets.filter(ticket =>
        ["USED", "EXPIRED"].includes(ticketStatus(ticket))
    );

    root.innerHTML =
        renderTicketSection(
            "Active Tickets",
            "Upcoming and ready for entry",
            active,
            tickets
        ) +
        renderTicketSection(
            "Ticket History",
            "Used and past events",
            history,
            tickets
        );

    root.querySelectorAll("[data-qr]").forEach(button => {

        button.onclick = () => {
            const ticket = tickets[Number(button.dataset.qr)];
            if (ticketStatus(ticket) !== "VALID") {
                showToast("This ticket can only be used from the concert start time until the end of that day.", true);
                renderTickets();
                return;
            }
            TrustQR.open(ticket);
        };

    });

    lucide.createIcons();
}

function currentRoute() {

    if (/^#concert\/\d+$/.test(location.hash)) {
        return "concert";
    }

    if (location.hash === "#tickets") {
        return "tickets";
    }

    return "discover";

}

function route(event) {

    const view = currentRoute();

    // Close QR modal if open
    const modal = document.querySelector("#qr-modal");
    if (modal?.open) {
        modal.close();
    }

    // Show current page
    document.querySelectorAll("[data-view]").forEach(page => {
        page.hidden = page.dataset.view !== view;
    });

    // Update navigation
    document.querySelectorAll("[data-nav]").forEach(link => {

        const active =
            link.dataset.nav === view ||
            (view === "concert" && link.dataset.nav === "discover");

        if (active) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }

    });

    document.body.dataset.page = view;

    // Update page title
    switch (view) {

        case "tickets":
            document.title = "My Tickets - TRUSTTICKET";
            renderTickets();
            break;

        case "concert":
            document.title =
                `${CONCERTS.find(c => c.id === concertIdFromHash())?.name || "Event"} - TRUSTTICKET`;

            renderDetail();
            break;

        default:
            document.title = "TRUSTTICKET - Live music, verified";
    }

    // Close mobile menu
    document.querySelector("#nav-links")?.classList.remove("open");
    document.querySelector(".mobile-toggle")
        ?.setAttribute("aria-expanded", "false");

    // Re-render icons
    lucide.createIcons();

    // Scroll behaviour
    if (location.hash === "#events") {

        requestAnimationFrame(() => {
            document.querySelector("#events")
                ?.scrollIntoView({
                    behavior: "smooth"
                });
        });

    } else {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

    // Accessibility
    if (event?.type === "hashchange") {
        document.querySelector("#app-view")
            ?.focus({ preventScroll: true });
    }

}

document.addEventListener("DOMContentLoaded", async () => {

    const list = document.querySelector("#concert-list");
    if (list) {
        list.innerHTML = `<div class="empty"><p class="muted">Loading concerts from BOTChain...</p></div>`;
    }

    try {
        await loadConcerts();
        renderFeaturedConcert();
        renderHome();
    } catch (error) {
        console.error("Unable to load BOTChain concerts:", error);
        if (list) {
            list.innerHTML = `
                <div class="empty">
                    <i data-lucide="triangle-alert" size="40"></i>
                    <h2>Unable to load concerts</h2>
                    <p class="muted">${error.shortMessage || error.message}</p>
                </div>`;
        }
        showToast("Unable to load concerts from BOTChain.", true);
    }

    // Mobile navigation
    const mobileToggle = document.querySelector(".mobile-toggle");

    mobileToggle?.addEventListener("click", event => {

        const nav = document.querySelector("#nav-links");
        const isOpen = nav.classList.toggle("open");

        event.currentTarget.setAttribute(
            "aria-expanded",
            isOpen
        );

    });

    // Handle page routing
    window.addEventListener("hashchange", route);
    window.addEventListener("trustticket:wallet", () => {
        if (currentRoute() === "tickets") renderTickets();
    });

    // Load initial page
    route();

});
