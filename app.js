// =============================================
// Ticketon - Sistema de Tickets QR
// app.js
// =============================================

// Variables globales
let tickets = [];
let ticketsUsados = new Set();
let usuarios = [];
let usuarioActual = null;
let rolActual = null;
let vistaActual = null;
let modoVerificacion = 'manual';
let html5QrcodeScanner = null;

// Cargar datos al iniciar
window.addEventListener('DOMContentLoaded', function () {
    cargarDatos();
    verificarSesion();
});

// =============================================
// PERSISTENCIA DE DATOS
// =============================================

function cargarDatos() {
    try {
        // Cargar tickets
        const ticketsGuardados = localStorage.getItem('tickets');
        if (ticketsGuardados) {
            tickets = JSON.parse(ticketsGuardados);
        }

        // Cargar tickets usados
        const usadosGuardados = localStorage.getItem('tickets-usados');
        if (usadosGuardados) {
            ticketsUsados = new Set(JSON.parse(usadosGuardados));
        }

        // Cargar usuarios
        const usuariosGuardados = localStorage.getItem('usuarios');
        if (usuariosGuardados) {
            usuarios = JSON.parse(usuariosGuardados);
        } else {
            // Crear usuario admin por defecto
            usuarios = [
                { usuario: 'leon', password: 'benitez01', rol: 'admin' }
            ];
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
    }
}

function guardarDatos() {
    try {
        localStorage.setItem('tickets', JSON.stringify(tickets));
        localStorage.setItem('tickets-usados', JSON.stringify([...ticketsUsados]));
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
    } catch (error) {
        console.error('Error al guardar datos:', error);
    }
}

// =============================================
// SESIÓN
// =============================================

function verificarSesion() {
    const sesion = localStorage.getItem('sesion-activa');
    if (sesion) {
        const datos = JSON.parse(sesion);
        usuarioActual = datos.usuario;
        rolActual = datos.rol;
        mostrarPanel();
    }
}

function iniciarSesion() {
    const usuario = document.getElementById('login-usuario').value.trim();
    const password = document.getElementById('login-password').value;

    const usuarioEncontrado = usuarios.find(function (u) {
        return u.usuario === usuario && u.password === password;
    });

    if (usuarioEncontrado) {
        usuarioActual = usuarioEncontrado.usuario;
        rolActual = usuarioEncontrado.rol;

        // Guardar sesión
        localStorage.setItem('sesion-activa', JSON.stringify({
            usuario: usuarioActual,
            rol: rolActual
        }));

        mostrarPanel();
        document.getElementById('error-login').classList.add('hidden');
    } else {
        document.getElementById('error-login').classList.remove('hidden');
    }
}

function cerrarSesion() {
    localStorage.removeItem('sesion-activa');
    usuarioActual = null;
    rolActual = null;
    detenerEscaneo();
    document.getElementById('app').classList.add('hidden');
    document.getElementById('pantalla-login').classList.remove('hidden');
    document.getElementById('login-usuario').value = '';
    document.getElementById('login-password').value = '';
}

// =============================================
// PANEL PRINCIPAL
// =============================================

function mostrarPanel() {
    document.getElementById('pantalla-login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('usuario-actual').textContent = usuarioActual;

    // Configurar menú según el rol
    const menu = document.getElementById('menu-navegacion');
    menu.innerHTML = '';

    if (rolActual === 'admin') {
        document.getElementById('rol-actual').textContent = 'Administrador';
        menu.innerHTML = `
            <button onclick="cambiarVista('admin-usuarios')" id="btn-admin-usuarios" class="flex-1 min-w-[120px] py-2 px-4 rounded-lg font-medium transition bg-indigo-600 text-white">
                 Usuarios
            </button>
            <button onclick="cambiarVista('generar')" id="btn-generar" class="flex-1 min-w-[120px] py-2 px-4 rounded-lg font-medium transition bg-gray-200 text-gray-700 hover:bg-gray-300">
                 Generar
            </button>
            <button onclick="cambiarVista('verificar')" id="btn-verificar" class="flex-1 min-w-[120px] py-2 px-4 rounded-lg font-medium transition bg-gray-200 text-gray-700 hover:bg-gray-300">
                Verificar
            </button>
            <button onclick="cambiarVista('lista')" id="btn-lista" class="flex-1 min-w-[120px] py-2 px-4 rounded-lg font-medium transition bg-gray-200 text-gray-700 hover:bg-gray-300">
                 Lista (<span id="contador-tickets">0</span>)
            </button>
        `;
        cambiarVista('admin-usuarios');
    } else if (rolActual === 'organizador') {
        document.getElementById('rol-actual').textContent = 'Organizador';
        menu.innerHTML = `
            <button onclick="cambiarVista('verificar')" id="btn-verificar" class="flex-1 min-w-[120px] py-2 px-4 rounded-lg font-medium transition bg-indigo-600 text-white">
                 Verificar
            </button>
            <button onclick="cambiarVista('lista')" id="btn-lista" class="flex-1 min-w-[120px] py-2 px-4 rounded-lg font-medium transition bg-gray-200 text-gray-700 hover:bg-gray-300">
                 Lista (<span id="contador-tickets">0</span>)
            </button>
        `;
        cambiarVista('verificar');
    } else if (rolActual === 'guardia') {
        document.getElementById('rol-actual').textContent = 'Guardia de Seguridad';
        menu.innerHTML = `
            <button onclick="cambiarVista('verificar')" id="btn-verificar" class="flex-1 min-w-[120px] py-2 px-4 rounded-lg font-medium transition bg-indigo-600 text-white">
                 Verificar Tickets
            </button>
        `;
        cambiarVista('verificar');
    }

    actualizarEstadisticas();
    actualizarContador();
}

// =============================================
// FUNCIONES ADMIN - USUARIOS
// =============================================

function crearUsuario() {
    const usuario = document.getElementById('nuevo-usuario').value.trim();
    const password = document.getElementById('nuevo-password').value;
    const rol = document.getElementById('nuevo-rol').value;

    if (!usuario || !password) {
        alert('Por favor completa todos los campos');
        return;
    }

    // Verificar si el usuario ya existe
    const existe = usuarios.find(function (u) {
        return u.usuario === usuario;
    });

    if (existe) {
        alert('El usuario ya existe');
        return;
    }

    usuarios.push({ usuario: usuario, password: password, rol: rol });
    guardarDatos();
    actualizarListaUsuarios();

    document.getElementById('nuevo-usuario').value = '';
    document.getElementById('nuevo-password').value = '';
    alert('Usuario creado exitosamente');
}

function eliminarUsuario(usuario) {
    if (usuario === 'leon') {
        alert('No puedes eliminar el usuario administrador principal');
        return;
    }

    if (confirm('¿Estás seguro de eliminar este usuario?')) {
        usuarios = usuarios.filter(function (u) {
            return u.usuario !== usuario;
        });
        guardarDatos();
        actualizarListaUsuarios();
    }
}

function actualizarListaUsuarios() {
    const tbody = document.getElementById('lista-usuarios');
    tbody.innerHTML = '';

    usuarios.forEach(function (u) {
        if (u.rol !== 'admin') {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            tr.innerHTML = `
                <td class="px-4 py-3 text-sm">${u.usuario}</td>
                <td class="px-4 py-3 text-sm">
                    <span class="px-2 py-1 rounded text-xs font-semibold ${u.rol === 'organizador' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                        ${u.rol === 'organizador' ? '👔 Organizador' : '🛡️ Guardia'}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <button onclick="eliminarUsuario('${u.usuario}')" class="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition">
                        Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });
}

// =============================================
// FUNCIONES ADMIN - SISTEMA
// =============================================

function resetearTickets() {
    if (rolActual !== 'admin') {
        alert('Solo los administradores pueden realizar esta acción');
        return;
    }

    if (confirm('⚠️ ¿Estás seguro de eliminar TODOS los tickets?\n\nEsta acción NO se puede deshacer.')) {
        if (confirm('⚠️ CONFIRMACIÓN FINAL: Se eliminarán ' + tickets.length + ' tickets.\n\n¿Continuar?')) {
            tickets = [];
            ticketsUsados = new Set();
            guardarDatos();
            actualizarEstadisticas();
            actualizarContador();
            mostrarListaTickets();
            alert('✅ Todos los tickets han sido eliminados');
        }
    }
}

function resetearSistemaCompleto() {
    if (rolActual !== 'admin') {
        alert('Solo los administradores pueden realizar esta acción');
        return;
    }

    if (confirm('⚠️⚠️⚠️ ADVERTENCIA CRÍTICA ⚠️⚠️⚠️\n\nEsto eliminará:\n- Todos los tickets\n- Todos los usuarios (excepto admin)\n- Todo el historial\n\n¿ESTÁS COMPLETAMENTE SEGURO?')) {
        if (confirm('ÚLTIMA CONFIRMACIÓN:\n\nEscribe mentalmente "CONFIRMAR" y presiona OK para resetear el sistema completo.')) {
            // Resetear tickets
            tickets = [];
            ticketsUsados = new Set();

            // Resetear usuarios (mantener solo admin)
            usuarios = [
                { usuario: 'leon', password: 'benitez01', rol: 'admin' }
            ];

            guardarDatos();
            actualizarEstadisticas();
            actualizarContador();
            actualizarListaUsuarios();
            mostrarListaTickets();

            alert('✅ Sistema completamente reseteado.\n\nSolo queda el usuario administrador "leon".');
        }
    }
}

// =============================================
// GENERAR TICKETS
// =============================================

function generarCodigo() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return 'TKT-' + timestamp + '-' + random;
}

function generarTickets() {
    // Solo admin puede generar tickets
    if (rolActual !== 'admin') {
        alert('❌ Acceso denegado: Solo los administradores pueden generar tickets');
        return;
    }

    const evento = document.getElementById('nombre-evento').value.trim();
    const cantidad = parseInt(document.getElementById('cantidad-tickets').value);

    if (!evento) {
        alert('Por favor ingresa el nombre del evento');
        return;
    }

    if (cantidad < 1 || cantidad > 100) {
        alert('La cantidad debe estar entre 1 y 100');
        return;
    }

    for (let i = 0; i < cantidad; i++) {
        tickets.push({
            id: generarCodigo(),
            evento: evento,
            fecha: new Date().toLocaleString('es-MX'),
            numero: tickets.length + 1,
            creador: usuarioActual
        });
    }

    guardarDatos();
    actualizarEstadisticas();
    actualizarContador();
    alert('✅ ' + cantidad + ' ticket(s) generado(s) exitosamente');
}

// =============================================
// VERIFICAR TICKETS
// =============================================

function cambiarModoVerificacion(modo) {
    modoVerificacion = modo;

    if (modo === 'manual') {
        document.getElementById('btn-modo-manual').className = 'flex-1 py-2 px-4 rounded-lg font-medium transition bg-indigo-600 text-white';
        document.getElementById('btn-modo-escanear').className = 'flex-1 py-2 px-4 rounded-lg font-medium transition bg-gray-200 text-gray-700 hover:bg-gray-300';
        document.getElementById('modo-manual').classList.remove('hidden');
        document.getElementById('modo-escanear').classList.add('hidden');
        detenerEscaneo();
    } else {
        document.getElementById('btn-modo-manual').className = 'flex-1 py-2 px-4 rounded-lg font-medium transition bg-gray-200 text-gray-700 hover:bg-gray-300';
        document.getElementById('btn-modo-escanear').className = 'flex-1 py-2 px-4 rounded-lg font-medium transition bg-indigo-600 text-white';
        document.getElementById('modo-manual').classList.add('hidden');
        document.getElementById('modo-escanear').classList.remove('hidden');
        iniciarEscaneo();
    }
}

function iniciarEscaneo() {
    if (html5QrcodeScanner) {
        return;
    }

    html5QrcodeScanner = new Html5Qrcode("qr-reader");

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        function (decodedText, decodedResult) {
            verificarTicketEscaneado(decodedText);
        },
        function (errorMessage) {
            // Error normal durante el escaneo
        }
    ).catch(function (err) {
        console.error('Error al iniciar cámara:', err);
        alert('No se pudo acceder a la cámara. Por favor verifica los permisos.');
    });
}

function detenerEscaneo() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(function () {
            html5QrcodeScanner = null;
        }).catch(function (err) {
            console.error('Error al detener escaneo:', err);
        });
    }
}

function verificarTicketEscaneado(codigo) {
    detenerEscaneo();

    const codigoLimpio = codigo.trim().toUpperCase();
    const ticket = tickets.find(function (t) {
        return t.id === codigoLimpio;
    });

    if (!ticket) {
        mostrarResultado('invalido', '❌ Ticket no existe', 'Este código no está registrado en el sistema');
        setTimeout(function () {
            if (modoVerificacion === 'escanear') {
                iniciarEscaneo();
            }
        }, 3000);
        return;
    }

    if (ticketsUsados.has(codigoLimpio)) {
        mostrarResultado('usado', '⚠️ Ticket ya utilizado', 'Este ticket ya fue escaneado anteriormente', ticket);
        setTimeout(function () {
            if (modoVerificacion === 'escanear') {
                iniciarEscaneo();
            }
        }, 3000);
        return;
    }

    ticketsUsados.add(codigoLimpio);
    guardarDatos();
    actualizarEstadisticas();

    mostrarResultado('valido', '✅ Ticket Válido', 'Acceso permitido', ticket);

    setTimeout(function () {
        if (modoVerificacion === 'escanear') {
            iniciarEscaneo();
        }
    }, 3000);
}

function verificarTicket() {
    const codigo = document.getElementById('codigo-verificar').value.trim().toUpperCase();

    if (!codigo) {
        mostrarResultado('error', 'Por favor ingresa un código', '');
        return;
    }

    const ticket = tickets.find(function (t) {
        return t.id === codigo;
    });

    if (!ticket) {
        mostrarResultado('invalido', '❌ Ticket no existe', 'Este código no está registrado en el sistema');
        return;
    }

    if (ticketsUsados.has(codigo)) {
        mostrarResultado('usado', '⚠️ Ticket ya utilizado', 'Este ticket ya fue escaneado anteriormente', ticket);
        return;
    }

    ticketsUsados.add(codigo);
    guardarDatos();
    actualizarEstadisticas();

    mostrarResultado('valido', '✅ Ticket Válido', 'Acceso permitido', ticket);
}

function mostrarResultado(tipo, mensaje, descripcion, ticket) {
    const resultado = document.getElementById('resultado-verificacion');
    resultado.classList.remove('hidden');

    let colorClasses = '';
    let icono = '';

    if (tipo === 'valido') {
        colorClasses = 'bg-green-50 border-2 border-green-500';
        icono = '<svg class="w-8 h-8 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    } else if (tipo === 'usado') {
        colorClasses = 'bg-yellow-50 border-2 border-yellow-500';
        icono = '<svg class="w-8 h-8 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    } else {
        colorClasses = 'bg-red-50 border-2 border-red-500';
        icono = '<svg class="w-8 h-8 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }

    let ticketInfo = '';
    if (ticket) {
        ticketInfo = '<div class="mt-3 pt-3 border-t border-gray-300">' +
            '<p class="text-sm text-gray-600"><strong>Evento:</strong> ' + ticket.evento + '</p>' +
            '<p class="text-sm text-gray-600"><strong>Ticket #:</strong> ' + ticket.numero + '</p>' +
            '<p class="text-sm text-gray-600"><strong>Fecha emisión:</strong> ' + ticket.fecha + '</p>' +
            '</div>';
    }

    resultado.innerHTML = '<div class="' + colorClasses + ' p-6 rounded-lg fade-in">' +
        '<div class="flex items-start gap-3">' +
        icono +
        '<div class="flex-1">' +
        '<h3 class="text-xl font-bold mb-1">' + mensaje + '</h3>' +
        '<p class="text-gray-700">' + descripcion + '</p>' +
        ticketInfo +
        '</div></div></div>';
}

// =============================================
// NAVEGACIÓN DE VISTAS
// =============================================

function cambiarVista(vista) {
    if (vistaActual === 'verificar') {
        detenerEscaneo();
    }

    vistaActual = vista;

    // Ocultar todas las vistas
    document.getElementById('vista-admin-usuarios').classList.add('hidden');
    document.getElementById('vista-generar').classList.add('hidden');
    document.getElementById('vista-verificar').classList.add('hidden');
    document.getElementById('vista-lista').classList.add('hidden');

    // Resetear todos los botones del menú
    const botones = document.getElementById('menu-navegacion').querySelectorAll('button');
    botones.forEach(function (btn) {
        btn.className = 'flex-1 min-w-[120px] py-2 px-4 rounded-lg font-medium transition bg-gray-200 text-gray-700 hover:bg-gray-300';
    });

    // Mostrar vista seleccionada
    const vistaElemento = document.getElementById('vista-' + vista);
    if (vistaElemento) {
        vistaElemento.classList.remove('hidden');
    }

    const botonActivo = document.getElementById('btn-' + vista);
    if (botonActivo) {
        botonActivo.className = 'flex-1 min-w-[120px] py-2 px-4 rounded-lg font-medium transition bg-indigo-600 text-white';
    }

    if (vista === 'lista') {
        mostrarListaTickets();
    } else if (vista === 'admin-usuarios') {
        actualizarListaUsuarios();
    }
}

// =============================================
// LISTA DE TICKETS
// =============================================

function mostrarListaTickets() {
    const contenedor = document.getElementById('contenedor-tickets');

    if (tickets.length === 0) {
        contenedor.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">' +
            '<svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path>' +
            '</svg><p>No hay tickets generados aún</p></div>';
        return;
    }

    let html = '';
    tickets.forEach(function (ticket) {
        const usado = ticketsUsados.has(ticket.id);
        const qrId = 'qr-' + ticket.id.replace(/[^a-zA-Z0-9]/g, '');

        html += '<div class="border-2 rounded-lg p-4 ' + (usado ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50') + ' fade-in">' +
            '<div class="text-center mb-3">' +
            '<h3 class="font-bold text-gray-800 truncate">' + ticket.evento + '</h3>' +
            '<p class="text-sm text-gray-600">Ticket #' + ticket.numero + '</p>' +
            '<p class="text-xs text-gray-500">' + ticket.fecha + '</p>' +
            '</div>' +
            '<div class="bg-white p-3 rounded-lg mb-3 flex justify-center">' +
            '<div id="' + qrId + '" class="qr-code"></div>' +
            '</div>' +
            '<p class="text-xs text-center font-mono text-gray-600 mb-2 break-all">' + ticket.id + '</p>' +
            '<div class="flex items-center justify-between">' +
            '<span class="text-xs font-semibold px-2 py-1 rounded ' + (usado ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800') + '">' +
            (usado ? '✓ Usado' : '○ Disponible') +
            '</span>' +
            '<button onclick="descargarTicket(\'' + ticket.id + '\')" class="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition">' +
            '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>' +
            '</svg>Descargar</button>' +
            '</div></div>';
    });

    contenedor.innerHTML = html;

    setTimeout(function () {
        tickets.forEach(function (ticket) {
            const qrId = 'qr-' + ticket.id.replace(/[^a-zA-Z0-9]/g, '');
            const qrElement = document.getElementById(qrId);
            if (qrElement && qrElement.innerHTML === '') {
                new QRCode(qrElement, {
                    text: ticket.id,
                    width: 150,
                    height: 150,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        });
    }, 100);
}

// =============================================
// DESCARGAR TICKET
// =============================================

function descargarTicket(ticketId) {
    const ticket = tickets.find(function (t) {
        return t.id === ticketId;
    });
    if (!ticket) return;

    const qrId = 'qr-' + ticketId.replace(/[^a-zA-Z0-9]/g, '');
    const qrElement = document.getElementById(qrId);

    if (!qrElement) {
        alert('Error: No se pudo encontrar el código QR');
        return;
    }

    const qrImg = qrElement.querySelector('img');
    if (!qrImg) {
        alert('Error: El código QR aún no se ha generado');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(ticket.evento, 200, 30);

    ctx.font = '14px Arial';
    ctx.fillText('Ticket #' + ticket.numero, 200, 55);
    ctx.fillText(ticket.fecha, 200, 75);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
        ctx.drawImage(img, 50, 100, 300, 300);

        ctx.font = '12px monospace';
        ctx.fillText(ticket.id, 200, 430);

        const link = document.createElement('a');
        link.download = 'ticket-' + ticket.numero + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    img.src = qrImg.src;
}

// =============================================
// ESTADÍSTICAS Y CONTADOR
// =============================================

function actualizarEstadisticas() {
    const estadisticas = document.getElementById('estadisticas');
    if (estadisticas) {
        const total = tickets.length;
        const usados = ticketsUsados.size;
        const disponibles = total - usados;

        estadisticas.textContent = ' Total: ' + total + ' | Usados: ' + usados + ' | Disponibles: ' + disponibles;
    }
}

function actualizarContador() {
    const contador = document.getElementById('contador-tickets');
    if (contador) {
        contador.textContent = tickets.length;
    }
}
