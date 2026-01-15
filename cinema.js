// LOCAL STORAGE UTILITIES

function getData(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

const OMDB_API_KEY = "1152eaef";

async function enrichFilmsFromOMDb() {
    for (let film of films) {
        if (film.imdbRating !== undefined) continue;

        try {
            const res = await fetch(
              `http://localhost:3000/omdb?t=${encodeURIComponent(film.title)}`
            );
            const data = await res.json();

            if (data.Response === "True") {
                film.imdbRating = parseFloat(data.imdbRating);
                film.poster = data.Poster;
                film.omdbYear = data.Year;
            } else {
                film.imdbRating = 0;
            }
        } catch (err) {
            console.error("OMDb fetch failed", err);
        }
    }

    setData("films", films);
}

   // NAVIGATION (SPA)
function showSection(section) {
    const sections = ["login-section", "dashboard-section", "films-section", "directors-section", "cinemas-section", "bookings-section"];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add("hidden");
    });

    const activeSection = document.getElementById(section + "-section");
    if (activeSection) activeSection.classList.remove("hidden");

    if (section === 'dashboard') {
    (async () => {
        await enrichFilmsFromOMDb();
        renderDashboard();
    })();
}

    // Update active 
    const buttons = document.querySelectorAll(".sidebar button");
    buttons.forEach(btn => {
        const btnSection = btn.getAttribute("onclick")?.match(/'([^']+)'/)?.[1];
        if (btnSection === section) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Hide sidebar if on login screen
    const sidebar = document.getElementById("main-sidebar");
    if (sidebar) {
        if (section === 'login') {
            sidebar.classList.add("hidden");
        } else {
            sidebar.classList.remove("hidden");
        }
    }
}

   //GLOBAL DATA

let films = getData("films");
let directors = getData("directors");
let cinemas = getData("cinemas");
let bookings = getData("bookings");
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;


   //AUTHENTICATION

const loginForm = document.getElementById("login-form");

function checkAuth() {
    if (!currentUser) {
        showSection('login');
    } else {
        document.getElementById("display-username").textContent = `👤 ${currentUser.username}`;
        document.getElementById("display-role").textContent = `🛡️ ${currentUser.role}`;

        // Handle role-based visibility
        const adminElements = document.querySelectorAll(".admin-only");
        adminElements.forEach(el => {
            if (currentUser.role !== "admin") {
                el.classList.add("hidden");
            } else {
                el.classList.remove("hidden");
            }
        });

        const userElements = document.querySelectorAll(".user-only");
        userElements.forEach(el => {
            if (currentUser.role !== "utilisateur") {
                el.classList.add("hidden");
            } else {
                el.classList.remove("hidden");
            }
        });

        // Refine headers for users
        const filmsHeader = document.getElementById("films-header");
        const cinemasHeader = document.getElementById("cinemas-header");
        if (currentUser.role === "utilisateur") {
            filmsHeader.textContent = "Films";
            cinemasHeader.textContent = "Cinemas";
        } else {
            filmsHeader.textContent = "Films Management";
            cinemasHeader.textContent = "Cinemas Management";
        }

        showSection('dashboard');
    }
}

// Password Security Functions
async function hashPassword7Times(password) {
    let currentHash = password;
    const encoder = new TextEncoder();

    for (let i = 0; i < 7; i++) {
        const data = encoder.encode(currentHash);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        currentHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }
    return currentHash;
}

const toggleTrigger = document.getElementById("toggle-password-trigger");
const loginPasswordInput = document.getElementById("login-password");

if (toggleTrigger) {
    toggleTrigger.addEventListener("click", () => {
        const isPassword = loginPasswordInput.type === "password";
        loginPasswordInput.type = isPassword ? "text" : "password";
        toggleTrigger.textContent = isPassword ? "HIDE" : "SHOW";
        toggleTrigger.classList.toggle("active", isPassword);
    });
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = loginPasswordInput.value;
    const role = document.getElementById("login-role").value;

    const hashedPassword = await hashPassword7Times(password);
    console.log("Password hashed (7 iterations):", hashedPassword);

    currentUser = { username, role };
    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    loginForm.reset();
    loginPasswordInput.type = "password"; 

    checkAuth();
});

function logout() {
    localStorage.removeItem("currentUser");
    currentUser = null;
    location.reload();
}

   //MODULE 1 — FILMS

const filmForm = document.getElementById("film-form");
const filmsTable = document.getElementById("films-table");
const filmDirectorSelect = document.getElementById("film-director");
const filmSort = document.getElementById("film-sort");

const ratingInput = document.getElementById("rating");
const ratingStars = document.querySelectorAll("#rating-stars span");

ratingStars.forEach(star => {
    star.addEventListener("click", () => {
        const value = star.getAttribute("data-value");
        ratingInput.value = value;

        ratingStars.forEach(s =>
            s.classList.toggle("active", s.getAttribute("data-value") <= value)
        );
    });
});

//Populate Director select in Film form
function renderFilmDirectorOptions() {
    filmDirectorSelect.innerHTML = `<option value="">No Director</option>`;
    directors.forEach(d => {
        filmDirectorSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
    });
}

//Render Films Table
function renderFilms(list = films) {
    filmsTable.innerHTML = "";

    list.forEach(film => {
        const director = directors.find(d => d.id === film.directorId);

        const stars = "★".repeat(film.rating).padEnd(5, "☆");

       const isImdb = film.imdbOnly;

        filmsTable.innerHTML += `
<tr style="${isImdb ? "border:2px solid gold;" : ""}">
  <td>${film.title}</td>
  <td>${film.genre}</td>
  <td>${film.releaseDate}</td>
  <td>${film.imdbRating ? film.imdbRating : "—"}</td>
  <td>${director ? director.name : "IMDb"}</td>
  <td>
    ${isImdb
        ? `<button onclick="alert('IMDb Movie — Admin must save it')">IMDb</button>`
        : `
            <button onclick="viewFilm('${film.id}')">View</button>
            <button class="admin-only ${currentUser?.role !== 'admin' ? 'hidden' : ''}" onclick="editFilm('${film.id}')">Edit</button>
            <button class="admin-only ${currentUser?.role !== 'admin' ? 'hidden' : ''}" onclick="deleteFilm('${film.id}')">Delete</button>
          `
    }
  </td>
</tr>
`;

    });
}

// Add / Update Film 
filmForm.addEventListener("submit", e => {
    e.preventDefault();

    const filmIdInput = document.getElementById("film-id");

    const film = {
        id: filmIdInput.value || Date.now().toString(),
        title: document.getElementById("title").value,
        genre: document.getElementById("genre").value,
        releaseDate: document.getElementById("releaseDate").value, 
        rating: Number(ratingInput.value) || 0,
        directorId: filmDirectorSelect.value || null
    };

    films = films.filter(f => f.id !== film.id);
    films.push(film);
    setData("films", films);

    filmForm.reset();
    filmIdInput.value = "";
    ratingInput.value = "";

    ratingStars.forEach(s => s.classList.remove("active"));

    (async () => {
    await enrichFilmsFromOMDb();
    renderFilms();
    renderDirectors();
    renderDashboard();
})();

});

/* ---- Edit Film ---- */
function editFilm(id) {
    const film = films.find(f => f.id === id);

    document.getElementById("film-id").value = film.id;
    document.getElementById("title").value = film.title;
    document.getElementById("genre").value = film.genre;
    document.getElementById("releaseDate").value = film.releaseDate;
    filmDirectorSelect.value = film.directorId || "";

    ratingInput.value = film.rating || "";

    ratingStars.forEach(s =>
        s.classList.toggle("active", s.getAttribute("data-value") <= film.rating)
    );
    setTimeout(enrichFilmsFromOMDb, 500);

}

/* ---- Delete Film ---- */
function deleteFilm(id) {
    if (confirm("Delete this film?")) {
        films = films.filter(f => f.id !== id);
        setData("films", films);
        renderFilms();
        renderDirectors();
        renderDashboard();
    }
}

/* ---- View Film ---- */
function viewFilm(id) {
    const film = films.find(f => f.id === id);
    const director = directors.find(d => d.id === film.directorId);

    alert(`
Title: ${film.title}
Genre: ${film.genre}
Year: ${film.releaseDate}
Rating: ${"★".repeat(film.rating)}
Director: ${director ? director.name : "None"}
  `);
}

/* ---- Sort Films ---- */
filmSort.addEventListener("change", () => {
    let sorted = [...films];

    switch (filmSort.value) {
        case "title-asc":
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case "title-desc":
            sorted.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case "rating-desc":
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        case "rating-asc":
            sorted.sort((a, b) => a.rating - b.rating);
            break;
        case "date-desc":
            sorted.sort((a, b) => Number(b.releaseDate) - Number(a.releaseDate));
            break;
        case "date-asc":
            sorted.sort((a, b) => Number(a.releaseDate) - Number(b.releaseDate));
            break;
    }

    renderFilms(sorted);
}); 


   //MODULE 2 — DIRECTORS

const directorForm = document.getElementById("director-form");
const directorsList = document.getElementById("directors-list");

/* ---- Render Directors ---- */
function renderDirectors() {
    directorsList.innerHTML = "";

    directors.forEach(d => {
        const filmsMade = films.filter(f => f.directorId === d.id);

        directorsList.innerHTML += `
      <div class="director-card">
        <strong>${d.name}</strong> (${d.nationality})
        <p>Films:</p>
        <ul>
          ${filmsMade.length
                ? filmsMade.map(f => `<li>${f.title} (${f.releaseDate})</li>`).join("")
                : "<li>None</li>"
            }
        </ul>
        <button onclick="editDirector('${d.id}')">Edit</button>
        <button onclick="deleteDirector('${d.id}')">Delete</button>
      </div>
    `;
    });
}

/* ---- Add / Update Director ---- */
directorForm.addEventListener("submit", e => {
    e.preventDefault();

    const directorIdInput = document.getElementById("director-id");

    const director = {
        id: directorIdInput.value || Date.now().toString(),
        name: document.getElementById("director-name").value,
        nationality: document.getElementById("nationality").value
    };

    directors = directors.filter(d => d.id !== director.id);
    directors.push(director);
    setData("directors", directors);

    directorForm.reset();
    directorIdInput.value = "";

    renderDirectors();
    renderFilmDirectorOptions();
});

/* ---- Edit Director ---- */
function editDirector(id) {
    const director = directors.find(d => d.id === id);

    document.getElementById("director-id").value = director.id;
    document.getElementById("director-name").value = director.name;
    document.getElementById("nationality").value = director.nationality;
}

/* ---- Delete Director ---- */
function deleteDirector(id) {
    if (confirm("Delete this director?")) {
        directors = directors.filter(d => d.id !== id);
        setData("directors", directors);

        films = films.map(f =>
            f.directorId === id ? { ...f, directorId: null } : f
        );
        setData("films", films);

        renderDirectors();
        renderFilms();
        renderFilmDirectorOptions();
    }
}


/* =========================
   MODULE 4 — CINEMAS
========================= */
const cinemaForm = document.getElementById("cinema-form");
const cinemasList = document.getElementById("cinemas-list");

function renderCinemas() {
    cinemasList.innerHTML = "";
    cinemas.forEach(c => {
        cinemasList.innerHTML += `
            <div class="user-card">
                <strong>${c.name}</strong> - ${c.location}
                <p>Capacity: ${c.capacity}</p>
                <button class="admin-only ${currentUser?.role !== 'admin' ? 'hidden' : ''}" onclick="editCinema('${c.id}')">Edit</button>
                <button class="admin-only ${currentUser?.role !== 'admin' ? 'hidden' : ''}" onclick="deleteCinema('${c.id}')">Delete</button>
            </div>
        `;
    });
}

cinemaForm.addEventListener("submit", e => {
    e.preventDefault();
    const id = document.getElementById("cinema-id").value || Date.now().toString();
    
    const cinema = {
        id,
        name: document.getElementById("cinema-name").value,
        location: document.getElementById("cinema-location").value,
        capacity: document.getElementById("cinema-capacity").value
    };
    cinemas = cinemas.filter(c => c.id !== id);
    cinemas.push(cinema);
    setData("cinemas", cinemas);
    cinemaForm.reset();
    document.getElementById("cinema-id").value = "";
    renderCinemas();
    renderBookingOptions();
    renderDashboard();
});

function editCinema(id) {
    const c = cinemas.find(x => x.id === id);
    document.getElementById("cinema-id").value = c.id;
    document.getElementById("cinema-name").value = c.name;
    document.getElementById("cinema-location").value = c.location;
    document.getElementById("cinema-capacity").value = c.capacity;
}

function deleteCinema(id) {
    if (confirm("Delete cinema?")) {
        cinemas = cinemas.filter(c => c.id !== id);
        setData("cinemas", cinemas);
        renderCinemas();
        renderBookingOptions();
        renderDashboard();
    }
}

/* =========================
   MODULE 5 — BOOKINGS
========================= */
const bookingForm = document.getElementById("booking-form");
const bookingsTable = document.getElementById("bookings-table");
const bookingFilmSelect = document.getElementById("booking-film");
const bookingCinemaSelect = document.getElementById("booking-cinema");

function renderBookingOptions() {
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("booking-date").setAttribute("min", today);

    bookingFilmSelect.innerHTML = `<option value="">Select Film</option>`;
    films.forEach(f => {
        bookingFilmSelect.innerHTML += `<option value="${f.title}">${f.title}</option>`;
    });

    bookingCinemaSelect.innerHTML = `<option value="">Select Cinema</option>`;
    cinemas.forEach(c => {
        bookingCinemaSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    });
}

function renderBookings() {
    bookingsTable.innerHTML = "";
    // Filter bookings for current user
    const userBookings = bookings.filter(b => b.username === currentUser?.username);

    userBookings.forEach(b => {
        bookingsTable.innerHTML += `
            <tr>
                <td>${b.film}</td>
                <td>${b.cinema}</td>
                <td>${b.date}</td>
                <td>${b.seats}</td>
                <td>
                    <button onclick="deleteBooking('${b.id}')">Cancel</button>
                </td>
            </tr>
        `;
    });
}

bookingForm.addEventListener("submit", e => {
    e.preventDefault();

    const selectedDate = document.getElementById("booking-date").value;
    const today = new Date().toISOString().split('T')[0];

    if (selectedDate < today) {
        alert("You cannot book for a past date.");
        return;
    }

    const id = document.getElementById("booking-id").value || Date.now().toString();
    const booking = {
        id,
        username: currentUser.username,
        film: bookingFilmSelect.value,
        cinema: bookingCinemaSelect.value,
        date: document.getElementById("booking-date").value,
        seats: document.getElementById("booking-seats").value
    };
    bookings = bookings.filter(b => b.id !== id);
    bookings.push(booking);
    setData("bookings", bookings);
    bookingForm.reset();
    renderBookings();
    renderDashboard();
});

function deleteBooking(id) {
    if (confirm("Cancel this booking?")) {
        bookings = bookings.filter(b => b.id !== id);
        setData("bookings", bookings);
        renderBookings();
        renderDashboard();
    }
}

/* ---- User Search Films ---- */
const userSearchForm = document.getElementById("user-film-search-form");
const userSearchInput = document.getElementById("user-search-input");

if (userSearchForm) {
    userSearchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const keyword = userSearchInput.value.trim().toLowerCase();

    // 1. Search locally first
    const localMatches = films.filter(f =>
        f.title.toLowerCase().includes(keyword)
    );

    if (localMatches.length > 0) {
        renderFilms(localMatches);
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/omdb?t=${encodeURIComponent(keyword)}`);
        const data = await res.json();

        if (data.Response === "True") {
            const imdbFilm = {
                id: "imdb-" + data.imdbID,
                title: data.Title,
                genre: data.Genre.split(",")[0],
                releaseDate: data.Year,
                rating: Math.round(parseFloat(data.imdbRating) / 2), 
                imdbRating: parseFloat(data.imdbRating),
                directorId: null,
                poster: data.Poster,
                imdbOnly: true
            };

            renderFilms([imdbFilm]);
        } else {
            alert("Movie not found in CineTech or IMDb");
        }
    } catch (err) {
        alert("IMDb lookup failed");
        console.error(err);
    }
});

}

/* ---- User Search Cinemas ---- */
const userCinemaSearchForm = document.getElementById("user-cinema-search-form");
const userCinemaSearchInput = document.getElementById("user-cinema-search-input");

function displayFilteredCinemas(list) {
    const cinemasList = document.getElementById("cinemas-list");
    if (!cinemasList) return;
    cinemasList.innerHTML = "";
    list.forEach(c => {
        cinemasList.innerHTML += `
            <div class="user-card">
                <strong>${c.name}</strong> - ${c.location}
                <p>Capacity: ${c.capacity}</p>
                <button class="admin-only ${currentUser?.role !== 'admin' ? 'hidden' : ''}" onclick="editCinema('${c.id}')">Edit</button>
                <button class="admin-only ${currentUser?.role !== 'admin' ? 'hidden' : ''}" onclick="deleteCinema('${c.id}')">Delete</button>
            </div>
        `;
    });
}

userCinemaSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const keyword = userCinemaSearchInput.value.toLowerCase();

    const filtered = cinemas.filter(c =>
        c.name.toLowerCase().includes(keyword) ||
        c.location.toLowerCase().includes(keyword)
    );

    // Update the UI showing only filtered cinemas
    displayFilteredCinemas(filtered);
});

/* ---- Dashboard KPI Logic ---- */
function renderDashboard() {
    const kpiGrid = document.getElementById("kpi-grid");
    if (!kpiGrid) return;


    kpiGrid.innerHTML = "";

    // Compute API-based stats
   const ratedFilms = films.filter(f => typeof f.imdbRating === "number" && !isNaN(f.imdbRating));

    const avgRating = ratedFilms.length
        ? (ratedFilms.reduce((s, f) => s + f.imdbRating, 0) / ratedFilms.length).toFixed(1)
        : "0";

    const bestFilm = ratedFilms.sort((a, b) => b.imdbRating - a.imdbRating)[0];

    if (currentUser.role === "admin") {
        const stats = [
            { label: "Total Films", value: films.length, icon: "🎬" },
            { label: "Directors", value: directors.length, icon: "🎥" },
            { label: "Cinemas", value: cinemas.length, icon: "🏛️" },
            { label: "Total Bookings", value: bookings.length, icon: "🎫" },
            { label: "Avg IMDb Rating", value: avgRating, icon: "⭐" },
            { label: "Top Movie", value: bestFilm ? bestFilm.title : "N/A", icon: "🏆" }
        ];
        stats.forEach(s => addKpiCard(kpiGrid, s));
    } else {
        const userBookings = bookings.filter(b => b.username === currentUser.username);
        const stats = [
            { label: "My Bookings", value: userBookings.length, icon: "🎫" },
            { label: "Available Movies", value: films.length, icon: "🎬" },
            { label: "Avg IMDb", value: avgRating, icon: "⭐" }
        ];
        stats.forEach(s => addKpiCard(kpiGrid, s));
    }

    // Update Chart
    renderRatingsChart();
}
let ratingsChart;

function renderRatingsChart() {
    const ctx = document.getElementById("ratingsChart");
    if (!ctx) return;

    const labels = films.map(f => f.title);
    const data = films.map(f => f.imdbRating || 0);

    if (ratingsChart) ratingsChart.destroy();

    ratingsChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "IMDb Rating",
                data,
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10
                }
            }
        }
    });
}

function addKpiCard(container, stat) {
    container.innerHTML += `
        <div class="kpi-card">
            <div class="icon">${stat.icon}</div>
            <div class="value">${stat.value}</div>
            <div class="label">${stat.label}</div>
        </div>
    `;
}
/* ---- Dynamic Search Suggestions ---- */
function setupAutocomplete(inputId, datalistId, getSuggestions) {
    const input = document.getElementById(inputId);
    const datalist = document.getElementById(datalistId);

    if (!input || !datalist) return;

    input.addEventListener("input", () => {
        const val = input.value.toLowerCase();
        datalist.innerHTML = "";

        if (val.length < 1) return;

        const allOptions = getSuggestions();
        const filtered = allOptions.filter(s => s.toLowerCase().startsWith(val));

        filtered.forEach(s => {
            const option = document.createElement("option");
            option.value = s;
            datalist.appendChild(option);
        });
    });
}

function initAutocompletes() {
    setupAutocomplete("user-search-input", "films-suggestions", () => {
        const s = new Set();
        films.forEach(f => {
            s.add(f.title);
            s.add(f.genre);
        });
        return Array.from(s);
    });

    setupAutocomplete("user-cinema-search-input", "cinemas-suggestions", () => {
        const s = new Set();
        cinemas.forEach(c => {
            s.add(c.name);
            s.add(c.location);
        });
        return Array.from(s);
    });
}
initAutocompletes();
(async () => {
    await enrichFilmsFromOMDb();
    renderFilmDirectorOptions();
    renderFilms();
    renderDirectors();
    renderCinemas();
    renderBookings();
    renderBookingOptions();
    checkAuth(); 
    renderDashboard(); 
})();