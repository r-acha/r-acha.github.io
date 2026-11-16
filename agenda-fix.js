/*
 * Morriña Cero - Corrección del lector de agenda.txt
 * v2.0 - 16/11/2026
 *
 * Coloca <script src="agenda-fix.js?v=2"></script> JUSTO DESPUÉS
 * del script principal y antes de </body>.
 * No modifica las quedadas ni los datos originales de agenda.txt.
 */
(() => {
  'use strict';

  const meses = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
  };
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const mesPattern = '(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene\\.?|feb\\.?|mar\\.?|abr\\.?|may\\.?|jun\\.?|jul\\.?|ago\\.?|sep\\.?|oct\\.?|nov\\.?|dic\\.?)';
  const diasSemana = /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i;

  function normalizar(s) {
    return String(s || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim();
  }

  function limpiar(s) {
    return String(s || '').replace(/\uFFFD/g, '').replace(/[\uFEFF\u200B\u200E\u200F]/g, '').trim();
  }

  function quitarEmojiFecha(s) {
    return limpiar(s).replace(/^[📅📆🗓️🗓\s]+/u, '').trim();
  }

  function fechaLocal(anio, mes, dia) {
    const d = new Date(anio, mes, dia);
    if (d.getFullYear() !== anio || d.getMonth() !== mes || d.getDate() !== dia) return null;
    return d;
  }

  // Lee tanto «viernes 20 de noviembre de 2026» como
  // «del 14 de noviembre de 2026 al 9 de enero de 2027» o
  // «20, 21 y 22 de noviembre de 2026».
  function leerRangoFechas(texto, anioPorDefecto = null) {
    const s = normalizar(quitarEmojiFecha(texto));
    const mesRe = new RegExp('\\b' + mesPattern + '\\b', 'gi');
    const hallados = [];
    let m;
    while ((m = mesRe.exec(s)) !== null) {
      const antes = s.slice(Math.max(0, m.index - 70), m.index);
      const grupoDias = antes.match(/((?:\b\d{1,2}\s*(?:[,;/\-]\s*|\b(?:y|al|a)\b\s*))*\b\d{1,2})\s*(?:de\s+)?$/i);
      if (!grupoDias) continue;
      const dias = [...grupoDias[1].matchAll(/\b\d{1,2}\b/g)].map(x => Number(x[0]));
      if (!dias.length || dias.some(d => d < 1 || d > 31)) continue;
      const despues = s.slice(m.index + m[0].length);
      const anioMatch = despues.match(/^\s*(?:de\s+)?(20\d{2})\b/);
      hallados.push({ mes: meses[m[1].replace(/\.$/, '')], dias, anio: anioMatch ? Number(anioMatch[1]) : null });
    }
    if (!hallados.length) return null;

    const primero = hallados[0];
    const ultimo = hallados[hallados.length - 1];
    const anioActual = anioPorDefecto || new Date().getFullYear();
    const explicito = hallados.find(x => x.anio !== null);

    let anioInicio = primero.anio;
    if (anioInicio === null) {
      if (ultimo.anio !== null) anioInicio = ultimo.anio - (primero.mes > ultimo.mes ? 1 : 0);
      else anioInicio = explicito ? explicito.anio : anioActual;
    }
    let anioFinal = ultimo.anio;
    if (anioFinal === null) anioFinal = anioInicio + (ultimo.mes < primero.mes ? 1 : 0);

    const inicio = fechaLocal(anioInicio, primero.mes, primero.dias[0]);
    const fin = fechaLocal(anioFinal, ultimo.mes, ultimo.dias[ultimo.dias.length - 1]);
    if (!inicio || !fin || fin < inicio) return null;
    fin.setHours(23, 59, 59, 999);
    return { inicio, fin };
  }

  function esCabeceraFecha(linea) {
    if (linea.startsWith('📆')) return false; // 📆 dentro de un evento indica fechas propias
    const texto = quitarEmojiFecha(linea);
    const n = normalizar(texto);
    if (!new RegExp(mesPattern, 'i').test(n)) return false;
    if (/\bagenda\b/.test(n)) return false;

    const rango = leerRangoFechas(texto);
    if (!rango) return false;
    const dias = (rango.fin - rango.inicio) / 86400000;

    if (diasSemana.test(n)) return true;
    if (/^del?\s+\d{1,2}\b/.test(n)) return dias <= 31;
    if (/^\d{1,2}\s+(?:de\s+)?/.test(n)) return dias <= 31;
    if (/^fin de semana\b/.test(n)) return dias <= 7;
    return false;
  }

  function esNotaOEstructura(linea) {
    const n = normalizar(linea.replace(/^[^\p{L}\d]+/gu, ''));
    if (/^[━─✤═|\-\s]+$/u.test(linea)) return true;
    if (!n) return true;
    if (/^(?:guia de lectura|anadid[oa]\b|aviso\b|importante\b|nota\b|comprueba cambios|recomendaciones\b|actualizada?\b|leyenda\b)/i.test(n)) return true;
    if (/^agenda\b/.test(n)) return true;
    if (/^(?:o salnes|o sar|noia|baixo mino|santiago y alrededores|pontevedra ·|rias baixas ·)/.test(n)) return true;
    if (/\b(?:musica\s*\||teatro\s*\||verbenas\s*\||gastronomia\s*\||familia\s*\|)/.test(n)) return true;
    if (/^(?:una gran temporada|eventos y actividades|exposiciones y actividades|otras actividades|otras citas|programacion de|informacion util)/.test(n)) return true;
    if (/^\d+\s*(?:eventos|actividades)\b/.test(n)) return true;
    if (/^[⚠ℹ📌✅💡🔎👉🔔📝]/u.test(linea)) return true;
    return false;
  }

  function esTituloEvento(linea) {
    if (esNotaOEstructura(linea)) return false;
    if (/^(?:📍|🕒|🕗|⏰|🎟|📆|📅|🗓|🎭\s*compa[ñn][ií]a\s*:|🎤\s*cartel\s*:)/iu.test(linea)) return false;
    if (/^(?:info|precio|entrada|horario|lugar|compa[ñn][ií]a|cartel|organiza|inscripciones|reserva)\s*:/i.test(normalizar(linea))) return false;
    if (/^[🎭🎤🎺🎉🍷🎨🖼🎸🎪🎬🎄🎅🍽🍻🎵🎶🎼🎷🎻🎹🎧🎫🎊🎈🎆🤹🎠🎡🧒👨‍👩‍👧🎥📚📖🏃🚶🏞🌿]/u.test(linea)) return true;
    const letras = linea.match(/[a-záéíóúñüA-ZÁÉÍÓÚÑÜ]/g) || [];
    if (letras.length < 6) return false;
    const mayus = letras.filter(l => l === l.toLocaleUpperCase('es')).length;
    return mayus / letras.length > 0.78 && linea.split(/\s+/).length >= 2 && linea.length < 150;
  }

  function categorizar(titulo, compania) {
    const s = normalizar(titulo + ' ' + (compania || ''));
    if (/^🎺|\borquesta\b|\bverbena\b|\bcharanga\b|\bfesticultores\b|\bla banda de ayer\b/.test(s)) return 'orquestas';
    if (/^🍷|^🎉|^🍽|^🍻|^🎊|\bfesta\b|\bfestas\b|\bfeira\b|\bferia\b|\bmagosto\b|\bmercado\b|\bcentol\w*\b|\bgastronom\w*\b|\btapas\b|\bromeria\b|\bfesta do\b/.test(s)) return 'fiestas';
    if (/^🎤|^🎸|^🎵|^🎶|^🎼|^🎷|^🎻|^🎹|^🎧|\bconcierto\b|\bconcerto\b|\bmusica\b|\bfestival musical\b|\btributo\b|\bunderfest\b|\bkase\b|\bsho-hai\b/.test(s)) return 'musica';
    if (/^🎭|^🎪|^🤹|\bteatro\b|\bhumor\b|\bmonologo\b|\bcomedia\b|\bcomico\b|\bmaxia\b|\bmago\b|\bcompania\b|\bpallaso\b|\bdanza\b/.test(s)) return 'teatro';
    if (/^🎨|^🖼|^📚|^📖|\bexposicion\b|\bmostra\b|\bmiradas\b|\bmuseo\b|\bexhibicion\b|\blectura\b/.test(s)) return 'cultura';
    return 'otros';
  }

  const msjMes = d => nombresMeses[d.getMonth()] + ' ' + d.getFullYear();
  const minutos = s => {
    const m = String(s || '').match(/\b(\d{1,2})[:.](\d{2})\b/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : 9999;
  };
  const html = s => String(s || '').replace(/[&<>"']/g, x => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[x]));

  window.procesarTextoAgenda = function (texto) {
    const lineas = String(texto || '').split(/\r?\n/);
    const resultado = [];
    let cabecera = null;
    let fechaCabeceraActual = '';
    let evento = null;

    function guardarEvento() {
      if (!evento) return;
      const rango = evento.rangoPropio || cabecera;
      if (rango && evento.titulo) {
        resultado.push({
          titulo: evento.titulo,
          lugar: evento.lugar || 'Por confirmar',
          fecha: evento.fecha || evento.fechaCabecera,
          hora: evento.hora || 'Por confirmar',
          precio: evento.precio || 'Por confirmar',
          comp: evento.comp || '',
          fechaOrden: new Date(rango.inicio),
          fechaFin: new Date(rango.fin),
          seccion: categorizar(evento.titulo, evento.comp),
          mes: msjMes(rango.inicio)
        });
      }
      evento = null;
    }

    for (const bruto of lineas) {
      const linea = limpiar(bruto);
      if (!linea) continue;

      if (esCabeceraFecha(linea)) {
        guardarEvento();
        cabecera = leerRangoFechas(linea);
        fechaCabeceraActual = quitarEmojiFecha(linea);
        continue;
      }

      if (esNotaOEstructura(linea)) continue;
      if (!cabecera) continue; // Descarta prólogos y anuncios generales, antes del primer día

      // Las propiedades se procesan ANTES de buscar títulos o fechas de cabecera.
      if (/^📍/u.test(linea)) {
        if (evento) evento.lugar = linea.replace(/^📍\s*/u, '').trim();
        continue;
      }
      if (/^(?:🕒|🕗|⏰)/u.test(linea)) {
        if (evento) {
          evento.hora = linea.replace(/^(?:🕒|🕗|⏰)\s*/u, '').trim();
          // Algunas agendas escriben aquí los días del evento, p. ej.
          // «20, 21 y 22 de noviembre; desfile el sábado».
          if (/^(?:del?\s+)?\d{1,2}[\s,]/i.test(normalizar(evento.hora))) {
            const propio = leerRangoFechas(evento.hora, cabecera.inicio.getFullYear());
            if (propio) {
              evento.rangoPropio = propio;
              evento.fecha = evento.hora.split(';')[0].trim();
            }
          }
        }
        continue;
      }
      if (/^🎟/u.test(linea)) {
        if (evento) evento.precio = linea.replace(/^🎟️?\s*/u, '').trim();
        continue;
      }
      if (/^🎭\s*compa[ñn][ií]a\s*:/iu.test(linea)) {
        if (evento) evento.comp = linea.replace(/^🎭\s*compa[ñn][ií]a\s*:\s*/iu, '').trim();
        continue;
      }
      if (/^🎤\s*cartel\s*:/iu.test(linea)) {
        if (evento) evento.titulo += ' — ' + linea.replace(/^🎤\s*cartel\s*:\s*/iu, '').trim();
        continue;
      }
      if (/^(?:📆|📅|🗓)/u.test(linea)) {
        if (evento) {
          const propio = leerRangoFechas(linea, cabecera.inicio.getFullYear());
          if (propio) {
            evento.rangoPropio = propio;
            evento.fecha = quitarEmojiFecha(linea);
          }
        }
        continue;
      }
      if (/^(?:🎫|💶|💰)\s*/u.test(linea)) {
        if (evento) evento.precio = linea.replace(/^(?:🎫|💶|💰)\s*/u, '').trim();
        continue;
      }
      if (!esTituloEvento(linea)) continue;

      guardarEvento();
      evento = {
        titulo: linea,
        fechaCabecera: fechaCabeceraActual,
        lugar: 'Por confirmar',
        hora: 'Por confirmar',
        precio: 'Por confirmar',
        comp: '',
        rangoPropio: null
      };
    }
    guardarEvento();

    resultado.sort((a, b) => a.fechaOrden - b.fechaOrden || minutos(a.hora) - minutos(b.hora));
    eventosAgendaCompleta = resultado;
    window.renderAgenda();
  };

  // Adaptación de la función anterior: se mantiene el diseño de las tarjetas,
  // pero se añade una categoría neutral y se corrigen los filtros por rangos largos.
  window.renderAgenda = function () {
    const contenedor = document.getElementById('lista-eventos');
    if (!contenedor) return;
    const busqueda = normalizar(document.getElementById('buscador-eventos')?.value || '');
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const filtroSeccion = (typeof seccionFiltro !== 'undefined') ? seccionFiltro : 'todas';
    const filtroMes = (typeof mesFiltro !== 'undefined') ? mesFiltro : 'todos';
    const esconderPasados = (typeof ocultarPasados !== 'undefined') ? ocultarPasados : true;

    let desdeMes = null, hastaMes = null;
    if (filtroMes !== 'todos') {
      const match = normalizar(filtroMes).match(/^([a-z]+)\s+(20\d{2})$/);
      if (match && meses[match[1]] !== undefined) {
        desdeMes = new Date(Number(match[2]), meses[match[1]], 1);
        hastaMes = new Date(Number(match[2]), meses[match[1]] + 1, 0, 23, 59, 59, 999);
      }
    }

    const visibles = eventosAgendaCompleta.filter(ev => {
      if (esconderPasados && ev.fechaFin < hoy) return false;
      if (filtroSeccion !== 'todas' && ev.seccion !== filtroSeccion) return false;
      if (desdeMes && !(ev.fechaOrden <= hastaMes && ev.fechaFin >= desdeMes)) return false;
      return normalizar([ev.titulo, ev.lugar, ev.fecha, ev.hora, ev.comp].join(' ')).includes(busqueda);
    });

    if (!visibles.length) {
      contenedor.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 bg-wa-card/30 rounded-xl border border-dashed border-wa-border"><i class="fa-solid fa-calendar-xmark text-2xl mb-2 text-slate-500"></i><p class="text-xs">No se encontraron eventos para los filtros seleccionados.</p></div>`;
      return;
    }

    const estilos = {
      orquestas: { icon: 'fa-music', nombre: 'Orquesta', clase: 'text-yellow-400 bg-yellow-950/60 border-yellow-800/50' },
      musica: { icon: 'fa-microphone', nombre: 'Música en vivo', clase: 'text-purple-400 bg-purple-950/60 border-purple-800/50' },
      fiestas: { icon: 'fa-champagne-glasses', nombre: 'Fiestas & Ferias', clase: 'text-amber-400 bg-amber-950/60 border-amber-800/50' },
      teatro: { icon: 'fa-masks-theater', nombre: 'Teatro & Espectáculo', clase: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50' },
      cultura: { icon: 'fa-palette', nombre: 'Cultura & Exposiciones', clase: 'text-cyan-300 bg-cyan-950/60 border-cyan-800/50' },
      otros: { icon: 'fa-calendar-check', nombre: 'Otros planes', clase: 'text-slate-300 bg-slate-800/60 border-slate-600/50' }
    };

    contenedor.innerHTML = visibles.map(ev => {
      const idx = eventosAgendaCompleta.indexOf(ev);
      const estilo = estilos[ev.seccion] || estilos.otros;
      const pasado = ev.fechaFin < hoy;
      const gratis = /\b(gratis|gratuito|gratuita|libre)\b/i.test(ev.precio);
      const precioBadge = gratis
        ? '<span class="bg-emerald-500/20 text-wa-green font-bold px-2 py-0.5 rounded text-[10px] border border-wa-green/30">GRATIS</span>'
        : `<span class="bg-wa-card text-slate-300 font-medium px-2 py-0.5 rounded text-[10px] border border-wa-border max-w-[140px] truncate" title="${html(ev.precio)}">${html(ev.precio)}</span>`;
      const pasadoBadge = pasado ? '<span class="bg-red-900/40 text-red-300 font-bold px-2 py-0.5 rounded text-[10px] border border-red-800/40">FINALIZADO</span>' : '';
      return `<div onclick="abrirModalEvento(${idx})" class="bg-wa-panel border border-wa-border hover:border-wa-green/50 p-4 rounded-xl transition cursor-pointer flex flex-col justify-between shadow-sm group ${pasado ? 'opacity-40 filter saturate-50 border-dashed' : ''}">
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] gap-2">
            <span class="inline-flex items-center gap-1 font-semibold border px-2.5 py-0.5 rounded-full ${estilo.clase} shrink-0"><i class="fa-solid ${estilo.icon} text-[10px]"></i> ${estilo.nombre}</span>
            <div class="flex items-center gap-1.5 min-w-0">${pasadoBadge}${precioBadge}</div>
          </div>
          <h4 class="font-bold text-white text-sm sm:text-base leading-snug group-hover:text-emerald-300 transition-colors">${html(ev.titulo)}</h4>
          ${ev.comp ? `<p class="text-[11px] text-emerald-400 font-medium">🎭 Cía: ${html(ev.comp)}</p>` : ''}
          <p class="text-xs text-slate-300 flex items-start gap-1.5 pt-0.5"><i class="fa-solid fa-location-dot text-red-400 mt-0.5 text-xs shrink-0"></i><span class="leading-snug">${html(ev.lugar)}</span></p>
        </div>
        <div class="mt-3 pt-2.5 border-t border-wa-border/70 flex flex-col gap-1.5 text-[11px] text-slate-300">
          <div class="flex items-start justify-between gap-2">
            <span class="flex items-start gap-1.5 font-medium leading-snug"><i class="fa-regular fa-calendar text-wa-green mt-0.5 shrink-0"></i><span>${html(ev.fecha || 'Fecha por confirmar')}</span></span>
            <i class="fa-solid fa-chevron-right text-[10px] text-slate-500 group-hover:text-wa-green transition-transform group-hover:translate-x-0.5 mt-1 shrink-0"></i>
          </div>
          ${ev.hora !== 'Por confirmar' ? `<div class="flex items-start gap-1.5 pl-4"><span class="text-slate-200 font-mono text-[10px] bg-wa-card px-2 py-0.5 rounded border border-wa-border leading-normal break-words">🕒 ${html(ev.hora)}</span></div>` : ''}
        </div>
      </div>`;
    }).join('');
  };

  // También corregimos la etiqueta del modal para las nuevas categorías.
  const abrirModalOriginal = window.abrirModalEvento;
  if (typeof abrirModalOriginal === 'function') {
    window.abrirModalEvento = function (indice) {
      abrirModalOriginal(indice);
      const ev = eventosAgendaCompleta[indice];
      if (!ev || !['cultura', 'otros'].includes(ev.seccion)) return;
      const badge = document.getElementById('modalEvBadge');
      if (!badge) return;
      if (ev.seccion === 'cultura') {
        badge.className = 'inline-flex items-center gap-1 text-[11px] font-semibold border px-2.5 py-0.5 rounded-full text-cyan-300 bg-cyan-950/60 border-cyan-800/50';
        badge.innerHTML = '<i class="fa-solid fa-palette text-[10px]"></i> Cultura & Exposiciones';
      } else {
        badge.className = 'inline-flex items-center gap-1 text-[11px] font-semibold border px-2.5 py-0.5 rounded-full text-slate-300 bg-slate-800/60 border-slate-600/50';
        badge.innerHTML = '<i class="fa-solid fa-calendar-check text-[10px]"></i> Otros planes';
      }
    };
  }

  // Añadir filtro sin tocar el resto del HTML.
  window.addEventListener('DOMContentLoaded', () => {
    const fila = document.getElementById('filtros-seccion');
    if (fila && !document.getElementById('filtro-cultura')) {
      const boton = document.createElement('button');
      boton.id = 'filtro-cultura';
      boton.textContent = '🎨 Cultura & Exposiciones';
      boton.className = 'sec-btn px-3 py-1.5 rounded-full bg-wa-card text-slate-300 hover:bg-wa-hover whitespace-nowrap border border-wa-border';
      boton.addEventListener('click', () => filtrarSeccion('cultura', boton));
      fila.appendChild(boton);
      const otros = document.createElement('button');
      otros.textContent = '📌 Otros planes';
      otros.className = 'sec-btn px-3 py-1.5 rounded-full bg-wa-card text-slate-300 hover:bg-wa-hover whitespace-nowrap border border-wa-border';
      otros.addEventListener('click', () => filtrarSeccion('otros', otros));
      fila.appendChild(otros);
    }
  });
})();
