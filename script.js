console.log('script.js version 2.5 loaded');

// --- CONFIGURACIÓN GLOBAL ---
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwFNtXP7zgWWGmIEhthYSRScOuTjeI5WS_yDPtX0zGWM1X2n_boMjitmCcFEbaZmHg/exec';
const SUNAT_API_TOKEN = ''; // El usuario puede colocar su token aquí
const { jsPDF } = window.jspdf;
const PAGE_SIZE = 10;
let db, currentClientPage = 1, currentBoletaPage = 1;

// --- BASE DE DATOS (DEXIE) ---
async function initDatabase() {
    try {
        db = new Dexie('LaboratorioDB');
        db.version(7).stores({
            clientes: '++id, &ruc, razonSocial, createdAt',
            boletas: '++id, codigo, ruc, fecha, createdAt, [fecha+ruc]'
        });
        await db.open();
        console.log("DB Inicializada");
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
    }
}

// --- SINCRONIZACIÓN 100% NUBE ---
async function syncFromCloud() {
    const loader = document.createElement('div');
    loader.id = "sync-loader";
    loader.style = "position:fixed; bottom:20px; right:20px; background:var(--primary-color); color:white; padding:10px 20px; border-radius:30px; z-index:9999; font-size:0.8rem; box-shadow:var(--glass-shadow);";
    loader.innerHTML = '<i class="fas fa-sync fa-spin"></i> Sincronizando con la Nube...';
    document.body.appendChild(loader);

    try {
        const response = await fetch(APPS_SCRIPT_URL + "?action=getAllData");
        if (!response.ok) throw new Error("Error de red");
        const data = await response.json();

        if (data.clientes) {
            await db.clientes.clear();
            await db.clientes.bulkPut(data.clientes);
        }
        if (data.boletas) {
            await db.boletas.clear();
            await db.boletas.bulkPut(data.boletas);
        }
        
        console.log("Sincronización completa");
        await Promise.all([renderClientesTable(), renderBoletasTable(), populateClientSelect()]);
    } catch (err) {
        console.error("Fallo de sincronización:", err);
    } finally {
        setTimeout(() => loader.remove(), 1000);
    }
}

// --- AUTOMATIZACIÓN (BÚSQUEDA RUC/NOMBRE) ---
async function buscarDatosSunat(ruc) {
    if (!ruc || ruc.length !== 11) return null;
    try {
        const proxyUrl = "https://api.allorigins.win/raw?url=";
        const apiUrl = `https://api.apis.net.pe/v2/sunat/ruc?numero=${ruc}`;
        const response = await fetch(proxyUrl + encodeURIComponent(apiUrl), {
            headers: {
                'Authorization': `Bearer ${SUNAT_API_TOKEN}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error("Error en consulta RUC:", e.message);
        return null;
    }
}

async function handleBuscarRuc() {
    const ruc = document.getElementById('ruc').value.trim();
    if (!ruc || ruc.length !== 11) {
        alert("Por favor, ingrese un RUC válido de 11 dígitos.");
        return;
    }

    const btn = document.getElementById('btn-buscar-ruc');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    // Limpiar campos antes de la búsqueda
    document.getElementById('razon-social').value = "";
    document.getElementById('direccion').value = "";

    try {
        // Primero buscar en base de datos local
        const local = await db.clientes.where('ruc').equals(ruc).first();
        if (local) {
            document.getElementById('razon-social').value = local.razonSocial;
            document.getElementById('direccion').value = local.direccion || "";
            if (document.getElementById('telefono')) document.getElementById('telefono').value = local.telefono || "";
            if (document.getElementById('email')) document.getElementById('email').value = local.email || "";
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => { btn.innerHTML = originalContent; btn.disabled = false; }, 2000);
            return;
        }

        // Si no está local, buscar en API
        const data = await buscarDatosSunat(ruc);
        if (data) {
            document.getElementById('razon-social').value = data.razonSocial || data.nombre || '';
            document.getElementById('direccion').value = data.direccion || '';
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => { btn.innerHTML = originalContent; btn.disabled = false; }, 2000);
        } else {
            alert("No se encontraron datos automáticos. Ingrese los datos manualmente.");
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

async function handleBuscarNombre() {
    const nombre = document.getElementById('razon-social').value.trim();
    if (!nombre) return;

    const btn = document.getElementById('btn-buscar-nombre');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // Búsqueda inteligente en DB Local
    const cliente = await db.clientes.filter(c => c.razonSocial.toLowerCase().includes(nombre.toLowerCase())).first();
    if (cliente) {
        document.getElementById('ruc').value = cliente.ruc;
        document.getElementById('direccion').value = cliente.direccion;
        document.getElementById('telefono').value = cliente.telefono;
        document.getElementById('email').value = cliente.email;
        btn.innerHTML = '<i class="fas fa-check"></i>';
    } else {
        alert("Cliente no encontrado en la base de datos local. Intente buscar por RUC para completar datos nuevos.");
        btn.innerHTML = '<i class="fas fa-search-plus"></i>';
    }
}

// --- REPORTES ---
async function actualizarReportes() {
    try {
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
        
        // Uso de índice para rendimiento O(log n)
        const boletasMes = await db.boletas.where('fecha').aboveOrEqual(inicioMes).toArray();
        
        const totalMes = boletasMes.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
        const muestrasMes = boletasMes.reduce((sum, b) => sum + (parseInt(b.numMuestras) || 0), 0);
        const clientesCount = await db.clientes.count();

        document.getElementById('reporte-total-mes').textContent = `S/ ${totalMes.toFixed(2)}`;
        document.getElementById('reporte-muestras-mes').textContent = muestrasMes;
        document.getElementById('reporte-clientes-activos').textContent = clientesCount;
    } catch (err) {
        console.error("Error en reportes:", err);
    }
}

// --- LÓGICA DE LA APLICACIÓN ---
function showSection(sectionId) {
    document.querySelectorAll('main section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });

    if (sectionId === 'reportes') actualizarReportes();

    const navMenu = document.querySelector('.nav-menu');
    if (navMenu && navMenu.classList.contains('active')) {
        document.querySelector('.hamburger').classList.remove('active');
        navMenu.classList.remove('active');
    }
}

function setupEventListeners() {
    document.querySelectorAll('.nav-link, .card, .logo').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const section = el.dataset.section || 'inicio';
            showSection(section);
        });
    });

    document.querySelector('.hamburger').addEventListener('click', () => {
        document.querySelector('.hamburger').classList.toggle('active');
        document.querySelector('.nav-menu').classList.toggle('active');
    });

    document.getElementById('registrar-cliente').addEventListener('click', handleAddClient);
    document.getElementById('guardar-boleta').addEventListener('click', handleAddBoleta);
    document.getElementById('num-muestras').addEventListener('change', renderCostoInputs);
    
    document.getElementById('btn-buscar-ruc').addEventListener('click', handleBuscarRuc);
    document.getElementById('btn-buscar-nombre').addEventListener('click', handleBuscarNombre);

    document.getElementById('prev-clientes').addEventListener('click', () => { if (currentClientPage > 1) { currentClientPage--; renderClientesTable(); } });
    document.getElementById('next-clientes').addEventListener('click', async () => { 
        const count = await db.clientes.count(); 
        if (currentClientPage * PAGE_SIZE < count) { currentClientPage++; renderClientesTable(); } 
    });
    document.getElementById('prev-boletas').addEventListener('click', () => { if (currentBoletaPage > 1) { currentBoletaPage--; renderBoletasTable(); } });
    document.getElementById('next-boletas').addEventListener('click', async () => { 
        const count = await db.boletas.count();
        if (currentBoletaPage * PAGE_SIZE < count) { currentBoletaPage++; renderBoletasTable(); }
    });
    
    document.getElementById('clientes-body').addEventListener('click', handleDeleteClient);
    document.getElementById('boletas-body').addEventListener('click', handleBoletaActions);
    document.getElementById('cliente-select').addEventListener('change', handleClientSelectChange);
    
    // Toggle Password Visibility
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('ag-pass');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                this.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    }

    // Registro de Service Worker para PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('SW registrado', reg))
                .catch(err => console.log('SW error', err));
        });
    }
}

// --- MANEJO DE CLIENTES ---
async function handleAddClient() {
    const rucInput = document.getElementById('ruc');
    const ruc = rucInput.value.trim();
    if (!ruc) { alert('El RUC es obligatorio.'); return; }

    const clienteExistente = await db.clientes.where('ruc').equals(ruc).first();
    if (clienteExistente) { alert('Ya existe un cliente con este RUC.'); return; }

    const nuevoCliente = {
        razonSocial: document.getElementById('razon-social').value,
        ruc: ruc,
        direccion: document.getElementById('direccion').value,
        telefono: document.getElementById('telefono').value,
        email: document.getElementById('email').value,
        createdAt: new Date()
    };

    try {
        await db.clientes.add(nuevoCliente);
        alert('Cliente registrado exitosamente.');
        document.getElementById('cliente-form').reset();
        renderClientesTable();
        populateClientSelect();
        showSection('listado');
        
        // Sincronización no bloqueante
        addClientToSheet(nuevoCliente).catch(e => console.warn("Sync error:", e));
    } catch (error) {
        console.error('Error:', error);
        alert('Error al registrar cliente: ' + error.message);
    }
}

async function handleDeleteClient(e) {
    const button = e.target.closest('.eliminar-btn');
    if (button) {
        const id = parseInt(button.dataset.id);
        if (confirm('¿Eliminar este cliente?')) {
            await db.clientes.delete(id);
            renderClientesTable();
            populateClientSelect();
        }
    }
}

async function renderClientesTable() {
    const tbody = document.getElementById('clientes-body');
    tbody.innerHTML = '';
    const count = await db.clientes.count();
    const totalPages = Math.ceil(count / PAGE_SIZE) || 1;
    document.getElementById('clientes-page').textContent = `${currentClientPage} de ${totalPages}`;

    const clientes = await db.clientes.orderBy('createdAt').reverse().offset((currentClientPage - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray();
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay clientes registrados</td></tr>';
        return;
    }

    clientes.forEach((cliente, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="#">${(currentClientPage - 1) * PAGE_SIZE + index + 1}</td>
            <td data-label="Razón Social">${cliente.razonSocial}</td>
            <td data-label="RUC">${cliente.ruc}</td>
            <td data-label="Dirección">${cliente.direccion}</td>
            <td data-label="Teléfono">${cliente.telefono}</td>
            <td data-label="Email">${cliente.email}</td>
            <td data-label="Acciones" class="action-buttons"><button class="btn eliminar-btn" style="background:#ef4444;" data-id="${cliente.id}">Borrar</button></td>
        `;
        tbody.appendChild(row);
    });
}

async function populateClientSelect() {
    const select = document.getElementById('cliente-select');
    select.innerHTML = '<option value="">Seleccione un cliente</option>';
    const clientes = await db.clientes.orderBy('razonSocial').toArray();
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.razonSocial;
        select.appendChild(option);
    });
}

async function handleClientSelectChange() {
    const select = document.getElementById('cliente-select');
    const clienteId = parseInt(select.value);
    const rucVal = document.getElementById('ruc-cliente');
    const dirVal = document.getElementById('direccion-cliente');

    if (!clienteId) { rucVal.textContent = '-'; dirVal.textContent = '-'; return; }
    
    const cliente = await db.clientes.get(clienteId);
    rucVal.textContent = cliente.ruc;
    dirVal.textContent = cliente.direccion;
}

// --- MANEJO DE BOLETAS ---
async function handleAddBoleta() {
    const select = document.getElementById('cliente-select');
    const clientId = parseInt(select.value);
    
    if (!clientId) {
        alert('Por favor, seleccione un cliente de la lista.');
        return;
    }

    try {
        const cliente = await db.clientes.get(clientId);
        if (!cliente) throw new Error("Cliente no encontrado en la base de datos.");

        const costInputs = document.querySelectorAll('.costo-muestra');
        if (costInputs.length === 0) throw new Error("Debe registrar al menos una muestra.");

        const montos = Array.from(costInputs).map(input => {
            const val = parseFloat(input.value);
            return isNaN(val) ? 0 : val;
        });
        
        const total = montos.reduce((a, b) => a + b, 0);
        const codigo = await generarCodigoBoleta();

        const nuevaBoleta = {
            codigo,
            clienteId: cliente.id,
            razonSocial: cliente.razonSocial,
            ruc: cliente.ruc,
            direccion: cliente.direccion || "No especificada",
            telefono: cliente.telefono || "",
            email: cliente.email || "",
            total: total,
            montos: montos,
            numMuestras: montos.length,
            cancelado: false,
            fecha: new Date().toISOString(),
            createdAt: new Date()
        };

        const id = await db.boletas.add(nuevaBoleta);
        alert(`Boleta ${codigo} guardada exitosamente.`);
        
        // Reset UI
        document.getElementById('boleta-form').reset();
        renderCostoInputs();
        renderBoletasTable();
        handleClientSelectChange();
        showSection('registro-boletas');
        
        // Sync (Async)
        addBoletaToSheet(nuevaBoleta).catch(e => console.error("Error Sheet Sync:", e));
    } catch (err) {
        console.error("Error al guardar boleta:", err);
        alert(err.message);
    }
}

async function handleBoletaActions(e) {
    const target = e.target;
    if (target.classList.contains('cancelado-checkbox')) {
        await db.boletas.update(parseInt(target.dataset.id), { cancelado: target.checked });
        renderBoletasTable();
        return;
    }

    const button = target.closest('.btn');
    if (!button || !button.dataset.id) return;
    const id = parseInt(button.dataset.id);

    if (button.classList.contains('delete-boleta')) {
        if (confirm('¿Eliminar boleta?')) {
            await db.boletas.delete(id);
            renderBoletasTable();
        }
    } else if (button.classList.contains('print-boleta')) {
        generarPDFBoleta(id);
    } else if (button.classList.contains('share-boleta')) {
        compartirPDFBoleta(id);
    }
}

async function renderBoletasTable() {
    const tbody = document.getElementById('boletas-body');
    tbody.innerHTML = '';
    const count = await db.boletas.count();
    const totalPages = Math.ceil(count / PAGE_SIZE) || 1;
    document.getElementById('boletas-page').textContent = `${currentBoletaPage} de ${totalPages}`;

    const boletas = await db.boletas.orderBy('createdAt').reverse().offset((currentBoletaPage - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray();

    if (boletas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay boletas</td></tr>';
        return;
    }

    boletas.forEach(boleta => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Código">${boleta.codigo}</td>
            <td data-label="Cliente">${boleta.razonSocial}</td>
            <td data-label="Muestras">${boleta.numMuestras}</td>
            <td data-label="Total">S/ ${boleta.total.toFixed(2)}</td>
            <td data-label="Estado"><input type="checkbox" class="cancelado-checkbox" data-id="${boleta.id}" ${boleta.cancelado ? 'checked' : ''}> Pagado</td>
            <td data-label="Acciones" class="action-buttons">
                <button class="btn share-boleta" style="background:#25d366;" data-id="${boleta.id}" title="Compartir WhatsApp"><i class="fas fa-share-alt"></i></button>
                <button class="btn print-boleta" data-id="${boleta.id}" title="Imprimir PDF"><i class="fas fa-print"></i></button>
                <button class="btn delete-boleta" style="background:#ef4444;" data-id="${boleta.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderCostoInputs() {
    const num = parseInt(document.getElementById('num-muestras').value) || 1;
    const container = document.getElementById('costos-container');
    container.innerHTML = '';
    for (let i = 1; i <= num; i++) {
        const div = document.createElement('div');
        div.className = 'template-row';
        div.innerHTML = `<label>Muestra ${i}:</label><input type="number" class="costo-muestra" step="0.01" placeholder="0.00">`;
        container.appendChild(div);
    }
    document.querySelectorAll('.costo-muestra').forEach(input => input.addEventListener('input', calcularTotal));
    calcularTotal();
}

function calcularTotal() {
    const total = Array.from(document.querySelectorAll('.costo-muestra')).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
    document.getElementById('pago-total').textContent = `S/ ${total.toFixed(2)}`;
}

async function generarCodigoBoleta() {
    const year = new Date().getFullYear();
    const boletas = await db.boletas.toArray();
    const delAno = boletas.filter(b => b.codigo.startsWith(year.toString()));
    let max = 0;
    delAno.forEach(b => {
        const n = parseInt(b.codigo.split('-')[1]);
        if (n > max) max = n;
    });
    return `${year}-${(max + 1).toString().padStart(4, '0')}`;
}

async function addClientToSheet(cliente) {
    const formData = new FormData();
    formData.append('action', 'addClient');
    Object.keys(cliente).forEach(k => formData.append(k, k === 'createdAt' ? cliente[k].toISOString() : cliente[k]));
    try { await fetch(APPS_SCRIPT_URL, { method: 'POST', body: formData }); } catch (e) { console.warn("Error Sheets:", e); }
}

async function addBoletaToSheet(boleta) {
    const formData = new FormData();
    formData.append('action', 'addBoleta');
    Object.keys(boleta).forEach(k => formData.append(k, k === 'montos' ? JSON.stringify(boleta[k]) : boleta[k]));
    try { await fetch(APPS_SCRIPT_URL, { method: 'POST', body: formData }); } catch (e) { console.warn("Error Sheets:", e); }
    if (boleta.telefono) {
        let msg = `Hola ${boleta.razonSocial}, adjunto tu boleta por S/${boleta.total}.`;
        window.open(`https://wa.me/51${boleta.telefono}?text=${encodeURIComponent(msg)}`, '_blank');
    }
}

// --- PDF PREMIUM ---
async function generarPDFBoleta(id) {
    try {
        const b = await db.boletas.get(id);
        if (!b) throw new Error("La boleta solicitada no existe.");

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Estilos Base
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('JC PATH LAB', 15, 25);
        doc.setFontSize(10);
        doc.text('Laboratorio de Anatomía Patológica', 15, 32);
        
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.text(`BOLETA: ${b.codigo || 'S/N'}`, 195, 25, { align: 'right' });
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date(b.fecha).toLocaleDateString()}`, 195, 32, { align: 'right' });

        // Línea divisoria
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 45, 195, 45);

        // Info Cliente
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('DATOS DEL CLIENTE:', 15, 55);
        doc.setFont(undefined, 'normal');
        doc.text(`Razón Social: ${b.razonSocial || 'N/A'}`, 15, 62);
        doc.text(`RUC/DNI: ${b.ruc || 'N/A'}`, 15, 68);
        doc.text(`Dirección: ${b.direccion || 'No especificada'}`, 15, 74);

        // Tabla de Muestras
        doc.setFillColor(248, 250, 252);
        doc.rect(15, 85, 180, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.text('DETALLE', 20, 91);
        doc.text('MONTO (S/)', 190, 91, { align: 'right' });
        doc.setFont(undefined, 'normal');

        let y = 100;
        const montos = b.montos || [];
        montos.forEach((m, i) => {
            doc.text(`Procesamiento de Muestra ${i+1}`, 20, y);
            doc.text((m || 0).toFixed(2), 190, y, { align: 'right' });
            y += 7;
        });

        doc.line(15, y, 195, y);
        y += 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL A PAGAR:', 15, y);
        doc.text(`S/ ${(b.total || 0).toFixed(2)}`, 190, y, { align: 'right' });

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Este documento es un comprobante de servicio interno.', 105, 280, { align: 'center' });
        doc.text('JC PATH LAB - Anatomía Patológica de Alta Precisión', 105, 285, { align: 'center' });

        const fileName = `Boleta_${b.telefono || 'SinNumero'}_${b.codigo}.pdf`;
        doc.save(fileName);
    } catch (err) {
        console.error("Error PDF:", err);
        alert("No se pudo generar el PDF: " + err.message);
    }
}

async function compartirPDFBoleta(id) {
    try {
        const b = await db.boletas.get(id);
        if (!b) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // El mismo diseño que generarPDFBoleta
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text('JC PATH LAB', 15, 25);
        doc.setFontSize(10); doc.text('Laboratorio de Anatomía Patológica', 15, 32);
        doc.setTextColor(15, 23, 42); doc.setFontSize(14); doc.text(`BOLETA: ${b.codigo}`, 195, 25, { align: 'right' });
        doc.setFontSize(10); doc.text(`Fecha: ${new Date(b.fecha).toLocaleDateString()}`, 195, 32, { align: 'right' });
        doc.line(15, 45, 195, 45);
        doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('DATOS DEL CLIENTE:', 15, 55);
        doc.setFont(undefined, 'normal');
        doc.text(`Razón Social: ${b.razonSocial}`, 15, 62);
        doc.text(`RUC/DNI: ${b.ruc}`, 15, 68);
        doc.text(`Dirección: ${b.direccion}`, 15, 74);
        doc.setFillColor(248, 250, 252); doc.rect(15, 85, 180, 8, 'F');
        doc.setFont(undefined, 'bold'); doc.text('DETALLE', 20, 91); doc.text('MONTO (S/)', 190, 91, { align: 'right' });
        doc.setFont(undefined, 'normal');
        let y = 100;
        (b.montos || []).forEach((m, i) => { doc.text(`Muestra ${i+1}`, 20, y); doc.text((m || 0).toFixed(2), 190, y, { align: 'right' }); y += 7; });
        doc.line(15, y, 195, y); y += 10; doc.setFontSize(14); doc.setFont(undefined, 'bold');
        doc.text('TOTAL A PAGAR:', 15, y); doc.text(`S/ ${b.total.toFixed(2)}`, 190, y, { align: 'right' });

        const pdfBlob = doc.output('blob');
        const fileName = `Boleta_${b.telefono || 'SinNumero'}_${b.codigo}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `Boleta ${b.codigo}`,
                text: `Adjunto boleta de JC PATH LAB para ${b.razonSocial}`
            });
        } else {
            // Fallback manual
            doc.save(fileName);
            alert("Tu navegador no soporta compartir archivos directamente. El PDF se ha descargado para que lo envíes manualmente.");
        }
    } catch (err) {
        console.error("Error al compartir:", err);
    }
}

// --- ASISTENTE DE VOZ AVANZADO (BOT JC) ---
let recognition;
function initVoiceAssistant() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        document.getElementById('voice-btn').classList.add('active-voice');
        setVoiceStatus("Escuchando...", "listening");
    };

    recognition.onresult = (event) => {
        const result = event.results[0][0].transcript.toLowerCase();
        setVoiceStatus(`Dijiste: "${result}"`, "processing");
        setTimeout(() => procesarComandoVoz(result), 500);
    };

    recognition.onerror = (event) => {
        console.error("Error de voz:", event.error);
        setVoiceStatus("No te escuché bien", "error");
        stopVoiceUI();
    };

    recognition.onend = () => {
        stopVoiceUI();
    };
}

function stopVoiceUI() {
    document.getElementById('voice-btn').classList.remove('active-voice');
    setTimeout(() => {
        document.getElementById('voice-overlay').style.display = 'none';
    }, 2000);
}

function setVoiceStatus(text, type) {
    const overlay = document.getElementById('voice-overlay');
    const statusText = document.getElementById('voice-text-status');
    overlay.style.display = 'flex';
    statusText.textContent = text;
}

function responderVoz(mensaje) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(mensaje);
    utterance.lang = 'es-ES';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
}

function toggleVoice() {
    if (!recognition) {
        alert("Reconocimiento de voz no soportado.");
        return;
    }
    try {
        recognition.start();
    } catch (e) {
        recognition.stop();
    }
}

async function procesarComandoVoz(text) {
    // 1. Navegación Básica
    if (text.includes('inicio') || text.includes('portada')) {
        showSection('inicio');
        responderVoz("Yendo al panel principal");
    }
    else if (text.includes('registrar cliente') || text.includes('nuevo cliente')) {
        showSection('registro');
        responderVoz("Abriendo formulario de registro");
    }
    else if (text.includes('ver clientes') || text.includes('lista') || text.includes('directorio')) {
        showSection('listado');
        responderVoz("Mostrando directorio de clientes");
    }
    else if (text.includes('historial') || text.includes('boletas emitidas')) {
        showSection('registro-boletas');
        responderVoz("Abriendo historial de boletas");
    }
    else if (text.includes('reportes') || text.includes('estadística')) {
        showSection('reportes');
        responderVoz("Generando reportes del mes");
    }
    else if (text.includes('crear boleta') || text.includes('nueva boleta')) {
        showSection('plantilla');
        responderVoz("Preparando nueva boleta");
    }

    // 2. Registro de Cliente Automatizado
    // Ejemplo: "Registrar cliente Laboratorio Perez RUC 12345678901"
    const regCliente = /registrar (?:cliente|laboratorio) (.*) ruc ([\d]{8,11})/;
    const matchCliente = text.match(regCliente);
    if (matchCliente) {
        showSection('registro');
        document.getElementById('razon-social').value = matchCliente[1].trim().toUpperCase();
        document.getElementById('ruc').value = matchCliente[2];
        responderVoz(`Entendido. Registrando a ${matchCliente[1]} con documento ${matchCliente[2]}`);
        handleBuscarRuc(); // Disparar búsqueda automática de dirección
        return;
    }

    // 3. Creación de Boleta Express
    // Ejemplo: "Boleta de 5 muestras de 10 soles" o "5 muestras a 12 soles"
    const regBoleta = /(\d+) muestras (?:de|a) (\d+) soles/;
    const matchBoleta = text.match(regBoleta);
    if (matchBoleta) {
        showSection('plantilla');
        const num = parseInt(matchBoleta[1]);
        const precio = parseFloat(matchBoleta[2]);
        document.getElementById('num-muestras').value = num;
        renderCostoInputs();
        
        // Llenar todos los precios automáticamente
        setTimeout(() => {
            document.querySelectorAll('.costo-muestra').forEach(input => {
                input.value = precio;
            });
            calcularTotal();
            responderVoz(`Listo. Boleta para ${num} muestras a ${precio} soles. Total ${num * precio} soles.`);
        }, 300);
        return;
    }

    // 4. Búsqueda por RUC
    if (text.includes('buscar ruc')) {
        const ruc = text.replace(/[^\d]/g, '');
        if (ruc.length >= 8) {
            showSection('registro');
            document.getElementById('ruc').value = ruc;
            handleBuscarRuc();
            responderVoz("Buscando datos del documento " + ruc);
        }
    }

    // 6. Utilidades
    if (text.includes('limpiar formulario') || text.includes('borrar campos')) {
        const activeSection = document.querySelector('main section[style*="display: block"]').id;
        if (activeSection === 'registro') document.getElementById('cliente-form').reset();
        else if (activeSection === 'plantilla') document.getElementById('boleta-form').reset();
        responderVoz("Campos limpiados");
    }
    else if (text.includes('cuánto vendí') || text.includes('ventas de hoy') || text.includes('estado de hoy')) {
        const total = document.getElementById('reporte-total-mes').textContent;
        const muestras = document.getElementById('reporte-muestras-mes').textContent;
        responderVoz(`Hasta ahora en el mes, el total facturado es de ${total}. Se han procesado ${muestras} muestras.`);
    }
    else if (text.includes('ayuda') || text.includes('qué puedes hacer')) {
        responderVoz("Puedo navegar por las secciones, registrar clientes por su nombre y RUC, y crear boletas rápidas diciendo el número de muestras y el precio.");
    }
}

// --- INICIO ---
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();
    setupEventListeners();
    renderCostoInputs();
    initVoiceAssistant(); // Inicializar voz
    await Promise.all([renderClientesTable(), renderBoletasTable(), populateClientSelect()]);
    
    const urlParams = new URLSearchParams(window.location.search);
    const isAuth = sessionStorage.getItem('ag_auth') === 'true' || 
                   (urlParams.get('user') === 'admin' && urlParams.get('pass') === 'JCPATH2026');

    if (isAuth) {
        sessionStorage.setItem('ag_auth', 'true');
        document.body.classList.remove('safe-mode');
        const lock = document.getElementById('ag-lock-screen');
        if (lock) lock.remove();
        syncFromCloud(); 
        if (urlParams.get('bot') === 'true') leerOrdenesAntiGravity();
    } else {
        document.body.classList.add('safe-mode');
    }
});

async function leerOrdenesAntiGravity() {
    const urlParams = new URLSearchParams(window.location.search);
    const clip = urlParams.get('cliente');
    if (!clip) return;
    showSection('plantilla');
    const c = await db.clientes.filter(x => x.razonSocial.toLowerCase().includes(clip.toLowerCase())).first();
    if (c) {
        document.getElementById('cliente-select').value = c.id;
        handleClientSelectChange();
        const m = parseInt(urlParams.get('muestras')) || 1;
        document.getElementById('num-muestras').value = m;
        renderCostoInputs();
    }
}

const USUARIO_MAESTRO = "admin";
const CLAVE_MAESTRA = "JCPATH2026";
function desbloquearSistema() {
    const u = document.getElementById('ag-user').value;
    const p = document.getElementById('ag-pass').value;
    if (u === USUARIO_MAESTRO && p === CLAVE_MAESTRA) {
        sessionStorage.setItem('ag_auth', 'true');
        location.reload();
    } else { alert("Error"); }
}

// Soporte para tecla Enter en el login
document.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' && document.getElementById('ag-lock-screen')) {
        desbloquearSistema();
    }
});