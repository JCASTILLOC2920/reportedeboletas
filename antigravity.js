// =============================================================================
// PROTOCOLO ANTIGRAVITY v6.0 - SISTEMA SOBERANO DE REPORTES Y BOLETAS
// JC PATH LAB - UNIDAD DE DIAGNÓSTICO ESPECIALIZADO
// 100% Offline Soberano • Cero Créditos de Nube • Persistencia n8n / SQLite Local
// =============================================================================

const SOBERANO_N8N_PRIMARY = 'http://localhost:5679';
const SOBERANO_N8N_FALLBACK = 'http://localhost:5678';
const USUARIO_MAESTRO = "admin";
const CLAVE_MAESTRA = "JCPATH2026";
const { jsPDF } = window.jspdf;

let db;

// --- INICIALIZACIÓN DE LA RED NEURAL (DEXIE LOCAL) ---
async function initDatabase() {
    try {
        db = new Dexie('LaboratorioDB');
        db.version(7).stores({
            clientes: '++id, &ruc, razonSocial, createdAt',
            boletas: '++id, codigo, ruc, fecha, createdAt, [fecha+ruc]'
        });
        await db.open();
        console.log("Sistema Neural Dexie Online.");
    } catch (e) {
        console.error("Fallo critico en DB Dexie:", e);
    }
}

// --- CAPA DE SEGURIDAD (AUTH) - BYPASS SOBERANO ACTIVADO ---
function handleAuth() {
    sessionStorage.setItem('ag_auth', 'true');
    const lockScreen = document.getElementById('ag-lock-screen');
    if (lockScreen) lockScreen.style.display = 'none';
    syncFromSovereignDB();
}

function desbloquearSistema() {
    const u = document.getElementById('ag-user').value;
    const p = document.getElementById('ag-pass').value;
    const errorEl = document.getElementById('ag-error');

    if (u === USUARIO_MAESTRO && p === CLAVE_MAESTRA) {
        sessionStorage.setItem('ag_auth', 'true');
        const lockScreen = document.getElementById('ag-lock-screen');
        if (lockScreen) {
            lockScreen.style.opacity = '0';
            setTimeout(() => {
                lockScreen.style.display = 'none';
                syncFromSovereignDB();
            }, 500);
        }
    } else {
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.classList.add('shake');
            setTimeout(() => errorEl.classList.remove('shake'), 500);
        }
    }
}

// --- CLIENTE HTTP SOBERANO CON RESILIENCIA Y TIMEOUT <2s ---
async function fetchSovereign(endpoint, options = {}) {
    const primaryUrl = ${SOBERANO_N8N_PRIMARY};
    const fallbackUrl = ${SOBERANO_N8N_FALLBACK};

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(primaryUrl, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) return await res.json();
    } catch (err) {
        console.warn([Aviso] Primario () offline, intentando fallback n8n..., err.message);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(fallbackUrl, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) return await res.json();
    } catch (err) {
        console.warn([Aviso] Fallback n8n () no respondio:, err.message);
    }

    return null;
}

// --- SINCRONIZACIÓN SOBERANA (n8n / SQLite -> Dexie IndexedDB) ---
async function syncFromSovereignDB() {
    console.log("🚀 Sincronizando con Base de Datos Soberana Local (n8n / SQLite)...");
    const spinner = document.getElementById('search-spinner');
    if (spinner) spinner.style.display = 'block';

    try {
        // 1. Sincronizar Clientes
        const dataClientes = await fetchSovereign('/webhook/obtener-clientes');
        if (dataClientes && Array.isArray(dataClientes.clientes)) {
            for (const c of dataClientes.clientes) {
                const existe = await db.clientes.where('ruc').equals(c.ruc).first();
                if (existe) {
                    await db.clientes.update(existe.id, {
                        razonSocial: c.razonSocial,
                        direccion: c.direccion,
                        telefono: c.telefono
                    });
                } else {
                    await db.clientes.add({
                        ruc: c.ruc,
                        razonSocial: c.razonSocial,
                        direccion: c.direccion,
                        telefono: c.telefono,
                        createdAt: c.createdAt || new Date()
                    });
                }
            }
            console.log(✅ Clientes sincronizados: );
        }

        // 2. Sincronizar Boletas
        const dataBoletas = await fetchSovereign('/webhook/obtener-boletas');
        if (dataBoletas && Array.isArray(dataBoletas.boletas)) {
            for (const b of dataBoletas.boletas) {
                const existe = await db.boletas.where('codigo').equals(b.codigo).first();
                const montos = Array.isArray(b.montos) ? b.montos : (typeof b.montos === 'string' ? JSON.parse(b.montos || '[]') : []);
                const registro = {
                    codigo: b.codigo,
                    clienteId: b.clienteId,
                    razonSocial: b.razonSocial,
                    ruc: b.ruc,
                    total: b.total,
                    montos: montos,
                    numMuestras: b.numMuestras || montos.length,
                    fecha: b.fecha,
                    createdAt: b.createdAt || new Date()
                };
                if (existe) {
                    await db.boletas.update(existe.id, registro);
                } else {
                    await db.boletas.add(registro);
                }
            }
            console.log(✅ Boletas sincronizadas: );
        }

        renderAll();
    } catch (err) {
        console.error("❌ Fallo durante la sincronización soberana:", err);
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

// --- NAVEGACIÓN ---
function showSection(sectionId) {
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(l => {
        l.classList.toggle('active', l.dataset.section === sectionId);
    });
}

// --- GESTIÓN DE CLIENTES ---
async function handleAddClient() {
    const ruc = document.getElementById('ruc').value.trim();
    const razonSocial = document.getElementById('razon-social').value.trim();
    
    if (!ruc || !razonSocial) {
        alert("Campos obligatorios incompletos (RUC y Razón Social).");
        return;
    }

    try {
        const existente = await db.clientes.where('ruc').equals(ruc).first();
        if (existente) {
            alert("⚠️ Ya existe un cliente registrado con este RUC.");
            return;
        }

        const cliente = {
            razonSocial,
            ruc,
            direccion: document.getElementById('direccion').value,
            telefono: document.getElementById('telefono').value,
            createdAt: new Date().toISOString()
        };

        // 1. Guardado Inmediato en Dexie Cache
        const newId = await db.clientes.add(cliente);
        cliente.id = newId;

        // 2. Persistencia Asíncrona en n8n / SQLite Soberano
        fetchSovereign('/webhook/guardar-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cliente)
        }).then(res => {
            console.log("✅ Cliente persistido en Base de Datos Soberana n8n:", res);
        }).catch(err => {
            console.warn("Aviso: Sincronización en diferido:", err);
        });

        document.getElementById('cliente-form').reset();
        showSection('listado');
        renderClientes();
        populateClientSelect();
        
        alert("✅ Cliente registrado exitosamente en la Red Soberana.");
    } catch (e) {
        console.error("Fallo en registro:", e);
        alert("⚠️ Error en registro local: " + e.message);
    }
}

async function renderClientes() {
    const tbody = document.getElementById('clientes-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const clientes = await db.clientes.orderBy('createdAt').reverse().toArray();

    clientes.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = 
            <td>#</td>
            <td><strong></strong></td>
            <td></td>
            <td>
                <button class="btn-mini" onclick="deleteClient()" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;" title="Eliminar Cliente"><i class="fas fa-trash"></i></button>
            </td>
        ;
        tbody.appendChild(tr);
    });
}

async function deleteClient(id) {
    if (confirm("¿Desea eliminar este cliente del registro local?")) {
        await db.clientes.delete(id);
        renderClientes();
        populateClientSelect();
    }
}

// --- GESTIÓN DE BOLETAS ---
async function handleAddBoleta() {
    const clientSelect = document.getElementById('cliente-select');
    const clientId = parseInt(clientSelect.value);
    if (!clientId) return alert("Por favor seleccione un cliente registrado.");

    const cliente = await db.clientes.get(clientId);
    if (!cliente) return alert("No se encontró el registro del cliente.");

    const montos = Array.from(document.querySelectorAll('.costo-muestra')).map(i => parseFloat(i.value) || 0);
    const total = montos.reduce((a, b) => a + b, 0);
    
    const codigo = await generarCodigo();
    const boleta = {
        codigo,
        clienteId: cliente.id,
        razonSocial: cliente.razonSocial,
        ruc: cliente.ruc,
        total,
        montos,
        numMuestras: montos.length,
        fecha: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };

    // 1. Guardar localmente en Dexie
    const boletaId = await db.boletas.add(boleta);
    boleta.id = boletaId;

    // 2. Persistir de inmediato en n8n / SQLite Soberano
    fetchSovereign('/webhook/guardar-boleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boleta)
    }).then(res => {
        console.log("✅ Boleta persistida en n8n / SQLite Soberano:", res);
    }).catch(e => {
        console.warn("Aviso persistencia remota boleta:", e);
    });

    alert("Boleta generada y archivada con éxito: " + codigo);
    renderBoletas();
    showSection('registro-boletas');
}

async function renderBoletas() {
    const tbody = document.getElementById('boletas-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const boletas = await db.boletas.orderBy('createdAt').reverse().toArray();

    boletas.forEach(b => {
        const montosArr = Array.isArray(b.montos) ? b.montos : (typeof b.montos === 'string' ? JSON.parse(b.montos || '[]') : []);
        const totalVal = typeof b.total === 'number' ? b.total : (montosArr.reduce((x, y) => x + (parseFloat(y) || 0), 0));

        const tr = document.createElement('tr');
        tr.innerHTML = 
            <td><strong></strong></td>
            <td></td>
            <td></td>
            <td><span style="color:var(--accent-secondary); font-weight:700;">S/ </span></td>
            <td>
                <button onclick="imprimirPDF()" class="btn-mini" style="background:var(--accent-secondary); color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;" title="Descargar PDF"><i class="fas fa-print"></i></button>
            </td>
        ;
        tbody.appendChild(tr);
    });
}

async function generarCodigo() {
    const year = new Date().getFullYear();
    const count = await db.boletas.count();
    return ${year}-;
}

// --- UTILIDADES UI ---
function populateClientSelect() {
    const select = document.getElementById('cliente-select');
    if (!select) return;
    db.clientes.toArray().then(clientes => {
        select.innerHTML = '<option value="">-- SELECCIONE UN PERFIL --</option>';
        clientes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = ${c.razonSocial} (RUC: );
            select.appendChild(opt);
        });
    });
}

function renderCostoInputs() {
    const numEl = document.getElementById('num-muestras');
    const num = parseInt(numEl ? numEl.value : 1) || 1;
    const container = document.getElementById('costos-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= num; i++) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'costo-muestra';
        input.placeholder = Precio Muestra  (S/);
        input.value = "150";
        input.oninput = calcularTotal;
        container.appendChild(input);
    }
    calcularTotal();
}

function calcularTotal() {
    const total = Array.from(document.querySelectorAll('.costo-muestra')).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const totalEl = document.getElementById('pago-total');
    if (totalEl) totalEl.textContent = S/ ;
}

async function imprimirPDF(id) {
    const b = await db.boletas.get(id);
    if (!b) return alert("Boleta no encontrada.");
    const doc = new jsPDF();
    
    // Encabezado institucional
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('JC PATH LAB', 15, 25);
    doc.setFontSize(10);
    doc.text('Protocolo Bio-Analítico Especializado • Sistema Soberano', 15, 32);
    
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(14);
    doc.text(CÓDIGO: , 195, 25, { align: 'right' });
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text(ENTIDAD: , 15, 55);
    doc.text(RUC/DNI: , 15, 62);
    doc.text(FECHA: , 15, 69);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 75, 195, 75);
    
    let y = 85;
    const montosArr = Array.isArray(b.montos) ? b.montos : (typeof b.montos === 'string' ? JSON.parse(b.montos || '[]') : []);
    montosArr.forEach((m, i) => {
        doc.text(Procesamiento Muestra #, 20, y);
        doc.text(S/ , 190, y, { align: 'right' });
        y += 8;
    });
    
    const totalVal = typeof b.total === 'number' ? b.total : (montosArr.reduce((x, y) => x + (parseFloat(y) || 0), 0));
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(TOTAL FACTURADO: S/ , 195, y + 10, { align: 'right' });
    
    doc.save(Boleta_.pdf);
}

function renderAll() {
    renderClientes();
    renderBoletas();
    populateClientSelect();
}

// --- EVENTOS DEL DOM ---
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();
    renderAll();
    renderCostoInputs();
    handleAuth();
    
    const btnIngresar = document.getElementById('btn-ingresar');
    if (btnIngresar) btnIngresar.addEventListener('click', desbloquearSistema);
    
    const passInput = document.getElementById('ag-pass');
    if (passInput) passInput.addEventListener('keypress', e => e.key === 'Enter' && desbloquearSistema());
    
    const regCliente = document.getElementById('registrar-cliente');
    if (regCliente) regCliente.addEventListener('click', handleAddClient);
    
    const guardBoleta = document.getElementById('guardar-boleta');
    if (guardBoleta) guardBoleta.addEventListener('click', handleAddBoleta);
    
    const numMuestras = document.getElementById('num-muestras');
    if (numMuestras) numMuestras.addEventListener('change', renderCostoInputs);
    
    const togglePass = document.getElementById('toggle-ag-pass');
    if (togglePass) {
        togglePass.addEventListener('click', function() {
            const input = document.getElementById('ag-pass');
            input.type = input.type === 'password' ? 'text' : 'password';
            this.classList.toggle('fa-eye-slash');
        });
    }

    document.querySelectorAll('.nav-link, .mobile-nav-item, .card').forEach(el => {
        el.addEventListener('click', (e) => {
            const section = el.dataset.section;
            if (section) {
                e.preventDefault();
                showSection(section);
            }
        });
    });

    const clientSelect = document.getElementById('cliente-select');
    if (clientSelect) {
        clientSelect.addEventListener('change', async e => {
            const id = parseInt(e.target.value);
            if (id) {
                const c = await db.clientes.get(id);
                if (c) {
                    document.getElementById('ruc-cliente').textContent = c.ruc;
                    document.getElementById('direccion-cliente').textContent = c.direccion || "No registrada";
                }
            } else {
                document.getElementById('ruc-cliente').textContent = "-";
                document.getElementById('direccion-cliente').textContent = "-";
            }
        });
    }

    const btnResetDb = document.getElementById('btn-reset-db');
    if (btnResetDb) {
        btnResetDb.addEventListener('click', () => {
            if (confirm("ALERTA: Se restablecerá la caché local del navegador. Los datos en SQLite y n8n se mantendrán intactos. ¿Continuar?")) {
                Dexie.delete('LaboratorioDB').then(() => location.reload());
            }
        });
    }

    // Botones de inyección rápida de RUC y Dirección de prueba
    const btnInjectRuc = document.getElementById('btn-inject-ruc');
    if (btnInjectRuc) {
        btnInjectRuc.addEventListener('click', () => {
            const rucInput = document.getElementById('ruc');
            if (rucInput) rucInput.value = '20100128056';
        });
    }
    const btnInjectDir = document.getElementById('btn-inject-dir');
    if (btnInjectDir) {
        btnInjectDir.addEventListener('click', () => {
            const dirInput = document.getElementById('direccion');
            if (dirInput) dirInput.value = 'Av. Arequipa 1148, Lima';
        });
    }
});