(function () {
    "use strict";

    var ADMIN = {
        email: "yahelizb2005@gmail.com",
        id: "01",
        code: "291296"
    };

    var KEYS = {
        admins: "msxii.admins",
        users: "msxii.users",
        session: "msxii.session",
        loginAttempts: "msxii.loginAttempts",
        songs: "msxii.songs",
        albums: "msxii.albums"
    };

    var adminPages = [
        "admin-panel.html",
        "users.html",
        "add-admin.html",
        "stats.html"
    ];

    var userPages = [
        "home.html",
        "biblioteca.html",
        "agregar-cancion.html",
        "agregar-album.html",
        "album.html",
        "editar-album.html",
        "cuenta.html",
        "eliminar-cuenta.html"
    ];

    function currentPage() {
        return window.location.pathname.split("/").pop() || "index.html";
    }

    function disableSavedInputSuggestions(root) {
        root.querySelectorAll("form").forEach(function (form) {
            form.setAttribute("autocomplete", "off");
        });

        root.querySelectorAll("input").forEach(function (input) {
            if (input.type === "file" || input.type === "hidden") {
                return;
            }
            input.setAttribute("autocomplete", "off");
            input.setAttribute("autocorrect", "off");
            input.setAttribute("autocapitalize", "off");
            input.setAttribute("spellcheck", "false");
        });
    }

    function readJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key)) || fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function normalize(value) {
        return String(value || "").trim().toLowerCase();
    }

    function setMessage(form, text, isSuccess) {
        var message = form.querySelector("[data-message]");
        if (!message) {
            return;
        }
        message.textContent = text;
        message.classList.toggle("success", Boolean(isSuccess));
    }

    function rememberSession(type, email) {
        writeJson(KEYS.session, {
            type: type,
            email: email,
            startedAt: new Date().toISOString()
        });
    }

    function getSession() {
        return readJson(KEYS.session, null);
    }

    function clearSession() {
        localStorage.removeItem(KEYS.session);
    }

    function addLoginAttempt() {
        var count = Number(localStorage.getItem(KEYS.loginAttempts) || 0);
        localStorage.setItem(KEYS.loginAttempts, String(count + 1));
    }

    function storageEmail() {
        var session = getSession();
        return normalize(session && session.email);
    }

    function userDataKey(baseKey, email) {
        var account = normalize(email || storageEmail());
        return account ? baseKey + "." + account : baseKey + ".guest";
    }

    function removeUserData(email) {
        localStorage.removeItem(userDataKey(KEYS.songs, email));
        localStorage.removeItem(userDataKey(KEYS.albums, email));
    }

    function createId(prefix) {
        return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    }

    function getUsers() {
        return readJson(KEYS.users, []);
    }

    function saveUsers(users) {
        writeJson(KEYS.users, users);
    }

    function userExists(email) {
        var normalizedEmail = normalize(email);
        return getUsers().some(function (user) {
            return user.email === normalizedEmail;
        });
    }

    function getAdmins() {
        var savedAdmins = readJson(KEYS.admins, []);
        var hasMainAdmin = savedAdmins.some(function (admin) {
            return admin.email === ADMIN.email && admin.id === ADMIN.id;
        });

        if (!hasMainAdmin) {
            savedAdmins.unshift({
                email: ADMIN.email,
                id: ADMIN.id,
                code: ADMIN.code,
                createdAt: "2026-05-15T00:00:00.000Z",
                main: true
            });
        }

        savedAdmins = savedAdmins.filter(function (admin) {
            return admin.main || userExists(admin.email);
        });
        writeJson(KEYS.admins, savedAdmins);
        return savedAdmins;
    }

    function saveAdmins(admins) {
        writeJson(KEYS.admins, admins);
    }

    function removeAdminByEmail(email) {
        saveAdmins(getAdmins().filter(function (admin) {
            return admin.email !== email || admin.main;
        }));
    }

    function getSongs() {
        var key = userDataKey(KEYS.songs);
        var songs = readJson(key, null);
        if (!songs) {
            songs = [];
            writeJson(key, songs);
        }
        return songs;
    }

    function saveSongs(songs) {
        writeJson(userDataKey(KEYS.songs), songs);
    }

    function getAlbums() {
        var key = userDataKey(KEYS.albums);
        var albums = readJson(key, null);
        if (!albums) {
            albums = [];
            writeJson(key, albums);
        }
        return albums;
    }

    function saveAlbums(albums) {
        writeJson(userDataKey(KEYS.albums), albums);
    }

    function escapeHtml(value) {
        return String(value || "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char];
        });
    }

    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function normalizeUrl(value) {
        var url = String(value || "").trim();
        if (!url) {
            return "";
        }
        if (/^https?:\/\//i.test(url)) {
            return url;
        }
        return "https://" + url;
    }

    function songUrl(song) {
        var savedUrl = normalizeUrl(song.url);
        if (savedUrl) {
            return savedUrl;
        }
        return "https://www.youtube.com/results?search_query=" + encodeURIComponent([song.title, song.artist].filter(Boolean).join(" "));
    }

    function fileToDataUrl(file) {
        return new Promise(function (resolve) {
            if (!file) {
                resolve("");
                return;
            }

            var reader = new FileReader();
            reader.onload = function () {
                resolve(String(reader.result || ""));
            };
            reader.onerror = function () {
                resolve("");
            };
            reader.readAsDataURL(file);
        });
    }

    function albumCoverMarkup(album, className) {
        var label = escapeHtml((album && album.name) || "Album");
        var cover = album && album.cover;
        if (cover) {
            return '<span class="' + className + ' has-image"><img src="' + escapeHtml(cover) + '" alt="' + label + '"></span>';
        }
        return '<span class="' + className + '">' + label + "</span>";
    }

    function normalizeAlbumSong(song) {
        if (typeof song === "string") {
            return {
                title: song,
                tags: ""
            };
        }
        return {
            title: String((song && song.title) || "").trim(),
            tags: String((song && song.tags) || "").trim()
        };
    }

    function normalizeAlbumSongs(songs) {
        return (songs || []).map(normalizeAlbumSong).filter(function (song) {
            return song.title;
        });
    }

    function albumLink(album) {
        return normalizeUrl(album && album.link);
    }

    function getAlbumSongsFromForm(form) {
        return Array.prototype.slice.call(form.querySelectorAll(".song-field")).map(function (field) {
            var tagsInput = field.querySelector('[name="albumSongTags"]');
            return {
                title: String(field.querySelector('[name="albumSong"]').value || "").trim(),
                tags: String((tagsInput && tagsInput.value) || "").trim()
            };
        }).filter(function (song) {
            return song.title;
        });
    }

    function setCoverPreview(root, dataUrl) {
        var preview = root.querySelector("[data-cover-preview]");
        var storage = root.querySelector("[data-cover-data]");
        if (!storage) {
            root.insertAdjacentHTML("beforeend", '<input type="hidden" name="coverData" data-cover-data>');
            storage = root.querySelector("[data-cover-data]");
        }
        storage.value = dataUrl || "";
        if (preview) {
            preview.innerHTML = dataUrl ? '<img src="' + escapeHtml(dataUrl) + '" alt="Vista previa">' : "Sin foto";
        }
    }

    async function pasteCoverFromClipboard(root) {
        if (!navigator.clipboard || !navigator.clipboard.read) {
            setMessage(root, "El navegador no permite leer imagenes del portapapeles aqui.", false);
            return;
        }

        try {
            var items = await navigator.clipboard.read();
            for (var i = 0; i < items.length; i += 1) {
                var imageType = items[i].types.find(function (type) {
                    return type.indexOf("image/") === 0;
                });
                if (imageType) {
                    setCoverPreview(root, await fileToDataUrl(await items[i].getType(imageType)));
                    setMessage(root, "Imagen pegada correctamente.", true);
                    return;
                }
            }
            setMessage(root, "No hay una imagen en el portapapeles.", false);
        } catch (error) {
            setMessage(root, "No se pudo leer el portapapeles. Prueba con Ctrl+V sobre la vista previa.", false);
        }
    }

    function readPastedImage(root, clipboardData) {
        var items = clipboardData && clipboardData.items;
        if (!items) {
            return;
        }
        Array.prototype.slice.call(items).some(function (item) {
            if (item.type.indexOf("image/") !== 0) {
                return false;
            }
            var file = item.getAsFile();
            if (!file) {
                return false;
            }
            fileToDataUrl(file).then(function (dataUrl) {
                setCoverPreview(root, dataUrl);
                setMessage(root, "Imagen pegada correctamente.", true);
            });
            return true;
        });
    }

    function createSongField(value, index, canRemove) {
        var song = normalizeAlbumSong(value);
        return [
            '<div class="song-field">',
            "<span>Cancion " + index + "</span>",
            '<input type="text" name="albumSong" value="' + escapeHtml(song.title) + '" placeholder="Titulo de la cancion" aria-label="Titulo de la cancion ' + index + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">',
            '<input type="text" name="albumSongTags" value="' + escapeHtml(song.tags) + '" placeholder="Etiquetas de esta cancion" aria-label="Etiquetas de la cancion ' + index + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">',
            canRemove ? '<button class="button tiny danger" type="button" data-remove-song-field>Quitar</button>' : "",
            "</div>"
        ].join("");
    }

    function renumberSongFields(container) {
        Array.prototype.slice.call(container.querySelectorAll(".song-field span")).forEach(function (label, index) {
            label.textContent = "Cancion " + (index + 1);
        });
    }

    function bindSongFieldControls(root) {
        var container = root.querySelector("[data-song-fields]");
        var addButton = root.querySelector("[data-add-song-field]");
        if (!container || !addButton) {
            return;
        }

        function addSongField() {
            container.insertAdjacentHTML("beforeend", createSongField("", container.querySelectorAll(".song-field").length + 1, true));
            return container.querySelector(".song-field:last-child input");
        }

        addButton.addEventListener("click", function () {
            var input = addSongField();
            if (input) {
                input.focus();
            }
        });

        container.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" || (event.target.name !== "albumSong" && event.target.name !== "albumSongTags")) {
                return;
            }

            event.preventDefault();

            var field = event.target.closest(".song-field");
            var nextInput = field && field.nextElementSibling ? field.nextElementSibling.querySelector('input[name="albumSong"]') : null;
            if (!nextInput) {
                nextInput = addSongField();
            }
            if (nextInput) {
                nextInput.focus();
            }
        });

        container.addEventListener("click", function (event) {
            if (!event.target.hasAttribute("data-remove-song-field")) {
                return;
            }
            event.target.closest(".song-field").remove();
            if (!container.querySelector(".song-field")) {
                container.insertAdjacentHTML("beforeend", createSongField("", 1, false));
            }
            renumberSongFields(container);
        });
    }

    function bindCoverPreview(root) {
        var input = root.querySelector("[data-cover-input]");
        var preview = root.querySelector("[data-cover-preview]");
        if (!input || !preview) {
            return;
        }

        input.addEventListener("change", function () {
            var file = input.files && input.files[0];
            if (!file) {
                setCoverPreview(root, "");
                return;
            }
            var reader = new FileReader();
            reader.onload = function () {
                setCoverPreview(root, String(reader.result || ""));
            };
            reader.readAsDataURL(file);
        });

        var pasteButton = root.querySelector("[data-paste-cover]");
        if (pasteButton) {
            pasteButton.addEventListener("click", function () {
                pasteCoverFromClipboard(root);
            });
        }

        preview.addEventListener("paste", function (event) {
            readPastedImage(root, event.clipboardData);
        });
    }

    function requireAdmin() {
        if (adminPages.indexOf(currentPage()) === -1) {
            return;
        }

        var session = getSession();
        if (!session || session.type !== "admin" || !getAdmins().some(function (admin) { return admin.email === session.email; })) {
            clearSession();
            window.location.href = "admin-login.html";
        }
    }

    function requireUser() {
        if (userPages.indexOf(currentPage()) === -1) {
            return;
        }

        var session = getSession();
        if (!session || session.type !== "user" || !getUsers().some(function (user) { return user.email === session.email; })) {
            clearSession();
            window.location.href = "index.html";
        }
    }

    function bindAdminLogin() {
        var form = document.querySelector("[data-admin-login-form]");
        if (!form) {
            return;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            addLoginAttempt();

            var email = normalize(form.elements.adminEmail.value);
            var id = String(form.elements.adminId.value || "").trim();
            var code = String(form.elements.adminCode.value || "").trim();

            var admin = getAdmins().find(function (item) {
                return item.email === email && item.id === id && item.code === code;
            });

            if (admin) {
                rememberSession("admin", admin.email);
                window.location.href = "admin-panel.html";
                return;
            }

            setMessage(form, "Datos de administrador incorrectos.", false);
        });
    }

    function bindUserLogin() {
        var form = document.querySelector("[data-login-form]");
        if (!form) {
            return;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            addLoginAttempt();

            var email = normalize(form.elements.email.value);
            var password = String(form.elements.password.value || "");
            var user = getUsers().find(function (item) {
                return item.email === email;
            });

            if (!user) {
                setMessage(form, "Ese usuario no existe. Registrese primero.", false);
                return;
            }

            if (user.password !== password) {
                setMessage(form, "Contrasena incorrecta. Use Restablecer contrasena si la olvido.", false);
                return;
            }

            rememberSession("user", user.email);
            window.location.href = "home.html";
        });
    }

    function bindRegister() {
        var form = document.querySelector("[data-register-form]");
        if (!form) {
            return;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var email = normalize(form.elements.email.value);
            var password = String(form.elements.password.value || "").trim();
            var keyword = String(form.elements.keyword.value || "").trim();
            var users = getUsers();

            if (!email || !password || !keyword) {
                setMessage(form, "Complete todos los campos para registrar el usuario.", false);
                return;
            }

            if (email === ADMIN.email || users.some(function (item) { return item.email === email; })) {
                setMessage(form, "Ese correo ya esta registrado.", false);
                return;
            }

            users.push({
                email: email,
                password: password,
                keyword: keyword,
                createdAt: new Date().toISOString()
            });

            saveUsers(users);
            window.location.href = "register-success.html";
        });
    }

    function bindAddAdmin() {
        var form = document.querySelector("[data-add-admin-form]");
        if (!form) {
            return;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            var email = normalize(form.elements.email.value);
            var adminId = String(form.elements.adminId.value || "").trim();
            var code = String(form.elements.code.value || "").trim();
            var confirmCode = String(form.elements.confirmCode.value || "").trim();
            var admins = getAdmins();

            if (!email || !adminId || !code || !confirmCode) {
                setMessage(form, "Complete todos los campos para registrar el admin.", false);
                return;
            }

            if (!userExists(email)) {
                setMessage(form, "Ese correo no pertenece a un usuario registrado.", false);
                return;
            }

            if (code !== confirmCode) {
                setMessage(form, "Los codigos no coinciden.", false);
                return;
            }

            if (admins.some(function (admin) { return admin.email === email || admin.id === adminId; })) {
                setMessage(form, "Ese correo o ID de admin ya existe.", false);
                return;
            }

            admins.push({
                email: email,
                id: adminId,
                code: code,
                createdAt: new Date().toISOString(),
                main: false
            });

            saveAdmins(admins);
            form.reset();
            setMessage(form, "Admin registrado correctamente.", true);
        });
    }

    function renderUsers() {
        var table = document.querySelector("[data-users-table]");
        if (!table) {
            return;
        }

        var users = getUsers();
        var adminEmails = getAdmins().map(function (admin) {
            return admin.email;
        });
        if (!users.length) {
            table.innerHTML = '<tr><td colspan="4">No hay usuarios registrados todav&iacute;a.</td></tr>';
            return;
        }

        table.innerHTML = users.map(function (user) {
            var date = new Date(user.createdAt).toLocaleDateString("es-ES");
            var role = adminEmails.indexOf(user.email) === -1 ? "Usuario" : "Admin";
            var canRemoveAdmin = role === "Admin" && user.email !== ADMIN.email;
            var actions = [
                canRemoveAdmin ? '<button class="button tiny" type="button" data-remove-admin="' + escapeHtml(user.email) + '">Quitar Admin</button>' : "",
                '<button class="button tiny danger" type="button" data-delete-user="' + escapeHtml(user.email) + '">Eliminar</button>'
            ].filter(Boolean).join("");
            return [
                "<tr>",
                "<td>" + role + "</td>",
                "<td>" + escapeHtml(user.email) + "</td>",
                "<td>" + date + "</td>",
                "<td>" + actions + "</td>",
                "</tr>"
            ].join("");
        }).join("");

        table.addEventListener("click", function (event) {
            var button = event.target.closest("button");
            if (!button) {
                return;
            }

            var removeAdminEmail = button.getAttribute("data-remove-admin");
            if (removeAdminEmail) {
                removeAdminByEmail(removeAdminEmail);
                if (getSession() && getSession().email === removeAdminEmail) {
                    clearSession();
                    window.location.href = "admin-login.html";
                    return;
                }
                renderUsers();
                return;
            }

            var email = button.getAttribute("data-delete-user");
            if (!email) {
                return;
            }
            saveUsers(getUsers().filter(function (user) {
                return user.email !== email;
            }));
            removeAdminByEmail(email);
            if (getSession() && getSession().email === email) {
                clearSession();
                window.location.href = "index.html";
                return;
            }
            renderUsers();
        }, { once: true });
    }

    function renderStats() {
        var usersStat = document.querySelector('[data-stat="users"]');
        if (!usersStat) {
            return;
        }

        var users = getUsers();
        var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        var recentUsers = users.filter(function (user) {
            return new Date(user.createdAt).getTime() >= weekAgo;
        });

        usersStat.textContent = String(users.length);
        document.querySelector('[data-stat="week"]').textContent = String(recentUsers.length);
        document.querySelector('[data-stat="logins"]').textContent = localStorage.getItem(KEYS.loginAttempts) || "0";
    }

    function bindResetLoginAttempts() {
        var button = document.querySelector("[data-reset-logins]");
        if (!button) {
            return;
        }

        button.addEventListener("click", function () {
            localStorage.setItem(KEYS.loginAttempts, "0");
            renderStats();
        });
    }

    function renderGreeting() {
        var greeting = document.querySelector("[data-user-greeting]");
        var session = getSession();
        if (greeting && session && session.email) {
            greeting.textContent = "Bienvenido, " + session.email.split("@")[0];
        }
    }

    function renderAccount() {
        var summary = document.querySelector("[data-account-summary]");
        if (!summary) {
            return;
        }

        var session = getSession();
        var user = session && getUsers().find(function (item) {
            return item.email === session.email;
        });

        if (!user) {
            summary.innerHTML = '<p class="form-message">No se pudo cargar la cuenta.</p>';
            return;
        }

        var date = user.createdAt ? new Date(user.createdAt).toLocaleDateString("es-ES") : "Sin fecha";
        var isAdmin = getAdmins().some(function (admin) {
            return admin.email === user.email;
        });
        summary.innerHTML = [
            '<h2 class="account-section-title">Datos del Usuario</h2>',
            '<div class="account-row">',
            "<strong>Correo</strong>",
            "<span>" + escapeHtml(user.email) + "</span>",
            "</div>",
            '<div class="account-row">',
            "<strong>Rol</strong>",
            "<span>" + (isAdmin ? "Administrador" : "Usuario") + "</span>",
            "</div>",
            '<div class="account-row">',
            "<strong>Fecha de registro</strong>",
            "<span>" + escapeHtml(date) + "</span>",
            "</div>",
            '<h2 class="account-section-title">Opciones de Cuenta</h2>',
            '<div class="account-actions">',
            '<a class="button small" href="cambiar-contrasena.html">Cambiar Contrasena</a>',
            '<a class="button small danger" href="eliminar-cuenta.html">Eliminar Cuenta</a>',
            "</div>"
        ].join("");
    }

    function bindChangePassword() {
        var form = document.querySelector("[data-change-password-form]");
        if (!form) {
            return;
        }

        var session = getSession();
        var sessionUser = session && session.type === "user" && getUsers().find(function (item) {
            return item.email === session.email;
        });
        var emailInput = form.querySelector("[data-account-email]");
        if (emailInput && sessionUser) {
            emailInput.value = sessionUser.email;
            emailInput.readOnly = true;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            var users = getUsers();
            var email = normalize(form.elements.email.value || (sessionUser && sessionUser.email));
            var user = users.find(function (item) {
                return item.email === email;
            });
            var keyword = normalize(form.elements.keyword.value);
            var password = String(form.elements.password.value || "").trim();
            var confirmPassword = String(form.elements.confirmPassword.value || "").trim();

            if (!user) {
                setMessage(form, "Ese correo no esta registrado.", false);
                return;
            }

            if (normalize(user.keyword) !== keyword) {
                setMessage(form, "La palabra clave no coincide.", false);
                return;
            }

            if (!password || password !== confirmPassword) {
                setMessage(form, "Las contrasenas no coinciden.", false);
                return;
            }

            user.password = password;
            saveUsers(users);
            window.location.href = "contrasena-cambiada.html";
        });
    }

    function bindDeleteAccount() {
        var button = document.querySelector("[data-confirm-delete-account]");
        if (!button) {
            return;
        }

        button.addEventListener("click", function () {
            var session = getSession();
            if (!session || !session.email) {
                window.location.href = "index.html";
                return;
            }

            saveUsers(getUsers().filter(function (user) {
                return user.email !== session.email;
            }));
            removeAdminByEmail(session.email);
            removeUserData(session.email);
            clearSession();
            window.location.href = "cuenta-eliminada.html";
        });
    }

    function bindLibraryFilters() {
        var form = document.querySelector("[data-library-search]");
        var tabs = document.querySelector(".filter-tabs");
        if (!form && !tabs) {
            return;
        }

        var goToLibrary = function (query) {
            var value = encodeURIComponent(query || "");
            window.location.href = "biblioteca.html" + (value ? "?q=" + value : "");
        };

        if (form) {
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                goToLibrary(form.elements.query.value);
            });
        }

        if (tabs) {
            tabs.addEventListener("click", function (event) {
                var filter = event.target.getAttribute("data-filter");
                if (!filter) {
                    return;
                }
                goToLibrary(filter === "all" ? "" : filter);
            });
        }
    }

    function songMatches(song, query) {
        if (!query) {
            return true;
        }
        var text = [song.title, song.artist, song.album, song.year, song.tags].join(" ").toLowerCase();
        return text.indexOf(query.toLowerCase()) !== -1;
    }

    function albumMatches(album, query) {
        if (!query) {
            return true;
        }

        var text = [album.name, album.artist, album.year, album.tags].join(" ").toLowerCase();
        return text.indexOf(query.toLowerCase()) !== -1;
    }

    function albumSongMatches(song, album, query) {
        if (!query) {
            return false;
        }

        var text = [song.title, song.tags, album.name, album.artist, album.year].join(" ").toLowerCase();
        return text.indexOf(query.toLowerCase()) !== -1;
    }

    function getAlbumSongSearchResults(query) {
        if (!query) {
            return [];
        }

        return getAlbums().reduce(function (results, album) {
            normalizeAlbumSongs(album.songs).forEach(function (song) {
                if (albumSongMatches(song, album, query)) {
                    results.push({
                        title: song.title,
                        artist: album.artist,
                        album: album.name,
                        year: album.year,
                        tags: song.tags,
                        url: albumLink(album),
                        cover: album.cover,
                        albumId: album.id
                    });
                }
            });
            return results;
        }, []);
    }

    function renderSongList() {
        var list = document.querySelector("[data-song-list]");
        if (!list) {
            return;
        }

        var query = getParam("q") || "";
        var search = document.querySelector("[data-library-search] input");
        if (search) {
            search.value = query;
        }

        var songs = getSongs().filter(function (song) {
            return songMatches(song, query);
        }).concat(getAlbumSongSearchResults(query));

        if (!songs.length) {
            list.innerHTML = '<p class="form-message">No hay canciones para esa busqueda.</p>';
            return;
        }

        list.innerHTML = songs.map(function (song) {
            var subtitle = [song.artist, song.album, song.year].filter(Boolean).join(" - ");
            var url = songUrl(song);
            var cover = song.cover ? '<div class="song-cover has-image"><img src="' + escapeHtml(song.cover) + '" alt="' + escapeHtml(song.album || song.title) + '"></div>' : '<div class="song-cover">' + escapeHtml((song.title || "MS").slice(0, 2).toUpperCase()) + "</div>";
            return [
                '<article class="song-row">',
                cover,
                '<div class="song-info">',
                "<strong>" + escapeHtml(song.title) + "</strong>",
                "<span>" + escapeHtml(subtitle) + "</span>",
                "<span>" + escapeHtml(song.tags) + "</span>",
                "</div>",
                '<div class="song-actions">',
                '<a class="button tiny" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + (song.albumId ? "Ver album" : "Abrir enlace") + "</a>",
                song.albumId ? "" : '<button class="button tiny" type="button" data-edit-song="' + escapeHtml(song.id) + '">Editar etiqueta</button>',
                song.albumId ? "" : '<button class="button tiny danger" type="button" data-delete-song="' + escapeHtml(song.id) + '">Eliminar</button>',
                "</div>",
                "</article>"
            ].join("");
        }).join("");

        list.addEventListener("click", function (event) {
            var deleteId = event.target.getAttribute("data-delete-song");
            var editId = event.target.getAttribute("data-edit-song");

            if (deleteId) {
                saveSongs(getSongs().filter(function (song) {
                    return song.id !== deleteId;
                }));
                renderSongList();
            }

            if (editId) {
                var songsToEdit = getSongs();
                var songToEdit = songsToEdit.find(function (song) {
                    return song.id === editId;
                });
                if (songToEdit) {
                    var tags = window.prompt("Editar etiquetas", songToEdit.tags || "");
                    if (tags !== null) {
                        songToEdit.tags = tags;
                        saveSongs(songsToEdit);
                        renderSongList();
                    }
                }
            }
        }, { once: true });
    }

    function renderAlbumList() {
        var list = document.querySelector("[data-album-list]");
        if (!list) {
            return;
        }

        var query = getParam("q") || "";
        var albums = getAlbums().filter(function (album) {
            return albumMatches(album, query);
        });
        if (!albums.length) {
            list.innerHTML = "";
            return;
        }

        list.innerHTML = albums.map(function (album) {
            return [
                '<a class="album-card" href="album.html?id=' + encodeURIComponent(album.id) + '">',
                album.cover ? '<span class="song-cover has-image"><img src="' + escapeHtml(album.cover) + '" alt="' + escapeHtml(album.name) + '"></span>' : '<span class="song-cover">' + escapeHtml((album.name || "AL").slice(0, 2).toUpperCase()) + "</span>",
                "<span>",
                "<strong>" + escapeHtml(album.name) + "</strong>",
                "<span>" + escapeHtml([album.artist, album.year].filter(Boolean).join(" - ")) + "</span>",
                "</span>",
                "</a>"
            ].join("");
        }).join("");
    }

    function bindSongForm() {
        var form = document.querySelector("[data-song-form]");
        if (!form) {
            return;
        }

        bindCoverPreview(form);

        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            var songs = getSongs();
            songs.push({
                id: createId("song"),
                title: String(form.elements.title.value || "").trim(),
                artist: String(form.elements.artist.value || "").trim(),
                album: String(form.elements.album.value || "").trim(),
                year: String(form.elements.year.value || "").trim(),
                tags: String(form.elements.tags.value || "").trim(),
                url: normalizeUrl(form.elements.url.value),
                cover: String((form.elements.coverData && form.elements.coverData.value) || "") || await fileToDataUrl(form.elements.cover.files && form.elements.cover.files[0])
            });
            saveSongs(songs);
            setMessage(form, "Cancion agregada correctamente.", true);
            form.reset();
            setCoverPreview(form, "");
        });
    }

    function bindAlbumForm() {
        var form = document.querySelector("[data-album-form]");
        if (!form) {
            return;
        }

        bindSongFieldControls(form);
        bindCoverPreview(form);

        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            var albums = getAlbums();
            var album = {
                id: createId("album"),
                name: String(form.elements.name.value || "").trim(),
                artist: String(form.elements.artist.value || "").trim(),
                year: String(form.elements.year.value || "").trim(),
                link: normalizeUrl(form.elements.link.value),
                tags: String(form.elements.tags.value || "").trim(),
                cover: String((form.elements.coverData && form.elements.coverData.value) || "") || await fileToDataUrl(form.elements.cover.files && form.elements.cover.files[0]),
                songs: getAlbumSongsFromForm(form)
            };
            albums.push(album);
            saveAlbums(albums);
            window.location.href = "editar-album.html?id=" + encodeURIComponent(album.id);
        });
    }

    function findAlbum() {
        var id = getParam("id");
        return getAlbums().find(function (album) {
            return album.id === id;
        }) || getAlbums()[0];
    }

    function renderAlbumDetail() {
        var detail = document.querySelector("[data-album-detail]");
        if (!detail) {
            return;
        }

        var album = findAlbum();
        if (!album) {
            detail.innerHTML = '<p class="form-message">No hay albumes creados todavia.</p>';
            return;
        }

        detail.innerHTML = [
            albumCoverMarkup(album, "album-cover"),
            '<div class="album-meta">',
            "<h1>" + escapeHtml(album.name) + "</h1>",
            "<p><strong>Artista:</strong> " + escapeHtml(album.artist) + "</p>",
            "<p><strong>Ano:</strong> " + escapeHtml(album.year || "Sin ano") + "</p>",
            "<p><strong>Etiquetas:</strong> " + escapeHtml(album.tags || "Sin etiquetas") + "</p>",
            albumLink(album) ? '<p><strong>Enlace:</strong> <a class="button tiny" href="' + escapeHtml(albumLink(album)) + '" target="_blank" rel="noopener">Abrir album</a></p>' : "",
            normalizeAlbumSongs(album.songs).map(function (song) {
                return [
                    '<div class="album-track">',
                    '<span>' + escapeHtml(song.title) + "</span>",
                    song.tags ? '<small>' + escapeHtml(song.tags) + "</small>" : "",
                    "</div>"
                ].join("");
            }).join(""),
            '<div class="album-actions">',
            '<a class="button tiny" href="editar-album.html?id=' + encodeURIComponent(album.id) + '">Editar Album</a>',
            '<button class="button tiny danger" type="button" data-delete-album="' + escapeHtml(album.id) + '">Eliminar Album</button>',
            "</div>",
            "</div>"
        ].join("");

        detail.addEventListener("click", function (event) {
            var id = event.target.getAttribute("data-delete-album");
            if (!id) {
                return;
            }
            saveAlbums(getAlbums().filter(function (albumItem) {
                return albumItem.id !== id;
            }));
            window.location.href = "biblioteca.html";
        }, { once: true });
    }

    function renderAlbumEditor() {
        var editor = document.querySelector("[data-album-editor]");
        if (!editor) {
            return;
        }

        var album = findAlbum();
        if (!album) {
            editor.innerHTML = '<p class="form-message">No hay albumes creados todavia.</p>';
            return;
        }

        var songs = normalizeAlbumSongs(album.songs);
        if (!songs.length) {
            songs = [{ title: "" }];
        }
        editor.innerHTML = [
            albumCoverMarkup(album, "album-cover"),
            '<form class="music-form" data-edit-album-form autocomplete="off">',
            '<label>Nombre del album <input type="text" name="name" value="' + escapeHtml(album.name) + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></label>',
            '<label>Artista <input type="text" name="artist" value="' + escapeHtml(album.artist) + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></label>',
            '<label>Ano <input type="number" name="year" value="' + escapeHtml(album.year) + '" autocomplete="off"></label>',
            '<label>Enlace del album <input type="text" name="link" value="' + escapeHtml(album.link || "") + '" placeholder="Spotify, YouTube, Apple Music..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></label>',
            '<label>Etiquetas <input type="text" name="tags" value="' + escapeHtml(album.tags) + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></label>',
            '<label>Foto de portada <input type="file" name="cover" accept="image/*" data-cover-input></label>',
            '<div class="cover-preview" data-cover-preview tabindex="0">' + (album.cover ? '<img src="' + escapeHtml(album.cover) + '" alt="Vista previa">' : "Sin foto") + "</div>",
            '<button class="button tiny" type="button" data-paste-cover>Pegar imagen</button>',
            '<div class="songs-editor" data-songs-editor>',
            '<span class="editor-label">Canciones</span>',
            '<div class="song-fields" data-song-fields>',
            songs.map(function (song, index) {
                return createSongField(song, index + 1, index > 0);
            }).join(""),
            "</div>",
            '<button class="button tiny" type="button" data-add-song-field>Agregar cancion</button>',
            "</div>",
            '<button class="button small" type="submit">Guardar cambios</button>',
            '<a class="button tiny" href="album.html?id=' + encodeURIComponent(album.id) + '">Cancelar</a>',
            '<p class="form-message" data-message aria-live="polite"></p>',
            "</form>"
        ].join("");

        var editForm = editor.querySelector("[data-edit-album-form]");
        bindSongFieldControls(editForm);
        bindCoverPreview(editForm);

        editForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            var form = event.currentTarget;
            var albums = getAlbums();
            var albumToSave = albums.find(function (item) {
                return item.id === album.id;
            });
            albumToSave.name = String(form.elements.name.value || "").trim();
            albumToSave.artist = String(form.elements.artist.value || "").trim();
            albumToSave.year = String(form.elements.year.value || "").trim();
            albumToSave.link = normalizeUrl(form.elements.link.value);
            albumToSave.tags = String(form.elements.tags.value || "").trim();
            albumToSave.cover = String((form.elements.coverData && form.elements.coverData.value) || "") || await fileToDataUrl(form.elements.cover.files && form.elements.cover.files[0]) || albumToSave.cover || "";
            albumToSave.songs = getAlbumSongsFromForm(form);
            saveAlbums(albums);
            setMessage(form, "Album actualizado correctamente.", true);
            editor.querySelector(".album-cover").outerHTML = albumCoverMarkup(albumToSave, "album-cover");
        });
    }

    function bindLogout() {
        document.querySelectorAll("[data-logout]").forEach(function (link) {
            link.addEventListener("click", clearSession);
        });
    }

    requireAdmin();
    requireUser();
    disableSavedInputSuggestions(document);
    bindAdminLogin();
    bindUserLogin();
    bindRegister();
    bindAddAdmin();
    renderUsers();
    renderStats();
    bindResetLoginAttempts();
    renderGreeting();
    renderAccount();
    bindChangePassword();
    bindDeleteAccount();
    bindLibraryFilters();
    renderAlbumList();
    renderSongList();
    bindSongForm();
    bindAlbumForm();
    renderAlbumDetail();
    renderAlbumEditor();
    bindLogout();
})();
