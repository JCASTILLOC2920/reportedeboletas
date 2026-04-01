/**
 * JC PATH LAB - GESTIÓN DE BOLETAS
 * PROTOCOLO ANTIGRAVITY v4.1 [ARQUITECTO AUTÓNOMO - CORE MODULAR]
 * Optimización Extrema: RAM O(1), CPU Event-Driven, Lazy-Loading
 */

"use strict";

const Antigravity = (() => {
    // 1. CONFIGURACIÓN (INMUTABLE)
    const CONFIG = {
        API_URL: "https://script.google.com/macros/s/AKfycbyeH28qC7HnLvHJ6CtIy4FQ7iiZqOAN339gGMCZsCc8pBfBYJ-XsnpMQoKQOwY76TwG/exec",
        PAGE_SIZE: 10,
        AUTH: { U: "am9zZWhwY2FzdGlsbG8=", P: "NDE0NTc0NjY=" },
        LIBS: {
            DEXIE: "https://cdnjs.cloudflare.com/ajax/libs/dexie/3.2.2/dexie.min.js",
            JSPDF: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        }
    };

    // 2. ESTADO PRIVADO (ENCAPSULADO)
    const state = {
        db: null,
        session: { auth: false },
        ui: { currentSection: 'inicio', clientPage: 1, boletaPage: 1 }
    };

    // 3. CARGADOR DE DEPENDENCIAS (LAZY LOADING)
    const Loader = {
        load(url) {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${url}"]`)) return resolve();
                const s = document.createElement('script');
                s.src = url;
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }
    };

    // 4. MOTOR DE PERSISTENCIA
    const DB = {
        async connect() {
            if (state.db) return state.db;
            await Loader.load(CONFIG.LIBS.DEXIE);
            state.db = new Dexie('LaboratorioDB');
            state.db.version(100).stores({
                clientes: '++id, &ruc, razonSocial, createdAt',
                boletas: '++id, codigo, ruc, fecha, createdAt'
            });
            await state.db.open().catch(e => {
                if (e.name === 'VersionError') UI.notify("Conflicto de Versión. Reinicie DB.", "error");
                throw e;
            });
            return state.db;
        },
        async wipe() {
            if (confirm("¿BORRAR TODO? Acción irreversible.")) {
                if (state.db) await state.db.close();
                await Dexie.delete('LaboratorioDB');
                location.reload();
            }
        }
    };

    // 5. SERVICIOS
    const Services = {
        async sync(action, data) {
            const fd = new FormData();
            fd.append('action', action);
            Object.entries(data).forEach(([k, v]) => fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v));
            return fetch(CONFIG.API_URL, { method: 'POST', body: fd, mode: 'no-cors' }).catch(() => false);
        },
        async exportPDF(id) {
            await Loader.load(CONFIG.LIBS.JSPDF);
            const { jsPDF } = window.jspdf;
            const b = await state.db.boletas.get(id);
            if (!b) return;

            const doc = new jsPDF();
            doc.setFillColor(26, 58, 90).rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255).setFontSize(22).text("JC PATH LAB", 105, 20, { align: "center" });
            doc.setTextColor(0).setFontSize(16).text(`BOLETA: ${b.codigo}`, 15, 50);
            doc.setFontSize(12).text(`Cliente: ${b.razonSocial}`, 15, 70);
            doc.text(`Total: S/ ${b.total.toFixed(2)}`, 15, 90);
            doc.save(`Boleta_${b.codigo}.pdf`);
        }
    };

    // 6. INTERFAZ (UI)
    const UI = {
        notify(m, t = "info") { alert(m); },
        show(id) {
            document.querySelectorAll('main section').forEach(s => s.classList.toggle('active', s.id === id));
            document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(l => l.classList.toggle('active', l.dataset.section === id));
            state.ui.currentSection = id;
            if (id === 'listado') this.renderClientes();
            if (id === 'registro-boletas') this.renderBoletas();
            if (id === 'plantilla') this.initBoletaUI();
        },
        async renderClientes() {
            const db = await DB.connect();
            const body = document.getElementById('clientes-body');
            const data = await db.clientes.orderBy('createdAt').reverse().offset((state.ui.clientPage - 1) * CONFIG.PAGE_SIZE).limit(CONFIG.PAGE_SIZE).toArray();
            body.innerHTML = data.map((c, i) => `
                <tr data-id="${c.id}">
                    <td data-label="ID">${(state.ui.clientPage - 1) * CONFIG.PAGE_SIZE + i + 1}</td>
                    <td data-label="RAZÓN SOCIAL" style="font-weight: 600;">${c.razonSocial}</td>
                    <td data-label="RUC">${c.ruc}</td>
                    <td data-label="ACCIONES">
                        <div class="action-buttons-container">
                            <button class="btn delete-btn" data-action="del-c" style="width: auto; padding: 8px 15px; font-size: 0.7rem;">
                                <i class="fas fa-trash-can"></i> ELIMINAR
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="4">No hay clientes registrados</td></tr>';
        },
        async renderBoletas() {
            const db = await DB.connect();
            const body = document.getElementById('boletas-body');
            const data = await db.boletas.orderBy('createdAt').reverse().offset((state.ui.boletaPage - 1) * CONFIG.PAGE_SIZE).limit(CONFIG.PAGE_SIZE).toArray();
            
            body.innerHTML = data.map(b => `
                <tr data-id="${b.id}">
                    <td data-label="CÓDIGO">${b.codigo}</td>
                    <td data-label="ENTIDAD">${b.razonSocial}</td>
                    <td data-label="FECHA" style="font-size: 0.7rem;">${new Date(b.createdAt).toLocaleDateString()}</td>
                    <td data-label="TOTAL" style="font-weight: 800; color: var(--accent-secondary);">S/ ${b.total.toFixed(2)}</td>
                    <td data-label="ACCIONES">
                        <div class="action-buttons-container">
                            <button class="btn" data-action="print" style="width: auto; padding: 8px 12px; font-size: 0.7rem;">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                            <button class="btn delete-btn" data-action="del-b" style="width: auto; padding: 8px 12px; font-size: 0.7rem;">
                                <i class="fas fa-trash-can"></i> X
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="5">Ninguna boleta en archivo</td></tr>';
        },
        async initBoletaUI() {
            const db = await DB.connect();
            const sel = document.getElementById('cliente-select');
            const cls = await db.clientes.orderBy('razonSocial').toArray();
            sel.innerHTML = '<option value="">Sel. Cliente...</option>' + cls.map(c => `<option value="${c.id}">${c.razonSocial}</option>`).join('');
        }
    };

    // 7. CONTROLADOR (EVENT DELEGATION)
    const Controller = {
        init() {
            this.bind();
            if (sessionStorage.getItem('ag_auth')) document.getElementById('ag-lock-screen').style.display = 'none';
        },
        bind() {
            document.body.addEventListener('click', e => {
                const el = e.target;
                const btn = el.closest('[data-action], [data-section], button, input, a');
                if (!btn) return;

                const act = btn.dataset.action || btn.id;
                const section = btn.dataset.section || btn.closest('[data-section]')?.dataset.section;
                const id = btn.closest('tr')?.dataset.id;
                
                // Navegación
                if (section) UI.show(section);

                // Autenticación
                if (act === 'btn-ingresar') this.login();
                if (act === 'btn-reset-db') DB.wipe();
                if (act === 'toggle-ag-pass') this.togglePass();

                // Acciones de Datos
                if (act === 'registrar-cliente') this.addClient();
                if (act === 'guardar-boleta') this.addBoleta();
                if (act === 'print') Services.exportPDF(parseInt(id));
                if (act === 'del-c' && confirm("¿Eliminar?")) DB.connect().then(db => db.clientes.delete(parseInt(id)).then(() => UI.renderClientes()));
                if (act === 'del-b' && confirm("¿Eliminar?")) DB.connect().then(db => db.boletas.delete(parseInt(id)).then(() => UI.renderBoletas()));
            });

            document.getElementById('cliente-select')?.addEventListener('change', async e => {
                const db = await DB.connect();
                const c = await db.clientes.get(parseInt(e.target.value));
                if (c) { 
                    document.getElementById('ruc-cliente').textContent = c.ruc;
                    document.getElementById('direccion-cliente').textContent = c.direccion;
                    console.log(`ANTIGRAVITY: Cliente '${c.razonSocial}' seleccionado.`);
                }
            });

            document.getElementById('num-muestras')?.addEventListener('input', e => this.renderMuestras(e.target.value));
        },
        login() {
            const userField = document.getElementById('ag-user');
            const passField = document.getElementById('ag-pass');
            
            // Limpieza de espacios accidentales y normalización a minúsculas
            const u = btoa(userField.value.trim().toLowerCase());
            const p = btoa(passField.value.trim());
            
            if (u === CONFIG.AUTH.U && p === CONFIG.AUTH.P) {
                sessionStorage.setItem('ag_auth', 'true');
                document.getElementById('ag-lock-screen').style.display = 'none';
                UI.show('inicio');
            } else {
                document.getElementById('ag-error').style.display = 'block';
                console.warn("ANTIGRAVITY: Intento de acceso fallido.");
            }
        },
        togglePass() {
            const i = document.getElementById('ag-pass');
            const ic = document.getElementById('toggle-ag-pass');
            if (!ic) return console.log("ERROR: Icono de toggle no encontrado");
            const isP = i.type === 'password';
            i.type = isP ? 'text' : 'password';
            ic.className = `fas fa-eye${isP ? '-slash' : ''} toggle-password`;
        },
        async addClient() {
            const db = await DB.connect();
            const data = {
                razonSocial: document.getElementById('razon-social').value,
                ruc: document.getElementById('ruc').value,
                direccion: document.getElementById('direccion').value,
                createdAt: new Date()
            };
            if (!data.ruc) return;
            await db.clientes.add(data);
            UI.show('listado');
            Services.sync('addClient', data);
            document.getElementById('cliente-form').reset();
            console.log(`ANTIGRAVITY: Cliente '${data.razonSocial}' integrado con éxito.`);
        },
        async addBoleta() {
            const db = await DB.connect();
            const sel = document.getElementById('cliente-select');
            const cId = parseInt(sel.value);
            const c = await db.clientes.get(cId);
            if (!c) return UI.notify("Seleccione un cliente");
            
            const ms = Array.from(document.querySelectorAll('.costo-muestra')).map(i => parseFloat(i.value) || 0);
            const b = {
                codigo: `${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                razonSocial: c.razonSocial,
                ruc: c.ruc,
                direccion: c.direccion,
                numMuestras: ms.length,
                total: ms.reduce((a, b) => a + b, 0),
                createdAt: new Date()
            };
            await db.boletas.add(b);
            UI.show('registro-boletas');
            Services.sync('addBoleta', b);
        },
        renderMuestras(n) {
            const c = document.getElementById('costos-container');
            const num = parseInt(n) || 0;
            c.innerHTML = Array.from({length: num}, (_, i) => `<div>Muestra ${i+1}: <input type="number" class="costo-muestra" value="0"></div>`).join('');
        }
    };

    return { init: () => Controller.init() };
})();

document.addEventListener('DOMContentLoaded', () => Antigravity.init());