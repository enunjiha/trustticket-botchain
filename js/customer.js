let CONCERTS = [];

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

    return { short: `${day} ${month}`, full: fullDate };
}

async function loadConcerts() {
    if (!TrustTicketContract.configured()) {
        throw new Error("The TrustTicket contract address is not configured.");
    }

    const total = await TrustTicketContract.getTotalConcerts();
    const records = await Promise.all(
        Array.from({ length: total }, (_, index) =>
            TrustTicketContract.getConcert(index + 1)
        )
    );

    CONCERTS = records
        .filter(concert => concert.active)
        .map((concert, index) => {
            const date = dateParts(concert.date);
            return {
                ...concert,
                fullDate: date.full,
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
        <img src="images/hero.png" alt="${c.name} concert">
        <div class="shell hero-content">
            <p class="eyebrow">Featured / On-chain event</p>
            <h1>${c.name}</h1>
            <div class="event-meta">
                <span><i data-lucide="calendar" size="17"></i> ${c.fullDate}</span>
                <span><i data-lucide="map-pin" size="17"></i> ${c.venue}</span>
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
            <div class="concert-image ${c.img}" role="img" aria-label="${c.name} live performance"></div>

            <div class="date-block">
                <small>${c.date.split(" ")[1]}</small>
                ${c.date.split(" ")[0]}
            </div>

            <div>
                <h3>${c.name}</h3>
                <div class="muted">${c.venue}</div>
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
        ? `<img src="images/hero.png" alt="${c.name} performing live">`
        : `<div class="concert-image ${c.img}" style="height:100%;border-radius:0" role="img" aria-label="${c.name} performing live"></div>`;

    root.innerHTML = `
        <section class="detail-visual">
            ${visual}
            <div class="detail-caption">
                <p class="eyebrow">${c.fullDate}</p>
                <h1>${c.name}</h1>
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
                <span>Venue</span>
                <strong>${c.venue}</strong>
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

            ${
                !TrustTicketContract.configured()
                ? `<div class="notice demo">
                        <strong>Demo Mode</strong><br>
                        Contract address is not configured.
                        Purchase creates a local demo ticket only.
                   </div>`
                : ""
            }

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

        if (TrustTicketContract.configured()) {

            if (!owner) {
                owner = await TrustWallet.connect();
            }

            if (!owner) {
                throw new Error("Wallet connection is required.");
            }

            await TrustTicketContract.buyTicket(c.id);

        } else {

            owner = owner || "DEMO-WALLET";

            await new Promise(resolve =>
                setTimeout(resolve, 1100)
            );

        }

        const tickets = JSON.parse(
            localStorage.getItem("trustticket_tickets") || "[]"
        );

        const ticket = {
            ticketId: Date.now().toString().slice(-8),
            concertId: c.id,
            concert: c.name,
            owner,
            date: c.fullDate,
            eventTimestamp: c.eventTimestamp,
            venue: c.venue,
            status: "VALID",
            used: false,
            demo: !TrustTicketContract.configured()
        };

        tickets.unshift(ticket);

        localStorage.setItem(
            "trustticket_tickets",
            JSON.stringify(tickets)
        );

        showToast(
            ticket.demo
                ? "Demo ticket created locally."
                : "Ticket confirmed on-chain."
        );

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

function ticketTimestamp(ticket){
    if(Number(ticket.eventTimestamp))
        return Number(ticket.eventTimestamp);
    return CONCERTS.find(c=>c.id===Number(ticket.concertId))?.eventTimestamp||0
}

function ticketStatus(ticket){
    if(ticket.used===true||String(ticket.status).toUpperCase()==="USED")
        return"USED";const timestamp=ticketTimestamp(ticket);
    if(timestamp&&timestamp*1000<=Date.now())return"EXPIRED";return"VALID"
}

function historyPreviewTickets(){
    if(new URLSearchParams(location.search).get("demoHistory")!=="1")
        return[];
    const now=Math.floor(Date.now()/1000);
    return[
        {
            ticketId:"DEMO-USED",
            concertId:901,
            concert:"Midnight Circuit",
            owner:"DEMO-WALLET",
            date:"12 July 2026 / 8:00 PM",
            eventTimestamp:now-1209600,
            venue:"KL Live",
            status:"USED",
            used:true,
            demo:true
        },
        {
            ticketId:"DEMO-EXPIRED",
            concertId:902,
            concert:"Signal Summer",
            owner:"DEMO-WALLET",
            date:"18 July 2026 / 7:30 PM",
            eventTimestamp:now-604800,
            venue:"RexKL, Kuala Lumpur",
            status:"VALID",
            used:false,
            demo:true
        }
    ]
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
                    ${status}${ticket.demo ? " / DEMO" : ""}
                </span>

                <h2>${ticket.concert}</h2>

                <div class="ticket-info">
                    <div>
                        <strong>Date</strong><br>
                        ${ticket.date}
                    </div>

                    <div>
                        <strong>Venue</strong><br>
                        ${ticket.venue}
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
                            <i data-lucide="${status === "USED" ? "circle-check" : "calendar-x"}" size="17"></i>
                            ${status === "USED" ? "Already checked in" : "Event has ended"}
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

function renderTickets() {

    const root = document.querySelector("#ticket-list");
    if (!root) return;

    const stored = JSON.parse(
        localStorage.getItem("trustticket_tickets") || "[]"
    );

    const tickets = [
        ...stored,
        ...historyPreviewTickets()
    ];

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

    const active = tickets.filter(
        ticket => ticketStatus(ticket) === "VALID"
    );

    const history = tickets.filter(
        ticket => ticketStatus(ticket) !== "VALID"
    );

    root.innerHTML =
        renderTicketSection(
            "Active Tickets",
            "Ready for entry",
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
            TrustQR.open(
                tickets[Number(button.dataset.qr)]
            );
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

    // Load initial page
    route();

});
