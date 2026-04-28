const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwFNtXP7zgWWGmIEhthYSRScOuTjeI5WS_yDPtX0zGWM1X2n_boMjitmCcFEbaZmHg/exec';
const USUARIO_MAESTRO = "admin";
const CLAVE_MAESTRA = "JCPATH2026";
const { jsPDF } = window.jspdf;

// --- CONFIGURACIÓN DEL SEGUNDO CEREBRO (FIREBASE) ---
const firebaseConfig = {
  apiKey: "AIzaSyDlghtpLFgjs568nMIZK9q1xaRJHmNsWjI",
  authDomain: "jc-path-lab-brain.firebaseapp.com",
  databaseURL: "https://jc-path-lab-brain-default-rtdb.firebaseio.com",
  projectId: "jc-path-lab-brain",
  storageBucket: "jc-path-lab-brain.firebasestorage.app",
  messagingSenderId: "742605287948",
  appId: "1:742605287948:web:964a38bcaae92dae683429",
  measurementId: "G-PZCRZQH5D4"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const fbDb = firebase.database();

let db;

// --- INICIALIZACIÓN DE LA RED NEURAL (BASE DE DATOS) ---
async function initDatabase() {
    try {
        db = new Dexie('LaboratorioDB');
        db.version(7).stores({
            clientes: '++id, &ruc, razonSocial, createdAt',
            boletas: '++id, codigo, ruc, fecha, createdAt, [fecha+ruc]'
        });
        await db.open();
        console.log("Sistema Neural Online.");
    } catch (e) {
        console.error("Fallo crítico en DB:", e);
    }
}

// --- CAPA DE SEGURIDAD (AUTH) - BYPASS SOBERANO ACTIVADO ---
function handleAuth() {
    // SOBERANÍA TOTAL: Eliminamos la necesidad de clave según directiva del usuario
    sessionStorage.setItem('ag_auth', 'true');
    document.getElementById('ag-lock-screen').style.display = 'none';
    syncFromCloud();
}

function desbloquearSistema() {
    const u = document.getElementById('ag-user').value;
    const p = document.getElementById('ag-pass').value;
    const errorEl = document.getElementById('ag-error');

    if (u === USUARIO_MAESTRO && p === CLAVE_MAESTRA) {
        sessionStorage.setItem('ag_auth', 'true');
        document.getElementById('ag-lock-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('ag-lock-screen').style.display = 'none';
            syncFromCloud();
        }, 500);
    } else {
        errorEl.style.display = 'block';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
    }
}

// --- SINCRONIZACIÓN SOBERANA (DUAL: FIREBASE + SHEETS) ---
async function syncFromCloud() {
    console.log("🚀 Iniciando Sincronización Dual (Alfa + Beta)...");
    const spinner = document.getElementById('search-spinner');
    if (spinner) spinner.style.display = 'block';

    try {
        // 1. Prioridad Beta: Firebase (Velocidad Relámpago)
        fbDb.ref('/').once('value', async (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (data.clientes) {
                    const clientArray = Object.values(data.clientes);
                    await db.clientes.bulkPut(clientArray);
                    console.log(`✅ Beta: ${clientArray.length} Clientes sincronizados.`);
                }
                if (data.boletas) {
                    const boletaArray = Object.values(data.boletas);
                    await db.boletas.bulkPut(boletaArray);
                    console.log(`✅ Beta: ${boletaArray.length} Boletas sincronizadas.`);
                }
                renderAll();
            }
        });

        // 2. Respaldo Alfa: Google Sheets (Consistencia)
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getAllData`);
        if (response.ok) {
            const data = await response.json();
            if (data.clientes && data.clientes.length > 0) {
                await db.clientes.bulkPut(data.clientes);
            }
            if (data.boletas && data.boletas.length > 0) {
                await db.boletas.bulkPut(data.boletas);
            }
            renderAll();
            console.log("✅ Alfa: Sincronización de respaldo completada.");
        }
        
    } catch (err) {
        console.error("❌ ERROR DE SINCRONIZACIÓN:", err);
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

// --- NAVEGACIÓN ---
function showSection(sectionId) {
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(l => {
        l.classList.toggle('active', l.dataset.section === sectionId);
    });
}

// --- GESTIÓN DE CLIENTES ---
async function handleAddClient() {
    const ruc = document.getElementById('ruc').value.trim();
    const razonSocial = document.getElementById('razon-social').value.trim();
    
    if (!ruc || !razonSocial) {
        alert("Campos obligatorios incompletos.");
        return;
    }

    const cliente = {
        razonSocial,
        ruc,
        direccion: document.getElementById('direccion').value,
        telefono: document.getElementById('telefono').value,
        createdAt: new Date()
    };

    try {
        // 1. Guardado Local
        await db.clientes.put(cliente);
        
        // 2. Beta Push: Firebase (Inmediato)
        fbDb.ref('clientes/' + cliente.ruc).set(cliente);
        
        // 3. Alfa Push: Google Sheets
        const formData = new FormData();
        formData.append('action', 'addClient');
        Object.keys(cliente).forEach(k => {
            formData.append(k, k === 'createdAt' ? cliente[k].toISOString() : cliente[k]);
        });
        fetch(APPS_SCRIPT_URL, { method: 'POST', body: formData }).catch(e => console.warn("Alfa Sync Fail:", e));

        document.getElementById('cliente-form').reset();
        showSection('listado');
        renderClientes();
        populateClientSelect();
        
    } catch (e) {
        console.error("Fallo en registro:", e);
        alert("⚠️ Error en registro local.");
    }
}

async function renderClientes() {
    const tbody = document.getElementById('clientes-body');
    tbody.innerHTML = '';
    const clientes = await db.clientes.orderBy('createdAt').reverse().toArray();

    clientes.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${c.id}</td>
            <td><strong>${c.razonSocial}</strong></td>
            <td>${c.ruc}</td>
            <td>
                <button class="btn-mini" onclick="deleteClient(${c.id})" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteClient(id) {
    if (confirm("¿Eliminar cliente?")) {
        await db.clientes.delete(id);
        renderClientes();
        populateClientSelect();
    }
}

// --- GESTIÓN DE BOLETAS ---
async function handleAddBoleta() {
    const clientId = parseInt(document.getElementById('cliente-select').value);
    if (!clientId) return alert("Seleccione un cliente.");

    const cliente = await db.clientes.get(clientId);
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
        createdAt: new Date()
    };

    await db.boletas.add(boleta);
    alert("Boleta generada: " + codigo);
    renderBoletas();
    showSection('registro-boletas');
    
    // Sync with cloud
    const formData = new FormData();
    formData.append('action', 'addBoleta');
    Object.keys(boleta).forEach(k => formData.append(k, k === 'montos' ? JSON.stringify(boleta[k]) : boleta[k]));
    fetch(APPS_SCRIPT_URL, { method: 'POST', body: formData }).catch(e => console.warn(e));
}

async function renderBoletas() {
    const tbody = document.getElementById('boletas-body');
    tbody.innerHTML = '';
    const boletas = await db.boletas.orderBy('createdAt').reverse().toArray();

    boletas.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${b.codigo}</td>
            <td>${b.razonSocial}</td>
            <td>${new Date(b.fecha).toLocaleDateString()}</td>
            <td>S/ ${b.total.toFixed(2)}</td>
            <td>
                <button onclick="imprimirPDF(${b.id})" class="btn-mini" style="background:var(--accent-secondary); color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;"><i class="fas fa-print"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function generarCodigo() {
    const year = new Date().getFullYear();
    const count = await db.boletas.count();
    return `${year}-${(count + 1).toString().padStart(4, '0')}`;
}

// --- UTILIDADES UI ---
function populateClientSelect() {
    const select = document.getElementById('cliente-select');
    db.clientes.toArray().then(clientes => {
        select.innerHTML = '<option value="">-- SELECCIONE UN PERFIL --</option>';
        clientes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.razonSocial;
            select.appendChild(opt);
        });
    });
}

function renderCostoInputs() {
    const num = parseInt(document.getElementById('num-muestras').value) || 0;
    const container = document.getElementById('costos-container');
    container.innerHTML = '';
    for (let i = 1; i <= num; i++) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'costo-muestra';
        input.placeholder = `Precio Muestra ${i}`;
        input.oninput = calcularTotal;
        container.appendChild(input);
    }
    calcularTotal();
}

function calcularTotal() {
    const total = Array.from(document.querySelectorAll('.costo-muestra')).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    document.getElementById('pago-total').textContent = `S/ ${total.toFixed(2)}`;
}

async function imprimirPDF(id) {
    const b = await db.boletas.get(id);
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('JC PATH LAB', 15, 25);
    doc.setFontSize(10);
    doc.text('Protocolo Bio-Analítico Especializado', 15, 32);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.text(`CÓDIGO: ${b.codigo}`, 195, 25, { align: 'right' });
    
    doc.setFontSize(11);
    doc.text(`ENTIDAD: ${b.razonSocial}`, 15, 55);
    doc.text(`RUC/DNI: ${b.ruc}`, 15, 62);
    doc.text(`FECHA: ${new Date(b.fecha).toLocaleDateString()}`, 15, 69);
    
    doc.line(15, 75, 195, 75);
    
    let y = 85;
    b.montos.forEach((m, i) => {
        doc.text(`Procesamiento Muestra #${i+1}`, 20, y);
        doc.text(`S/ ${m.toFixed(2)}`, 190, y, { align: 'right' });
        y += 8;
    });
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL FACTURADO: S/ ${b.total.toFixed(2)}`, 195, y + 10, { align: 'right' });
    
    doc.save(`Boleta_${b.codigo}.pdf`);
}

function renderAll() {
    renderClientes();
    renderBoletas();
    populateClientSelect();
}

// --- EVENTOS ---
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();
    
    // FIX: Renderizado garantizado de la UI local antes de sincronizar
    renderAll();
    renderCostoInputs();
    
    handleAuth();
    
    document.getElementById('btn-ingresar').addEventListener('click', desbloquearSistema);
    document.getElementById('ag-pass').addEventListener('keypress', e => e.key === 'Enter' && desbloquearSistema());
    
    document.getElementById('registrar-cliente').addEventListener('click', handleAddClient);
    document.getElementById('guardar-boleta').addEventListener('click', handleAddBoleta);
    document.getElementById('num-muestras').addEventListener('change', renderCostoInputs);
    
    document.getElementById('toggle-ag-pass').addEventListener('click', function() {
        const input = document.getElementById('ag-pass');
        input.type = input.type === 'password' ? 'text' : 'password';
        this.classList.toggle('fa-eye-slash');
    });

    document.querySelectorAll('.nav-link, .mobile-nav-item, .card').forEach(el => {
        el.addEventListener('click', (e) => {
            const section = el.dataset.section;
            if (section) {
                e.preventDefault();
                showSection(section);
            }
        });
    });

    document.getElementById('cliente-select').addEventListener('change', async e => {
        const id = parseInt(e.target.value);
        if (id) {
            const c = await db.clientes.get(id);
            document.getElementById('ruc-cliente').textContent = c.ruc;
            document.getElementById('direccion-cliente').textContent = c.direccion || "No registrada";
        }
    });

    document.getElementById('btn-reset-db').addEventListener('click', () => {
        if (confirm("ALERTA: Se borrarán todos los datos locales. ¿Continuar?")) {
            Dexie.delete('LaboratorioDB').then(() => location.reload());
        }
    });
});
