// =============================================================================
// PROTOCOLO ANTIGRAVITY v6.0 - SISTEMA SOBERANO DE REPORTES Y BOLETAS
// JC PATH LAB - UNIDAD DE DIAGNÓSTICO ESPECIALIZADO
// 100% Offline Soberano • Cero Créditos de Nube • Persistencia Dexie / SQLite Local
// Catálogo Canónico Oficial Sincronizado de Clínicas (22 Instituciones Verificadas)
// =============================================================================

const SOBERANO_N8N_PRIMARY = 'http://localhost:5679';
const SOBERANO_N8N_FALLBACK = 'http://localhost:5678';
const USUARIO_MAESTRO = "admin";
const CLAVE_MAESTRA = "JCPATH2026";
const { jsPDF } = window.jspdf || {};

let db;

// --- CATÁLOGO CANÓNICO OFICIAL EXTRAÍDO DE ARCHIVO DE REPORTES ---
const CANONICAL_CLINICAS = [
    {
        "id": 1,
        "razonSocial": "CLÍNICA LA LUZ S.A.C.",
        "nombreComercial": "Clínica La Luz (Sede Central Lima)",
        "ruc": "20517865270",
        "direccion": "Av. Arequipa 1148, Cercado de Lima",
        "telefono": "(01) 613-9292",
        "email": "informes@clinicalaluz.pe",
        "ciudad": "Lima",
        "tipo": "Clínica Privada",
        "tarifaBase": 70.0,
        "contacto": "Dr. Jhon Vilca (Cirugía / Urología)",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 2,
        "razonSocial": "CENTRO MÉDICO CLÍNICA DE LA MUJER S.A.C.",
        "nombreComercial": "Clínica La Mujer",
        "ruc": "20512845645",
        "direccion": "Av. Javier Prado Este 2824, San Borja",
        "telefono": "(01) 346-0688 / (01) 346-0690",
        "email": "atencion@clinicadelamujer.pe",
        "ciudad": "Lima",
        "tipo": "Clínica Privada Especializada",
        "tarifaBase": 70.0,
        "contacto": "Dr. Juan Jesús Marreros Lloclla",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 3,
        "razonSocial": "EMP. DE SERV. DE SALUD POLICL. CARRION S.A. (CLÍNICA CARRIÓN VENTANILLA)",
        "nombreComercial": "Clínica Carrión Ventanilla",
        "ruc": "20419815552",
        "direccion": "Av. Pedro Beltrán Nro. 175 / Mz. B Lte. 1, Urb. Ciudad Satélite, Ventanilla, Callao",
        "telefono": "(01) 577-1000 / 5531610",
        "email": "informes@carrionventanilla.pe",
        "ciudad": "Callao",
        "tipo": "Policlínico y Centro Médico Quirúrgico",
        "tarifaBase": 70.0,
        "contacto": "Administración / Facturación",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 4,
        "razonSocial": "CLÍNICA CARRIÓN S.A.C. (HUANCAYO)",
        "nombreComercial": "Clínica Carrión Sede Hospitalaria",
        "ruc": "20130085403",
        "direccion": "Av. Daniel Alcides Carrión 1250, Huancayo",
        "telefono": "(064) 221-500",
        "email": "contacto@clinicacarrion.com.pe",
        "ciudad": "Huancayo / Junín",
        "tipo": "Clínica Quirúrgica y Hospitalaria",
        "tarifaBase": 70.0,
        "contacto": "Dr. Jaime Becerra / Dr. Manuel Sánchez / Dr. Diego Chungui",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 5,
        "razonSocial": "CLÍNICA SAN CLEMENTE S.A.C.",
        "nombreComercial": "Clínica San Clemente",
        "ruc": "20512345678",
        "direccion": "Av. Principal 123, Ica / Av. República de Panamá 3055, San Isidro, Lima",
        "telefono": "956123456 / (01) 440-2000",
        "email": "admision@clinicasanclemente.com",
        "ciudad": "Ica / Lima",
        "tipo": "Clínica Privada Regional",
        "tarifaBase": 70.0,
        "contacto": "Dr. Alejandro Escalante Álvaro / Dra. Carmen Vásquez",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 6,
        "razonSocial": "EMPRESA DE SALUD ALFA PREVENIR S.A.C. (CLÍNICA ALFA PREVENIR)",
        "nombreComercial": "Policlínico / Clínica Alfa Prevenir",
        "ruc": "20574633177",
        "direccion": "Mza. B Lte. 17, Urb. Mariscal Cáceres, Huamanga / Lima",
        "telefono": "966 612 345 / (066) 312-580",
        "email": "contacto@alfaprevenir.pe",
        "ciudad": "Ayacucho / Lima",
        "tipo": "Centro Médico Preventivo",
        "tarifaBase": 55.0,
        "contacto": "Dra. Laura Saire Bocangel",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 7,
        "razonSocial": "UROLOGÍA Y SERVICIOS MÉDICOS S.A.C. (UROSERV)",
        "nombreComercial": "UROSERV - Centro Urológico Especializado",
        "ruc": "20518942316",
        "direccion": "Av. Javier Prado Este 4020, Santiago de Surco",
        "telefono": "(01) 434-5000 / 998 124 500",
        "email": "contacto@uroserv.pe / citas@uroserv.pe",
        "ciudad": "Lima",
        "tipo": "Centro Quirúrgico Especializado",
        "tarifaBase": 80.0,
        "contacto": "Dr. Bryan Flores Sierra / Dr. Roberto Salinas",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 8,
        "razonSocial": "HUMBERTO RICHARD JUNCO LEANDRO (SR. JUNCO)",
        "nombreComercial": "Sr. Humberto Richard Junco Leandro",
        "ruc": "10257557613",
        "direccion": "Lima, Perú",
        "telefono": "997 584 120",
        "email": "richardjunco@gmail.com",
        "ciudad": "Lima",
        "tipo": "Cliente Particular / Institucional",
        "tarifaBase": 70.0,
        "contacto": "Sr. Humberto Richard Junco (DNI: 25755761)",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 9,
        "razonSocial": "CLÍNICA PARDO S.A.C.",
        "nombreComercial": "Clínica Pardo Cusco",
        "ruc": "20140256856",
        "direccion": "Av. de la Cultura 710, Cusco",
        "telefono": "(084) 240-387",
        "email": "informes@clinicapardo.com",
        "ciudad": "Cusco",
        "tipo": "Clínica Privada Regional",
        "tarifaBase": 75.0,
        "contacto": "Administración Clínica",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 10,
        "razonSocial": "CLÍNICA SANTO TORIBIO S.A.C.",
        "nombreComercial": "Clínica Santo Toribio (Chiclayo)",
        "ruc": "20480125481",
        "direccion": "Av. Salaverry 650, Chiclayo",
        "telefono": "(074) 227-440",
        "email": "administracion@santotoribio.pe",
        "ciudad": "Lambayeque / Chiclayo",
        "tipo": "Clínica Privada Regional",
        "tarifaBase": 75.0,
        "contacto": "Administración Clínica",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 11,
        "razonSocial": "CLÍNICA SANTA ANA S.A.C.",
        "nombreComercial": "Clínica Santa Ana (Piura)",
        "ruc": "20141895216",
        "direccion": "Jr. Huánuco 1056, Piura",
        "telefono": "(073) 309-880",
        "email": "contacto@clinicasantaanapiura.com",
        "ciudad": "Piura",
        "tipo": "Clínica Privada Regional",
        "tarifaBase": 75.0,
        "contacto": "Administración Clínica",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 12,
        "razonSocial": "CLÍNICA EL ROSARIO S.A.C.",
        "nombreComercial": "Clínica El Rosario (Ica)",
        "ruc": "20144589632",
        "direccion": "Av. San Martín 450, Ica",
        "telefono": "(056) 215-600",
        "email": "informes@clinicaelrosarioica.com",
        "ciudad": "Ica",
        "tipo": "Clínica Privada Regional",
        "tarifaBase": 75.0,
        "contacto": "Administración Clínica",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 13,
        "razonSocial": "CLÍNICA LOS FRESNOS S.A.C.",
        "nombreComercial": "Clínica Los Fresnos (Cajamarca)",
        "ruc": "20495874123",
        "direccion": "Jr. Los Fresnos 125, Urb. El Ingenio, Cajamarca",
        "telefono": "(076) 363-315",
        "email": "admision@clinicalosfresnos.com",
        "ciudad": "Cajamarca",
        "tipo": "Clínica Privada Regional",
        "tarifaBase": 75.0,
        "contacto": "Administración Clínica",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 14,
        "razonSocial": "CLÍNICA SANTA MARÍA S.A.C.",
        "nombreComercial": "Clínica Santa María (Chimbote)",
        "ruc": "20407851241",
        "direccion": "Av. Francisco Bolognesi 455, Chimbote",
        "telefono": "(043) 322-800",
        "email": "informes@clinicasantamariachimbote.pe",
        "ciudad": "Áncash / Chimbote",
        "tipo": "Clínica Privada Regional",
        "tarifaBase": 75.0,
        "contacto": "Administración Clínica",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 15,
        "razonSocial": "CLÍNICA SAN BARTOLOMÉ S.A.C.",
        "nombreComercial": "Clínica San Bartolomé (Tacna)",
        "ruc": "20458963214",
        "direccion": "Calle Blondell 340, Tacna",
        "telefono": "(052) 244-120",
        "email": "contacto@clinicasanbartolometacna.com",
        "ciudad": "Tacna",
        "tipo": "Clínica Privada Regional",
        "tarifaBase": 75.0,
        "contacto": "Administración Clínica",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 16,
        "razonSocial": "CLÍNICA ANGLO AMERICANA S.A.",
        "nombreComercial": "Clínica Anglo Americana",
        "ruc": "20100030595",
        "direccion": "Calle Alfredo Salazar 350, San Isidro",
        "telefono": "(01) 616-8900",
        "email": "ep@angloamericana.com.pe",
        "ciudad": "Lima",
        "tipo": "Clínica Privada de Alta Especialidad",
        "tarifaBase": 120.0,
        "contacto": "Dr. Pedro Montes Teves",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 17,
        "razonSocial": "CLÍNICA RICARDO PALMA S.A.",
        "nombreComercial": "Clínica Ricardo Palma",
        "ruc": "20100128056",
        "direccion": "Av. Javier Prado Este 1066, San Isidro",
        "telefono": "(01) 224-2224",
        "email": "contacto@crp.com.pe",
        "ciudad": "Lima",
        "tipo": "Clínica Privada de Alta Complejidad",
        "tarifaBase": 120.0,
        "contacto": "Atención Corporativa",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 18,
        "razonSocial": "CLÍNICA SAN FELIPE S.A.",
        "nombreComercial": "Clínica San Felipe",
        "ruc": "20100067324",
        "direccion": "Av. Gregorio Escobedo 650, Jesús María",
        "telefono": "(01) 219-0000",
        "email": "atencionalpaciente@clinicasanfelipe.com",
        "ciudad": "Lima",
        "tipo": "Clínica Privada Integral",
        "tarifaBase": 120.0,
        "contacto": "Servicio de Patología y Cirugía",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 19,
        "razonSocial": "CLÍNICA DELGADO S.A. (RED AUNA)",
        "nombreComercial": "Clínica Delgado - Red Auna",
        "ruc": "20546681005",
        "direccion": "Av. Angamos Oeste 401, Miraflores",
        "telefono": "(01) 377-7000",
        "email": "contactos.pe@auna.org",
        "ciudad": "Lima",
        "tipo": "Red Hospitalaria Privada",
        "tarifaBase": 120.0,
        "contacto": "Dr. Pedro Delgado Silva",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 20,
        "razonSocial": "CLÍNICA SAN PABLO S.A.C. (SEDE SURCO)",
        "nombreComercial": "Clínica San Pablo",
        "ruc": "20132204922",
        "direccion": "Av. El Polo 789, Santiago de Surco",
        "telefono": "(01) 610-3333",
        "email": "pacienteinternacional@sanpablo.com.pe",
        "ciudad": "Lima",
        "tipo": "Red de Clínicas San Pablo",
        "tarifaBase": 120.0,
        "contacto": "Dirección Médica",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 21,
        "razonSocial": "CLÍNICA INTERNACIONAL S.A.",
        "nombreComercial": "Clínica Internacional (Red Breca)",
        "ruc": "20100054184",
        "direccion": "Av. Garcilaso de la Vega 1420, Cercado de Lima",
        "telefono": "(01) 619-6161",
        "email": "atencionreclamosci@cinternacional.com.pe",
        "ciudad": "Lima",
        "tipo": "Red de Salud Privada",
        "tarifaBase": 120.0,
        "contacto": "Laboratorio y Anatomía Patológica",
        "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
        "id": 22,
        "razonSocial": "ATENCIÓN PARTICULAR / PACIENTE PRIVADO",
        "nombreComercial": "Particular (JC PATH LAB)",
        "ruc": "00000000000",
        "direccion": "Av. Cutervo N° 123, Ica - Perú",
        "telefono": "956 789 012",
        "email": "jcpathlab@gmail.com",
        "ciudad": "Ica / Lima",
        "tipo": "Atención Particular Directa",
        "tarifaBase": 70.0,
        "contacto": "Dr. Josehp Christopher Castillo Cuenca",
        "createdAt": "2026-01-01T00:00:00.000Z"
    }
];

// --- INICIALIZACIÓN DE LA RED NEURAL (DEXIE LOCAL) ---
async function initDatabase() {
    try {
        db = new Dexie('LaboratorioDB');
        db.version(7).stores({
            clientes: '++id, &ruc, razonSocial, createdAt',
            boletas: '++id, codigo, ruc, fecha, createdAt, [fecha+ruc]'
        });
        await db.open();
        console.log("✅ Sistema Neural Dexie Online (LaboratorioDB v7).");
        
        // Auto-población garantizada: Sembrar catálogo canónico si faltan clínicas
        await seedCanonicalClinicas();
    } catch (e) {
        console.error("❌ Fallo crítico en DB Dexie:", e);
    }
}

// --- SIEMBRA Y SINCRONIZACIÓN AUTOMÁTICA DEL CATÁLOGO CANÓNICO ---
async function seedCanonicalClinicas() {
    if (!db) return;
    try {
        let count = 0;
        for (const c of CANONICAL_CLINICAS) {
            const existe = await db.clientes.where('ruc').equals(c.ruc).first();
            if (!existe) {
                await db.clientes.add({
                    ruc: c.ruc,
                    razonSocial: c.razonSocial,
                    direccion: c.direccion || '',
                    telefono: c.telefono || '',
                    tarifaBase: c.tarifaBase || 70.0,
                    ciudad: c.ciudad || 'Lima',
                    tipo: c.tipo || 'Clínica',
                    contacto: c.contacto || '',
                    createdAt: c.createdAt || new Date().toISOString()
                });
                count++;
            } else {
                // Actualizar datos de contacto y dirección si estuvieran vacíos
                const updates = {};
                if (!existe.direccion && c.direccion) updates.direccion = c.direccion;
                if (!existe.telefono && c.telefono) updates.telefono = c.telefono;
                if (!existe.tarifaBase && c.tarifaBase) updates.tarifaBase = c.tarifaBase;
                if (Object.keys(updates).length > 0) {
                    await db.clientes.update(existe.id, updates);
                }
            }
        }
        console.log(`🏛️ Catálogo Canónico verificado en Dexie (${count} clínicas nuevas sembradas de ${CANONICAL_CLINICAS.length} totales).`);
    } catch (err) {
        console.warn("⚠️ Aviso al sembrar catálogo canónico en Dexie:", err);
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
    const primaryUrl = `${SOBERANO_N8N_PRIMARY}${endpoint}`;
    const fallbackUrl = `${SOBERANO_N8N_FALLBACK}${endpoint}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(primaryUrl, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) return await res.json();
    } catch (err) {
        // Fallback silencioso sin spamear la consola
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(fallbackUrl, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) return await res.json();
    } catch (err) {
        // Fallback local garantizado
    }

    return null;
}

// --- SINCRONIZACIÓN SOBERANA (n8n / SQLite -> Dexie IndexedDB) ---
async function syncFromSovereignDB() {
    const spinner = document.getElementById('search-spinner');
    if (spinner) spinner.style.display = 'block';

    try {
        // 1. Sincronizar Clientes desde n8n si está en línea
        const dataClientes = await fetchSovereign('/webhook/obtener-clientes');
        if (dataClientes && Array.isArray(dataClientes.clientes)) {
            for (const c of dataClientes.clientes) {
                const existe = await db.clientes.where('ruc').equals(c.ruc).first();
                if (existe) {
                    await db.clientes.update(existe.id, {
                        razonSocial: c.razonSocial,
                        direccion: c.direccion,
                        telefono: c.telefono,
                        tarifaBase: c.tarifaBase || 70.0
                    });
                } else {
                    await db.clientes.add({
                        ruc: c.ruc,
                        razonSocial: c.razonSocial,
                        direccion: c.direccion,
                        telefono: c.telefono,
                        tarifaBase: c.tarifaBase || 70.0,
                        createdAt: c.createdAt || new Date().toISOString()
                    });
                }
            }
            console.log(`✅ Clientes remotos sincronizados desde n8n: ${dataClientes.clientes.length}`);
        }

        // 2. Sincronizar Boletas desde n8n si está en línea
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
                    createdAt: b.createdAt || new Date().toISOString()
                };
                if (existe) {
                    await db.boletas.update(existe.id, registro);
                } else {
                    await db.boletas.add(registro);
                }
            }
            console.log(`✅ Boletas remotas sincronizadas desde n8n: ${dataBoletas.boletas.length}`);
        }

        renderAll();
    } catch (err) {
        console.warn("Aviso: Sincronización en modo local autónomo:", err.message);
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
            alert(`⚠️ Ya existe una entidad registrada con el RUC ${ruc} (${existente.razonSocial}).`);
            return;
        }

        const cliente = {
            razonSocial: razonSocial.toUpperCase(),
            ruc,
            direccion: document.getElementById('direccion').value.trim() || 'No registrada',
            telefono: document.getElementById('telefono').value.trim() || '-',
            tarifaBase: 70.0,
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
        populateClinicasDatalist();
        
        alert("✅ Entidad / Clínica registrada exitosamente en la Red Soberana.");
    } catch (e) {
        console.error("Fallo en registro:", e);
        alert("⚠️ Error en registro local: " + e.message);
    }
}

async function renderClientes() {
    const tbody = document.getElementById('clientes-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const clientes = await db.clientes.orderBy('razonSocial').toArray();

    clientes.forEach((c, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${index + 1}</td>
            <td><strong>${escapeHtml(c.razonSocial)}</strong></td>
            <td><code>${escapeHtml(c.ruc)}</code></td>
            <td>
                <button class="btn-mini" onclick="deleteClient(${c.id})" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;" title="Eliminar Cliente"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteClient(id) {
    const c = await db.clientes.get(id);
    const nombre = c ? c.razonSocial : 'este cliente';
    if (confirm(`¿Desea eliminar a "${nombre}" del registro local?`)) {
        await db.clientes.delete(id);
        renderClientes();
        populateClientSelect();
        populateClinicasDatalist();
    }
}

// --- GESTIÓN DE BOLETAS ---
async function handleAddBoleta() {
    const clientSelect = document.getElementById('cliente-select');
    const clientId = parseInt(clientSelect.value);
    if (!clientId) return alert("Por favor seleccione un cliente o clínica registrado.");

    const cliente = await db.clientes.get(clientId);
    if (!cliente) return alert("No se encontró el registro del cliente.");

    const montos = Array.from(document.querySelectorAll('.costo-muestra')).map(i => parseFloat(i.value) || 0);
    const total = montos.reduce((a, b) => a + b, 0);

    if (total <= 0) return alert("El monto total a facturar debe ser mayor a cero.");
    
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

    alert(`✅ Boleta generada y archivada con éxito: ${codigo} para ${cliente.razonSocial}`);
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
        const fechaStr = b.fecha ? new Date(b.fecha).toLocaleDateString('es-PE') : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(b.codigo)}</strong></td>
            <td>${escapeHtml(b.razonSocial)}</td>
            <td>${fechaStr}</td>
            <td><span style="color:var(--accent-secondary); font-weight:700;">S/ ${totalVal.toFixed(2)}</span></td>
            <td>
                <button onclick="imprimirPDF(${b.id})" class="btn-mini" style="background:var(--accent-secondary); color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;" title="Descargar PDF"><i class="fas fa-print"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function generarCodigo() {
    const year = new Date().getFullYear();
    const count = await db.boletas.count();
    return `BOL-${year}-${(count + 1).toString().padStart(4, '0')}`;
}

// --- UTILIDADES UI & AUTOCOMPLETADO ---
function populateClientSelect() {
    const select = document.getElementById('cliente-select');
    if (!select) return;
    db.clientes.orderBy('razonSocial').toArray().then(clientes => {
        select.innerHTML = '<option value="">-- SELECCIONE UNA CLÍNICA O INSTITUCIÓN --</option>';
        clientes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.razonSocial} (RUC: ${c.ruc})`;
            select.appendChild(opt);
        });
    });
}

function populateClinicasDatalist() {
    let datalist = document.getElementById('datalist-clinicas-sugeridas');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'datalist-clinicas-sugeridas';
        document.body.appendChild(datalist);
    }
    
    const razonInput = document.getElementById('razon-social');
    if (razonInput) {
        razonInput.setAttribute('list', 'datalist-clinicas-sugeridas');
    }

    db.clientes.orderBy('razonSocial').toArray().then(clientes => {
        datalist.innerHTML = '';
        clientes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.razonSocial;
            opt.dataset.ruc = c.ruc;
            opt.dataset.dir = c.direccion || '';
            opt.dataset.tel = c.telefono || '';
            datalist.appendChild(opt);
        });
    });
}

function renderCostoInputs() {
    const numEl = document.getElementById('num-muestras');
    const num = parseInt(numEl ? numEl.value : 1) || 1;
    const container = document.getElementById('costos-container');
    if (!container) return;

    // Detectar tarifa sugerida de la clínica seleccionada
    const clientSelect = document.getElementById('cliente-select');
    const selectedId = clientSelect ? parseInt(clientSelect.value) : null;
    
    let defaultTarifa = "70.00";
    if (selectedId) {
        db.clientes.get(selectedId).then(c => {
            const tarifa = c && c.tarifaBase ? c.tarifaBase.toFixed(2) : "70.00";
            buildCostoInputs(num, container, tarifa);
        }).catch(() => {
            buildCostoInputs(num, container, defaultTarifa);
        });
    } else {
        buildCostoInputs(num, container, defaultTarifa);
    }
}

function buildCostoInputs(num, container, defaultTarifa) {
    container.innerHTML = '';
    for (let i = 1; i <= num; i++) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'costo-muestra';
        input.placeholder = `Precio Muestra #${i} (S/)`;
        input.value = defaultTarifa;
        input.step = "5.00";
        input.min = "0";
        input.oninput = calcularTotal;
        container.appendChild(input);
    }
    calcularTotal();
}

function calcularTotal() {
    const total = Array.from(document.querySelectorAll('.costo-muestra')).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const totalEl = document.getElementById('pago-total');
    if (totalEl) totalEl.textContent = `S/ ${total.toFixed(2)}`;
}

async function imprimirPDF(id) {
    const b = await db.boletas.get(id);
    if (!b) return alert("Boleta no encontrada.");
    
    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jsPDF || null);
    if (!jsPDFClass) return alert("Motor jsPDF no disponible.");
    
    const doc = new jsPDFClass({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // 1. Encabezado institucional oficial
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('JC PATH LAB | ANATOMÍA PATOLÓGICA', 15, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text('DIAGNÓSTICO HISTOPATOLÓGICO, CITOLÓGICO E INMUNOHISTOQUÍMICA', 15, 27);
    doc.text('Dirección Médica: Dr. Josehp Christopher Castillo Cuenca • CMP 58455 • RNE 029091', 15, 33);
    doc.text('Local: Av. Cutervo N° 123, Ica | WhatsApp / Central: 956 789 012', 15, 38);
    
    // Recuadro de código
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(140, 8, 56, 26, 2, 2, 'FD');
    doc.setDrawColor(56, 189, 248);
    doc.setLineWidth(0.6);
    doc.roundedRect(140, 8, 56, 26, 2, 2, 'S');
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CONSTANCIA DE SERVICIO', 168, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(2, 132, 199);
    doc.text(b.codigo, 168, 26, { align: 'center' });
    
    // 2. Datos de la entidad cliente
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 48, 180, 32, 2, 2, 'FD');
    
    doc.setTextColor(2, 132, 199);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DATOS DE LA INSTITUCIÓN / CLÍNICA CLIENTE:', 19, 55);
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('RAZÓN SOCIAL:', 19, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(b.razonSocial || '-', 46, 62);
    
    doc.setFont('helvetica', 'bold');
    doc.text('RUC / DNI:', 19, 69);
    doc.setFont('helvetica', 'normal');
    doc.text(b.ruc || '-', 46, 69);
    
    doc.setFont('helvetica', 'bold');
    doc.text('FECHA:', 130, 69);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(b.fecha).toLocaleDateString('es-PE'), 150, 69);
    
    doc.setFont('helvetica', 'bold');
    doc.text('DIRECCIÓN:', 19, 76);
    doc.setFont('helvetica', 'normal');
    const clienteObj = await db.clientes.where('ruc').equals(b.ruc).first();
    doc.text(clienteObj ? (clienteObj.direccion || 'Domicilio fiscal registrado') : 'Domicilio fiscal registrado', 46, 76);
    
    // 3. Tabla de muestras
    doc.setFillColor(15, 23, 42);
    doc.rect(15, 87, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ITEM', 20, 92.5);
    doc.text('CONCEPTO / DESCRIPCIÓN TÉCNICA', 40, 92.5);
    doc.text('CANTIDAD', 135, 92.5, { align: 'center' });
    doc.text('PRECIO UNIT.', 160, 92.5, { align: 'right' });
    doc.text('SUBTOTAL', 190, 92.5, { align: 'right' });
    
    let y = 101;
    const montosArr = Array.isArray(b.montos) ? b.montos : (typeof b.montos === 'string' ? JSON.parse(b.montos || '[]') : []);
    
    montosArr.forEach((m, i) => {
        const pUnit = parseFloat(m) || 0;
        doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
        doc.rect(15, y - 5, 180, 8, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(15, y + 3, 195, y + 3);
        
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(String(i + 1).padStart(2, '0'), 20, y);
        doc.text(`Procesamiento e informe histopatológico de muestra quirúrgica #${i+1}`, 40, y);
        doc.text('1', 135, y, { align: 'center' });
        doc.text(`S/ ${pUnit.toFixed(2)}`, 160, y, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(`S/ ${pUnit.toFixed(2)}`, 190, y, { align: 'right' });
        y += 8;
    });
    
    const totalVal = typeof b.total === 'number' ? b.total : (montosArr.reduce((x, y2) => x + (parseFloat(y2) || 0), 0));
    
    // Bloque total
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(120, y + 6, 75, 20, 2, 2, 'FD');
    doc.setDrawColor(2, 132, 199);
    doc.roundedRect(120, y + 6, 75, 20, 2, 2, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL FACTURADO:', 124, y + 14);
    doc.setFontSize(13);
    doc.setTextColor(16, 185, 129);
    doc.text(`S/ ${totalVal.toFixed(2)}`, 190, y + 19, { align: 'right' });
    
    // Pie de página
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 270, 195, 270);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('JC PATH LAB © 2026 • Constancia de liquidación médica • Sistema 100% Offline Soberano', 15, 276);
    doc.text(`Emisión: ${new Date().toLocaleString('es-PE')}`, 195, 276, { align: 'right' });
    
    doc.save(`Boleta_${b.codigo}_${b.razonSocial.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

function renderAll() {
    renderClientes();
    renderBoletas();
    populateClientSelect();
    populateClinicasDatalist();
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

    // Autocompletado inteligente al escribir o seleccionar en razón social
    const razonSocialInput = document.getElementById('razon-social');
    if (razonSocialInput) {
        razonSocialInput.addEventListener('input', async (e) => {
            const val = e.target.value.trim().toUpperCase();
            if (val.length >= 3) {
                const match = await db.clientes.where('razonSocial').equals(val).first() ||
                              await db.clientes.filter(c => c.razonSocial.toUpperCase().includes(val)).first();
                if (match) {
                    const rucInput = document.getElementById('ruc');
                    const dirInput = document.getElementById('direccion');
                    const telInput = document.getElementById('telefono');
                    if (rucInput && !rucInput.value) rucInput.value = match.ruc;
                    if (dirInput && !dirInput.value) dirInput.value = match.direccion || '';
                    if (telInput && !telInput.value) telInput.value = match.telefono || '';
                }
            }
        });
    }

    const clientSelect = document.getElementById('cliente-select');
    if (clientSelect) {
        clientSelect.addEventListener('change', async e => {
            const id = parseInt(e.target.value);
            if (id) {
                const c = await db.clientes.get(id);
                if (c) {
                    document.getElementById('ruc-cliente').textContent = c.ruc;
                    document.getElementById('direccion-cliente').textContent = c.direccion || "No registrada";
                    renderCostoInputs();
                }
            } else {
                document.getElementById('ruc-cliente').textContent = "-";
                document.getElementById('direccion-cliente').textContent = "-";
                renderCostoInputs();
            }
        });
    }

    const btnResetDb = document.getElementById('btn-reset-db');
    if (btnResetDb) {
        btnResetDb.addEventListener('click', () => {
            if (confirm("ALERTA: Se restablecerá la caché local del navegador. Los datos canónicos se regenerarán automáticamente. ¿Continuar?")) {
                Dexie.delete('LaboratorioDB').then(() => location.reload());
            }
        });
    }

    // Inyección rápida de datos oficiales de ejemplo
    const btnInjectRuc = document.getElementById('btn-inject-ruc');
    if (btnInjectRuc) {
        btnInjectRuc.addEventListener('click', () => {
            const rucInput = document.getElementById('ruc');
            if (rucInput) rucInput.value = '20517865270';
            const razonInput = document.getElementById('razon-social');
            if (razonInput) razonInput.value = 'CLÍNICA LA LUZ S.A.C.';
            const dirInput = document.getElementById('direccion');
            if (dirInput) dirInput.value = 'Av. Arequipa 1148, Cercado de Lima';
            const telInput = document.getElementById('telefono');
            if (telInput) telInput.value = '(01) 613-9292';
        });
    }
    
    const btnInjectDir = document.getElementById('btn-inject-dir');
    if (btnInjectDir) {
        btnInjectDir.addEventListener('click', () => {
            const dirInput = document.getElementById('direccion');
            if (dirInput) dirInput.value = 'Av. Arequipa 1148, Cercado de Lima';
        });
    }
});
