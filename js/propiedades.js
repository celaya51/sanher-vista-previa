/* SANHER · comportamiento del sitio.
   Un solo archivo con guardas: cada bloque se activa solo si la página tiene su contenedor.

   1. Listado        filtros, orden, tabs, contador y URL (propiedades.html y landing)
   2. Ficha          galería con carrete y lightbox                       → initGaleria()
   3. Mapa           Leaflet sobre [data-mapa]                            → initMapa()
   4. Menú móvil     hamburguesa del header
   5. Ficha completa abre la ficha de cada propiedad en un diálogo sobre la landing
*/
(() => {
  'use strict';

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
  const sinAcentos = (texto) =>
    String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const anio = $('#anio');
  if (anio) anio.textContent = String(new Date().getFullYear());

  /* ============================ LISTADO ============================ */
  const grid = $('[data-grid]');
  if (grid) {
    const tarjetas = $$('.prop-card', grid).map((el, indice) => ({
      el,
      indice,
      operacion: el.dataset.operacion,
      ciudad: el.dataset.ciudad,
      colonia: el.dataset.colonia,
      tipo: el.dataset.tipo,
      recamaras: Number(el.dataset.recamaras) || 0,
      banos: Number(el.dataset.banos) || 0,
      precio: Number(el.dataset.precio) || 0,
      area: Number(el.dataset.area) || 0,
      destacada: el.dataset.destacada === '1',
      nombre: sinAcentos(el.dataset.nombre),
    }));
    const total = tarjetas.length;
    const tabs = $$('[data-tab]');
    const panel = $('[data-filtros] .prop-filtros__panel');
    const abrirFiltros = $('[data-abrir-filtros]');
    const cuentaFiltros = $('[data-cuenta-filtros]');
    const contador = $('[data-contador]');
    const resumen = $('[data-resumen]');
    const vacio = $('[data-vacio]');
    const ordenSelect = $('[data-orden]');
    const campo = (nombre) => $(`[data-filtro="${nombre}"]`);
    const chips = $$('.prop-chip', $('[data-filtro="recamaras"]') ?? document);

    const estado = {
      operacion: 'todas',
      ciudad: '',
      colonia: '',
      tipo: '',
      recamaras: 0,
      banos: 0,
      precioMin: 0,
      precioMax: 0,
      orden: 'relevancia',
    };

    const leerUrl = () => {
      const params = new URLSearchParams(location.search);
      estado.operacion = ['venta', 'renta', 'todas'].includes(params.get('operacion')) ? params.get('operacion') : 'todas';
      estado.ciudad = params.get('ciudad') ?? '';
      estado.colonia = params.get('colonia') ?? '';
      estado.tipo = params.get('tipo') ?? '';
      estado.recamaras = Math.max(0, Number(params.get('recamaras')) || 0);
      estado.banos = Math.max(0, Number(params.get('banos')) || 0);
      estado.precioMin = Math.max(0, Number(params.get('precioMin')) || 0);
      estado.precioMax = Math.max(0, Number(params.get('precioMax')) || 0);
      estado.orden = ['relevancia', 'precio-asc', 'precio-desc', 'area-desc'].includes(params.get('orden'))
        ? params.get('orden')
        : 'relevancia';
    };

    const escribirUrl = () => {
      const params = new URLSearchParams();
      if (estado.operacion !== 'todas') params.set('operacion', estado.operacion);
      if (estado.ciudad) params.set('ciudad', estado.ciudad);
      if (estado.colonia) params.set('colonia', estado.colonia);
      if (estado.tipo) params.set('tipo', estado.tipo);
      if (estado.recamaras) params.set('recamaras', String(estado.recamaras));
      if (estado.banos) params.set('banos', String(estado.banos));
      if (estado.precioMin) params.set('precioMin', String(estado.precioMin));
      if (estado.precioMax) params.set('precioMax', String(estado.precioMax));
      if (estado.orden !== 'relevancia') params.set('orden', estado.orden);
      const query = params.toString();
      history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    };

    const filtrosActivos = () =>
      [estado.ciudad, estado.colonia, estado.tipo, estado.recamaras, estado.banos, estado.precioMin, estado.precioMax]
        .filter((valor) => valor !== '' && valor !== 0).length;

    const coincide = (t) => {
      if (estado.operacion !== 'todas' && t.operacion !== estado.operacion) return false;
      if (estado.ciudad && t.ciudad !== estado.ciudad) return false;
      if (estado.colonia) {
        const tokens = sinAcentos(estado.colonia).split(/[\s-]+/).filter(Boolean);
        if (!tokens.every((token) => t.colonia.includes(token))) return false;
      }
      if (estado.tipo && t.tipo !== estado.tipo) return false;
      if (estado.recamaras && t.recamaras < estado.recamaras) return false;
      if (estado.banos && t.banos < estado.banos) return false;
      if (estado.precioMin && t.precio < estado.precioMin) return false;
      if (estado.precioMax && t.precio > estado.precioMax) return false;
      return true;
    };

    const ordenar = (lista) => {
      const copia = [...lista];
      if (estado.orden === 'precio-asc') return copia.sort((a, b) => a.precio - b.precio || a.indice - b.indice);
      if (estado.orden === 'precio-desc') return copia.sort((a, b) => b.precio - a.precio || a.indice - b.indice);
      if (estado.orden === 'area-desc') return copia.sort((a, b) => b.area - a.area || a.indice - b.indice);
      return copia.sort((a, b) => Number(b.destacada) - Number(a.destacada) || a.indice - b.indice);
    };

    const sincronizarControles = () => {
      tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.tab === estado.operacion)));
      const ciudad = campo('ciudad');
      const colonia = campo('colonia');
      const tipo = campo('tipo');
      const banos = campo('banos');
      const precioMin = campo('precioMin');
      const precioMax = campo('precioMax');
      if (ciudad) ciudad.value = estado.ciudad;
      if (colonia) colonia.value = estado.colonia;
      if (tipo) tipo.value = estado.tipo;
      if (banos) banos.value = estado.banos ? String(estado.banos) : '';
      if (precioMin) precioMin.value = estado.precioMin || '';
      if (precioMax) precioMax.value = estado.precioMax || '';
      chips.forEach((chip) => chip.setAttribute('aria-pressed', String(Number(chip.dataset.valor) === estado.recamaras)));
      if (ordenSelect) ordenSelect.value = estado.orden;
    };

    const aplicar = () => {
      const visibles = tarjetas.filter(coincide);
      const ordenadas = ordenar(visibles);
      tarjetas.forEach((t) => { t.el.hidden = true; });
      ordenadas.forEach((t) => {
        t.el.hidden = false;
        grid.append(t.el);
      });
      if (contador) contador.textContent = `${visibles.length} ${visibles.length === 1 ? 'propiedad' : 'propiedades'}`;
      if (vacio) vacio.hidden = visibles.length !== 0;
      if (resumen) {
        const activos = filtrosActivos();
        resumen.hidden = visibles.length === total && activos === 0;
        resumen.textContent = `Mostrando ${visibles.length} de ${total} propiedades${activos ? ` · ${activos} filtro${activos === 1 ? '' : 's'} activo${activos === 1 ? '' : 's'}` : ''}.`;
      }
      if (cuentaFiltros) {
        const activos = filtrosActivos();
        cuentaFiltros.hidden = activos === 0;
        cuentaFiltros.textContent = String(activos);
      }
      escribirUrl();
    };

    const reiniciarFiltros = () => {
      Object.assign(estado, { ciudad: '', colonia: '', tipo: '', recamaras: 0, banos: 0, precioMin: 0, precioMax: 0 });
      sincronizarControles();
      aplicar();
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        estado.operacion = tab.dataset.tab;
        sincronizarControles();
        aplicar();
      });
    });

    const enlazar = (nombre, evento = 'change') => {
      const el = campo(nombre);
      if (!el) return;
      el.addEventListener(evento, () => {
        if (el.type === 'number') estado[nombre] = Math.max(0, Number(el.value) || 0);
        else if (nombre === 'recamaras' || nombre === 'banos') estado[nombre] = Number(el.value) || 0;
        else estado[nombre] = el.value;
        aplicar();
      });
    };

    ['ciudad', 'tipo', 'banos'].forEach((nombre) => enlazar(nombre));
    enlazar('colonia', 'input');
    enlazar('precioMin', 'input');
    enlazar('precioMax', 'input');

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const valor = Number(chip.dataset.valor) || 0;
        estado.recamaras = estado.recamaras === valor ? 0 : valor;
        sincronizarControles();
        aplicar();
      });
    });

    if (ordenSelect) {
      ordenSelect.addEventListener('change', () => {
        estado.orden = ordenSelect.value;
        aplicar();
      });
    }

    $$('[data-limpiar]').forEach((boton) => boton.addEventListener('click', reiniciarFiltros));

    const movil = window.matchMedia('(max-width: 759px)');
    const ajustarPanel = () => {
      if (!panel || !abrirFiltros) return;
      if (!movil.matches) {
        panel.hidden = false;
        abrirFiltros.setAttribute('aria-expanded', 'true');
      } else {
        panel.hidden = true;
        abrirFiltros.setAttribute('aria-expanded', 'false');
      }
    };

    if (abrirFiltros && panel) {
      abrirFiltros.addEventListener('click', () => {
        const abierto = panel.hidden;
        panel.hidden = !abierto;
        abrirFiltros.setAttribute('aria-expanded', String(abierto));
        if (abierto) $('select, input', panel)?.focus();
      });
      movil.addEventListener('change', ajustarPanel);
      ajustarPanel();
    }

    window.addEventListener('popstate', () => {
      leerUrl();
      sincronizarControles();
      aplicar();
    });

    leerUrl();
    sincronizarControles();
    aplicar();
  }

  /* ============================ FICHA ============================ */
  const initGaleria = (raiz = document) => {
    const galeria = $('[data-galeria]', raiz);
    if (!galeria) return;
    const imagen = $('[data-galeria-imagen]', galeria);
    const abrir = $('[data-galeria-abrir]', galeria);
    const contador = $('[data-galeria-contador]', galeria);
    const miniaturas = $$('[data-galeria-mini]', galeria);
    const etiquetas = (galeria.dataset.etiquetas ?? '').split('|').filter(Boolean);
    const total = Number(galeria.dataset.total) || miniaturas.length || 1;
    let actual = 0;

    const pintar = (indice) => {
      actual = (indice + total) % total;
      const miniatura = miniaturas[actual];
      const foco = miniatura ? miniatura.style.objectPosition || '50% 50%' : '50% 50%';
      // Si cada miniatura apunta a un archivo distinto (fotos reales), cambia el src;
      // en las fichas de ejemplo todas comparten archivo y solo cambia el encuadre.
      const srcMini = miniatura?.querySelector('img')?.getAttribute('src');
      const etiqueta = etiquetas[actual] ?? `Fotografía ${actual + 1}`;
      if (imagen) {
        if (srcMini) imagen.src = srcMini;
        imagen.style.objectPosition = foco;
        imagen.alt = `Fotografía de ${document.title.split('|')[0].trim()} — ${etiqueta}`;
      }
      miniaturas.forEach((m, i) => {
        m.classList.toggle('activa', i === actual);
        m.setAttribute('aria-pressed', String(i === actual));
      });
      // El carrete de miniaturas sigue a la foto activa
      if (miniatura?.parentElement) {
        const carrete = miniatura.parentElement;
        const destino = miniatura.offsetLeft - (carrete.clientWidth - miniatura.offsetWidth) / 2;
        carrete.scrollTo({ left: Math.max(0, destino), behavior: 'smooth' });
      }
      if (contador) contador.textContent = `${actual + 1} / ${total}`;
      if (abrir) abrir.setAttribute('aria-label', `Ampliar fotografía: ${etiqueta} (${actual + 1} de ${total})`);
      const lightboxImagen = $('[data-lightbox-imagen]');
      if (lightboxImagen) {
        if (srcMini) lightboxImagen.src = srcMini;
        lightboxImagen.style.objectPosition = foco;
        lightboxImagen.alt = `Fotografía ampliada — ${etiqueta}`;
      }
      const pie = $('[data-lightbox-pie]');
      if (pie) pie.textContent = `${etiqueta} · ${actual + 1}/${total}`;
    };

    miniaturas.forEach((miniatura, i) => miniatura.addEventListener('click', () => pintar(i)));
    $('[data-galeria-prev]', galeria)?.addEventListener('click', () => pintar(actual - 1));
    $('[data-galeria-next]', galeria)?.addEventListener('click', () => pintar(actual + 1));

    galeria.addEventListener('keydown', (evento) => {
      if (evento.key === 'ArrowLeft') { evento.preventDefault(); pintar(actual - 1); }
      if (evento.key === 'ArrowRight') { evento.preventDefault(); pintar(actual + 1); }
    });

    const lightbox = $('[data-lightbox]', raiz);
    if (lightbox && abrir && typeof lightbox.showModal === 'function') {
      const cerrar = $('[data-lightbox-cerrar]', lightbox);
      abrir.addEventListener('click', () => {
        lightbox.showModal();
        document.body.classList.add('ficha-con-lightbox');
      });
      const salir = () => {
        if (lightbox.open) lightbox.close();
        document.body.classList.remove('ficha-con-lightbox');
      };
      cerrar?.addEventListener('click', salir);
      $('[data-lightbox-prev]', lightbox)?.addEventListener('click', () => pintar(actual - 1));
      $('[data-lightbox-next]', lightbox)?.addEventListener('click', () => pintar(actual + 1));
      lightbox.addEventListener('click', (evento) => { if (evento.target === lightbox) salir(); });
      lightbox.addEventListener('close', () => document.body.classList.remove('ficha-con-lightbox'));
      document.addEventListener('keydown', (evento) => {
        if (!lightbox.open) return;
        if (evento.key === 'ArrowLeft') { evento.preventDefault(); pintar(actual - 1); }
        if (evento.key === 'ArrowRight') { evento.preventDefault(); pintar(actual + 1); }
        if (evento.key === 'Escape') salir();
      });
    }
  };

  initGaleria();

  /* ========================= COMPARTIR ========================= */
  const compartir = $('[data-compartir]');
  if (compartir) {
    const boton = $('[data-compartir-boton]', compartir);
    const menu = $('[data-compartir-menu]', compartir);
    const estado = $('[data-copiar-estado]', compartir);
    const esMovil = () => window.matchMedia('(max-width: 760px)').matches;

    const cerrarMenu = () => {
      if (!menu || menu.hidden) return;
      menu.hidden = true;
      boton?.setAttribute('aria-expanded', 'false');
    };

    boton?.addEventListener('click', async () => {
      if (navigator.share && esMovil()) {
        try {
          await navigator.share({ title: document.title, url: location.href });
        } catch (error) {
          if (error?.name !== 'AbortError') console.warn('No se pudo compartir:', error);
        }
        return;
      }
      if (!menu) return;
      const abrirMenu = menu.hidden;
      menu.hidden = !abrirMenu;
      boton.setAttribute('aria-expanded', String(abrirMenu));
      if (abrirMenu) $('a, button', menu)?.focus();
    });

    document.addEventListener('click', (evento) => {
      if (!compartir.contains(evento.target)) cerrarMenu();
    });

    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') {
        const estabaAbierto = menu ? !menu.hidden : false;
        cerrarMenu();
        if (estabaAbierto) boton?.focus();
      }
    });

    $('[data-copiar-enlace]', compartir)?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(location.href);
      } catch {
        const campo = document.createElement('textarea');
        campo.value = location.href;
        campo.setAttribute('readonly', '');
        campo.style.position = 'fixed';
        campo.style.opacity = '0';
        document.body.append(campo);
        campo.select();
        document.execCommand('copy');
        campo.remove();
      }
      if (estado) {
        estado.textContent = 'Enlace copiado';
        window.setTimeout(() => { estado.textContent = ''; }, 2600);
      }
    });
  }

  /* ============================ MAPA ============================ */
  const initMapa = (raiz = document) => {
    const mapa = $('[data-mapa]', raiz);
    if (!mapa || mapa.dataset.mapaListo === '1') return;
    const lienzo = $('.ficha-mapa__lienzo', mapa);
    const lat = Number(mapa.dataset.lat);
    const lng = Number(mapa.dataset.lng);
    if (lienzo && window.L && Number.isFinite(lat) && Number.isFinite(lng)) {
      const interactivo = window.matchMedia('(min-width: 760px)').matches;
      const mapaLeaflet = window.L.map(lienzo, {
        scrollWheelZoom: false,
        dragging: interactivo,
        touchZoom: interactivo,
        zoomControl: true,
        attributionControl: true,
      }).setView([lat, lng], 15);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(mapaLeaflet);

      const pin = window.L.divIcon({
        className: 'pin-sanher',
        iconSize: [40, 48],
        iconAnchor: [20, 46],
        popupAnchor: [0, -42],
        html: '<svg viewBox="0 0 40 48" width="40" height="48" aria-hidden="true"><path d="M20 1C10.6 1 3 8.6 3 18c0 13 17 28 17 28s17-15 17-28C37 8.6 29.4 1 20 1Z" fill="#0e3226" stroke="#b3913d" stroke-width="3"/><circle cx="20" cy="18" r="6" fill="#b3913d"/></svg>',
      });

      const marcador = window.L.marker([lat, lng], { icon: pin, title: mapa.dataset.titulo, keyboard: true }).addTo(mapaLeaflet);
      marcador.bindPopup(`<strong>${mapa.dataset.titulo ?? 'Propiedad SANHER'}</strong>`);
      mapa.dataset.mapaListo = '1';
      window.setTimeout(() => mapaLeaflet.invalidateSize(), 150);
    }
  };

  initMapa();

  /* ============================ MENÚ MÓVIL ============================ */
  const menuBoton = $('[data-menu-boton]');
  const menu = $('[data-menu]');
  if (menuBoton && menu) {
    const cerrarMenu = () => {
      menu.removeAttribute('data-abierto');
      menuBoton.setAttribute('aria-expanded', 'false');
      menuBoton.setAttribute('aria-label', 'Abrir menú de navegación');
    };
    menuBoton.addEventListener('click', () => {
      const abierto = menu.getAttribute('data-abierto') === '1';
      if (abierto) {
        cerrarMenu();
      } else {
        menu.setAttribute('data-abierto', '1');
        menuBoton.setAttribute('aria-expanded', 'true');
        menuBoton.setAttribute('aria-label', 'Cerrar menú de navegación');
      }
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) cerrarMenu(); });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !menuBoton.contains(e.target)) cerrarMenu();
    });
  }

  /* ============ FICHA COMPLETA DENTRO DE LA LANDING ============ */
  const fichaDlg = document.getElementById('ficha-dialogo');
  const fichaCuerpo = fichaDlg?.querySelector('[data-ficha-contenido]');
  if (fichaDlg && fichaCuerpo) {
    const cerrarFicha = () => {
      if (fichaDlg.open) fichaDlg.close();
      fichaCuerpo.innerHTML = '';
    };

    document.addEventListener('click', (e) => {
      const enlace = e.target.closest('[data-ficha-id]');
      if (!enlace) return;
      const id = enlace.dataset.fichaId;
      const plantilla = document.querySelector(`template[data-ficha-completa="${id}"]`);
      if (!plantilla) return; // sin plantilla: sigue el enlace a la ficha
      e.preventDefault();
      fichaCuerpo.innerHTML = '';
      fichaCuerpo.appendChild(plantilla.content.cloneNode(true));
      initGaleria(fichaCuerpo); // galería y visor de la ficha clonada
      initMapa(fichaCuerpo);    // mapa Leaflet de la ficha clonada
      fichaDlg.querySelector('[data-ficha-cerrar]')?.addEventListener('click', cerrarFicha);
      fichaDlg.showModal();
      fichaCuerpo.scrollTop = 0;
    });

    fichaDlg.addEventListener('click', (e) => { if (e.target === fichaDlg) cerrarFicha(); });
    fichaDlg.addEventListener('close', () => {
      fichaCuerpo.innerHTML = '';
    });

  }

  /* Un solo manejador de teclado para las capas que se abren encima de la página. */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('ficha-dialogo')?.open) {
      document.querySelector('[data-ficha-cerrar]')?.click();
    } else if (document.querySelector('[data-menu][data-abierto="1"]')) {
      document.querySelector('[data-menu-boton]')?.click();
    }
  });

})();
