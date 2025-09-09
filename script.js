console.log('script.js version 2.2 loaded');

// --- CONFIGURACIÓN GLOBAL ---
const scriptURL = 'https://script.google.com/macros/s/AKfycbwFNtXP7zgWWGmIEhthYSRScOuTjeI5WS_yDPtX0zGWM1X2n_boMjitmCcFEbaZmHg/exec';
const { jsPDF } = window.jspdf;
const PAGE_SIZE = 10;
let db, currentClientPage = 1, currentBoletaPage = 1;

// --- BASE DE DATOS (DEXIE) ---
async function initDatabase() {
    try {
        db = new Dexie('LaboratorioDB');
        db.version(6).stores({
            clientes: '++id, &ruc, razonSocial, createdAt',
            boletas: '++id, codigo, ruc, fecha, createdAt'
        });
        await db.open();
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
        alert('Error crítico al iniciar la base de datos. Intenta borrar los datos del sitio y recargar.');
    }
}

// --- INTERACCIÓN CON GOOGLE SHEETS ---
async function addClientToSheet(cliente) {
    const formData = new FormData();
    formData.append('action', 'addClient');
    formData.append('razonSocial', cliente.razonSocial);
    formData.append('ruc', cliente.ruc);
    formData.append('direccion', cliente.direccion);
    formData.append('telefono', cliente.telefono);
    formData.append('email', cliente.email);
    formData.append('createdAt', cliente.createdAt.toISOString());

    try {
        const response = await fetch(scriptURL, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.result !== 'success') {
            throw new Error(data.error);
        }
        console.log('Cliente agregado a Google Sheets exitosamente.');
        return true;
    } catch (error) {
        console.error('Error al agregar cliente en Google Sheets:', error);
        alert(`Hubo un error al guardar el cliente en Google Sheets: ${error.message}. El cliente se guardó localmente.`);
        return false;
    }
}

async function addBoletaToSheet(boleta) {
    const formData = new FormData();
    formData.append('action', 'addBoleta');
    formData.append('codigo', boleta.codigo);
    formData.append('razonSocial', boleta.razonSocial);
    formData.append('ruc', boleta.ruc);
    formData.append('direccion', boleta.direccion);
    formData.append('telefono', boleta.telefono);
    formData.append('email', boleta.email);
    formData.append('numMuestras', boleta.numMuestras);
    formData.append('montos', JSON.stringify(boleta.montos));
    formData.append('total', boleta.total);
    formData.append('cancelado', boleta.cancelado);
    formData.append('fecha', boleta.fecha);

    try {
        const response = await fetch(scriptURL, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.result !== 'success') {
            throw new Error(data.error);
        }
        console.log('Boleta agregada a Google Sheets exitosamente.');
        return true;
    } catch (error) {
        console.error('Error al agregar boleta en Google Sheets:', error);
        alert(`Hubo un error al guardar la boleta en Google Sheets: ${error.message}. La boleta se guardó localmente.`);
        return false;
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

    const navMenu = document.querySelector('.nav-menu');
    if (navMenu.classList.contains('active')) {
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
}

// --- MANEJO DE CLIENTES ---
async function handleAddClient() {
    const rucInput = document.getElementById('ruc');
    const ruc = rucInput.value.trim();
    if (!ruc) {
        alert('El RUC es obligatorio.');
        return;
    }

    const clienteExistente = await db.clientes.where('ruc').equals(ruc).first();
    if (clienteExistente) {
        alert('Ya existe un cliente con este RUC en la base de datos local.');
        return;
    }

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
        alert('Cliente registrado exitosamente en la base de datos local.');
        document.getElementById('cliente-form').reset();
        renderClientesTable();
        populateClientSelect();
        showSection('listado');
        await addClientToSheet(nuevoCliente);
    } catch (error) {
        console.error('Error al registrar cliente:', error);
        alert('Error al registrar cliente: ' + error.message);
    }
}

async function handleDeleteClient(e) {
    if (e.target.classList.contains('eliminar-btn')) {
        const row = e.target.closest('tr');
        const id = parseInt(row.dataset.id);
        if (confirm('¿Está seguro de que desea eliminar este cliente? Esta acción no se puede deshacer.')) {
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
    const totalPages = Math.ceil(count / PAGE_SIZE);
    document.getElementById('clientes-page').textContent = `${currentClientPage} de ${totalPages}`;

    const clientes = await db.clientes.orderBy('createdAt').reverse().offset((currentClientPage - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray();
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay clientes registrados</td></tr>';
        return;
    }

    clientes.forEach((cliente, index) => {
        const row = tbody.insertRow();
        row.dataset.id = cliente.id;
        row.innerHTML = `
            <td data-label="#">${(currentClientPage - 1) * PAGE_SIZE + index + 1}</td>
            <td data-label="Razón Social">${cliente.razonSocial}</td>
            <td data-label="RUC">${cliente.ruc}</td>
            <td data-label="Dirección">${cliente.direccion}</td>
            <td data-label="Teléfono">${cliente.telefono}</td>
            <td data-label="Email">${cliente.email}</td>
            <td data-label="Acciones" class="action-buttons"><button class="btn eliminar-btn" data-id="${cliente.id}">Eliminar</button></td>
        `;
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
    if (!clienteId) {
        document.getElementById('ruc-cliente').textContent = '';
        document.getElementById('direccion-cliente').textContent = '';
        return;
    }
    const cliente = await db.clientes.get(clienteId);
    document.getElementById('ruc-cliente').textContent = cliente.ruc;
    document.getElementById('direccion-cliente').textContent = cliente.direccion;
}

// --- MANEJO DE BOLETAS ---
async function handleAddBoleta() {
    const clienteId = parseInt(document.getElementById('cliente-select').value);
    if (!clienteId) {
        alert('Por favor, seleccione un cliente.');
        return;
    }

    const cliente = await db.clientes.get(clienteId);
    const montos = Array.from(document.querySelectorAll('.costo-muestra')).map(input => parseFloat(input.value) || 0);
    const total = montos.reduce((sum, monto) => sum + monto, 0);

    const nuevaBoleta = {
        codigo: await generarCodigoBoleta(),
        razonSocial: cliente.razonSocial,
        ruc: cliente.ruc,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        email: cliente.email,
        numMuestras: montos.length,
        montos: montos,
        total: total,
        cancelado: false,
        fecha: new Date().toISOString(),
        createdAt: new Date()
    };

    try {
        await db.boletas.add(nuevaBoleta);
        alert('Boleta guardada exitosamente en la base de datos local.');
        document.getElementById('boleta-form').reset();
        handleClientSelectChange();
        renderCostoInputs();
        renderBoletasTable();
        showSection('registro-boletas');
        await addBoletaToSheet(nuevaBoleta);
    } catch (error) {
        console.error('Error al guardar boleta:', error);
        alert('Error al guardar boleta: ' + error.message);
    }
}

async function handleBoletaActions(e) {
    const target = e.target;
    if (!target.dataset.id) return;
    const id = parseInt(target.dataset.id);

    if (target.classList.contains('delete-boleta')) {
        if (confirm('¿Está seguro de que desea eliminar esta boleta? Esta acción no se puede deshacer.')) {
            await db.boletas.delete(id);
            renderBoletasTable();
        }
    }

    if (target.classList.contains('print-boleta')) {
        generarPDFBoleta(id);
    }
    
    if (target.classList.contains('cancelado-checkbox')) {
        await db.boletas.update(id, { cancelado: target.checked });
        renderBoletasTable();
    }
}

async function renderBoletasTable() {
    const tbody = document.getElementById('boletas-body');
    tbody.innerHTML = '';
    const count = await db.boletas.count();
    const totalPages = Math.ceil(count / PAGE_SIZE);
    document.getElementById('boletas-page').textContent = `${currentBoletaPage} de ${totalPages}`;

    const boletas = await db.boletas.orderBy('createdAt').reverse().offset((currentBoletaPage - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray();

    if (boletas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay boletas registradas</td></tr>';
        return;
    }

    boletas.forEach(boleta => {
        const row = tbody.insertRow();
        row.dataset.id = boleta.id;
        row.innerHTML = `
            <td data-label="Código">${boleta.codigo}</td>
            <td data-label="Razón Social">${boleta.razonSocial}</td>
            <td data-label="RUC">${boleta.ruc}</td>
            <td data-label="Dirección">${boleta.direccion}</td>
            <td data-label="N° Muestras">${boleta.numMuestras}</td>
            <td data-label="Total">S/ ${boleta.total.toFixed(2)}</td>
            <td data-label="Cancelado"><input type="checkbox" class="cancelado-checkbox" data-id="${boleta.id}" ${boleta.cancelado ? 'checked' : ''}></td>
            <td data-label="Acciones" class="action-buttons">
                <button class="btn print-boleta" data-id="${boleta.id}">Imprimir</button>
                <button class="btn eliminar-btn delete-boleta" data-id="${boleta.id}">Eliminar</button>
            </td>
        `;
    });
}

function renderCostoInputs() {
    const numMuestras = parseInt(document.getElementById('num-muestras').value) || 1;
    const container = document.getElementById('costos-container');
    container.innerHTML = '';
    for (let i = 1; i <= numMuestras; i++) {
        const div = document.createElement('div');
        div.className = 'template-row';
        div.innerHTML = `
            <label class="template-label">Muestra ${i} Costo:</label>
            <input type="number" class="costo-muestra" min="0" step="0.01" placeholder="S/ 0.00">
        `;
        container.appendChild(div);
    }
    document.querySelectorAll('.costo-muestra').forEach(input => {
        input.addEventListener('input', calcularTotal);
    });
    calcularTotal();
}

function calcularTotal() {
    const total = Array.from(document.querySelectorAll('.costo-muestra')).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
    document.getElementById('pago-total').textContent = `S/ ${total.toFixed(2)}`;
}

async function generarCodigoBoleta() {
    const currentYear = new Date().getFullYear();
    const boletasDelAno = await db.boletas.filter(b => new Date(b.fecha).getFullYear() === currentYear).toArray();
    
    let nextNumber = 1;
    if (boletasDelAno.length > 0) {
        boletasDelAno.sort((a, b) => a.codigo.localeCompare(b.codigo));
        const lastBoleta = boletasDelAno[boletasDelAno.length - 1];
        const lastNumber = parseInt(lastBoleta.codigo.split('-')[1], 10);
        nextNumber = lastNumber + 1;
    }
    
    return `${currentYear}-${String(nextNumber).padStart(4, '0')}`;
}

// --- FUNCIONES DE UTILIDAD ---
function formatDate(date) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(date).toLocaleDateString('es-ES', options);
}

async function generarPDFBoleta(id) {
    const boleta = await db.boletas.get(id);
    if (!boleta) {
        alert('No se encontró la boleta.');
        return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const marginLeft = 15;
    const marginRight = 15;
    const pageWidth = 210;
    let y = 15;

    function addText(text, x, y, options = {}) {
        const { fontSize = 12, fontStyle = 'normal', align = 'left' } = options;
        doc.setFontSize(fontSize);
        doc.setFont(undefined, fontStyle);
        doc.text(text, x, y, { align });
    }

    // Encabezado
    doc.setFillColor(26, 58, 95);
    doc.rect(0, 0, pageWidth, 30, 'F');
    addText('JC PATH LAB', pageWidth / 2, 12, { fontSize: 20, fontStyle: 'bold', align: 'center' });
    addText('Laboratorio de Anatomía Patológica', pageWidth / 2, 18, { fontSize: 14, align: 'center' });

    y = 40;
    addText('BOLETA DE VENTA', pageWidth / 2, y, { fontSize: 18, fontStyle: 'bold', align: 'center' });
    y += 15;

    // Información del emisor
    addText('EMISOR:', marginLeft, y, { fontSize: 12, fontStyle: 'bold' });
    y += 7;
    addText('NOMBRE: Josehp Christopher Castillo Cuenca', marginLeft, y);
    y += 5;
    addText('DOCUMENTO: DNI 41457466', marginLeft, y);
    y += 5;
    addText('DIRECCIÓN: MZ M2 LOTE 13 URB. JARDINES DE CHILLON', marginLeft, y);
    y += 5;
    addText('RUC Emisor: 10414574667', marginLeft, y);
    y += 10;

    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 10;

    // Información del cliente
    addText('CLIENTE:', marginLeft, y, { fontSize: 14, fontStyle: 'bold' });
    y += 7;
    addText(`Razón Social: ${boleta.razonSocial}`, marginLeft, y);
    y += 5;
    addText(`RUC: ${boleta.ruc}`, marginLeft, y);
    y += 5;
    addText(`Dirección: ${boleta.direccion}`, marginLeft, y);
    y += 5;
    addText(`Número de muestras: ${boleta.numMuestras}`, marginLeft, y);
    y += 10;

    // Detalles de costos
    boleta.montos.forEach((monto, index) => {
        addText(`Muestra ${index + 1} Costo: S/ ${monto.toFixed(2)}`, marginLeft, y);
        y += 5;
    });

    y += 5;
    addText(`Pago total: S/ ${boleta.total.toFixed(2)}`, marginLeft, y, { fontSize: 14, fontStyle: 'bold' });
    y += 10;

    addText(`Puente Piedra, ${formatDate(boleta.fecha)}`, pageWidth - marginRight, y, { align: 'right' });

    const nombreArchivo = `Boleta_${boleta.razonSocial.replace(/\s+/g, '_')}_${boleta.codigo}.pdf`;
    doc.save(nombreArchivo);
}


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();
    setupEventListeners();
    renderCostoInputs();
    await Promise.all([renderClientesTable(), renderBoletasTable(), populateClientSelect()]);
    showSection('inicio');
});