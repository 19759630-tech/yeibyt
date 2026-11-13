const API_CONVERSION = "";

const CALIDADES = {
  mp3: [
    { valor: "64 kbps",  etiqueta: "Low" },
    { valor: "128 kbps", etiqueta: "Medium" },
    { valor: "192 kbps", etiqueta: "High" },
    { valor: "320 kbps", etiqueta: "Very High" }
  ],
  wav: [
    { valor: "16-bit / 44.1 kHz", etiqueta: "" },
    { valor: "24-bit / 48 kHz",   etiqueta: "" },
    { valor: "32-bit / 96 kHz",   etiqueta: "Studio" }
  ]
};

const estado = {
  idVideo: null,
  urlVideo: "",
  formato: "mp3",
  calidad: { mp3: 1, wav: 1 }
};

const $ = (id) => document.getElementById(id);

const pantallas = document.querySelectorAll(".pantalla");
const inputUrl = $("input-url");
const mensajeUrl = $("mensaje-url");
const selector = $("selector-calidad");
const listaCalidad = $("lista-calidad");

function irA(id) {
  pantallas.forEach((p) => p.classList.toggle("activa", p.id === id));
  window.scrollTo({ top: 0 });
}

document.querySelectorAll("[data-ir]").forEach((btn) => {
  btn.addEventListener("click", () => irA(btn.dataset.ir));
});

function sacarId(url) {
  const patron = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/;
  const r = url.trim().match(patron);
  return r ? r[1] : null;
}

function avisar(texto, esError) {
  mensajeUrl.textContent = texto;
  mensajeUrl.classList.toggle("error", !!esError);
}

async function buscarVideo() {
  const url = inputUrl.value.trim();
  const id = sacarId(url);

  if (!id) {
    avisar("Ese enlace no parece de YouTube, revisa que esté completo", true);
    return;
  }

  avisar("Buscando video...");
  estado.idVideo = id;
  estado.urlVideo = url;


  $("miniatura").src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  $("duracion").textContent = "--:--:--";

  let titulo = "";
  let artista = "";
  try {
    const resp = await fetch(
      "https://www.youtube.com/oembed?format=json&url=" +
        encodeURIComponent("https://www.youtube.com/watch?v=" + id)
    );
    if (!resp.ok) throw new Error("no encontrado");
    const datos = await resp.json();
    titulo = datos.title || "";
    artista = (datos.author_name || "").replace(/ - Topic$/, "");
  } catch (e) {
    avisar("No pudimos encontrar ese video, prueba con otro enlace", true);
    return;
  }

  $("input-titulo").value = titulo;
  $("input-artista").value = artista;

  pedirDuracion(id);
  avisar("Pega una URL de YouTube para continuar");
  actualizarFormato();
  irA("pantalla-info");
}

$("btn-buscar").addEventListener("click", buscarVideo);
inputUrl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") buscarVideo();
});
inputUrl.addEventListener("paste", () => setTimeout(buscarVideo, 50));

let reproductor = null;
let apiLista = false;
let idPendiente = null;

window.onYouTubeIframeAPIReady = function () {
  apiLista = true;
  if (idPendiente) pedirDuracion(idPendiente);
};

function formatearTiempo(seg) {
  seg = Math.round(seg);
  const h = String(Math.floor(seg / 3600)).padStart(2, "0");
  const m = String(Math.floor((seg % 3600) / 60)).padStart(2, "0");
  const s = String(seg % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function pedirDuracion(id) {
  if (!apiLista) { idPendiente = id; return; }
  idPendiente = null;

  if (!reproductor) {
    const cont = document.createElement("div");
    cont.id = "yt-oculto";
    cont.style.cssText = "position:absolute;width:1px;height:1px;left:-9999px;";
    document.body.appendChild(cont);

    reproductor = new YT.Player("yt-oculto", {
      videoId: id,
      events: { onReady: () => leerDuracion(id) }
    });
  } else {
    reproductor.cueVideoById(id);
    leerDuracion(id);
  }
}

function leerDuracion(id, intentos = 0) {
  const d = reproductor && reproductor.getDuration ? reproductor.getDuration() : 0;
  if (d > 0) {
    if (estado.idVideo === id) $("duracion").textContent = formatearTiempo(d);
  } else if (intentos < 15) {
    setTimeout(() => leerDuracion(id, intentos + 1), 400);
  }
}

function actualizarFormato() {
  const f = estado.formato;

  document.querySelectorAll(".opcion-formato").forEach((b) => {
    b.classList.toggle("activa", b.dataset.formato === f);
  });

  $("etiqueta-calidad").textContent = "Calidad — " + f.toUpperCase();
  $("btn-convertir").textContent = "Cambiar a " + f;

  pintarLista();
  pintarCalidadActual();
}

function textoCalidad(c) {
  return c.etiqueta ? `${c.valor} — ${c.etiqueta}` : c.valor;
}

function pintarCalidadActual() {
  const c = CALIDADES[estado.formato][estado.calidad[estado.formato]];
  $("calidad-texto").textContent = textoCalidad(c);
}

function pintarLista() {
  listaCalidad.innerHTML = "";
  CALIDADES[estado.formato].forEach((c, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.textContent = textoCalidad(c);
    if (i === estado.calidad[estado.formato]) li.classList.add("elegida");
    li.addEventListener("click", () => {
      estado.calidad[estado.formato] = i;
      pintarLista();
      pintarCalidadActual();
      cerrarLista();
    });
    listaCalidad.appendChild(li);
  });
}

function abrirLista() {
  listaCalidad.hidden = false;
  selector.classList.add("abierto");
  $("calidad-actual").setAttribute("aria-expanded", "true");
}
function cerrarLista() {
  listaCalidad.hidden = true;
  selector.classList.remove("abierto");
  $("calidad-actual").setAttribute("aria-expanded", "false");
}

$("calidad-actual").addEventListener("click", () => {
  listaCalidad.hidden ? abrirLista() : cerrarLista();
});
document.addEventListener("click", (e) => {
  if (!selector.contains(e.target)) cerrarLista();
});

document.querySelectorAll(".opcion-formato").forEach((b) => {
  b.addEventListener("click", () => {
    estado.formato = b.dataset.formato;
    actualizarFormato();
  });
});

const modal = $("modal");

$("btn-convertir").addEventListener("click", () => {
  modal.hidden = false;
});
$("modal-no").addEventListener("click", () => {
  modal.hidden = true;
});
$("modal-si").addEventListener("click", () => {
  modal.hidden = true;
  convertir();
});

function limpiarNombre(texto) {
  return texto.replace(/[\\/:*?"<>|]/g, "").trim() || "audio";
}

async function convertir() {
  const circulo = $("circulo-check");
  const barra = $("barra-estado");

  irA("pantalla-listo");
  circulo.classList.add("cargando");
  barra.textContent = "Convirtiendo...";

  const datos = {
    url: estado.urlVideo,
    formato: estado.formato,
    calidad: CALIDADES[estado.formato][estado.calidad[estado.formato]].valor,
    titulo: $("input-titulo").value.trim(),
    artista: $("input-artista").value.trim()
  };

  try {
    if (API_CONVERSION) {
      const resp = await fetch(API_CONVERSION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
      });
      if (!resp.ok) throw new Error("fallo del servidor");
      const blob = await resp.blob();
      descargarBlob(blob, `${limpiarNombre(datos.artista)} - ${limpiarNombre(datos.titulo)}.${datos.formato}`);
    } else {
      // modo demostración: solo simula la espera
      await new Promise((r) => setTimeout(r, 1800));
      console.log("Datos que se enviarían al servidor:", datos);
    }

    circulo.classList.remove("cargando");
    barra.textContent = API_CONVERSION ? "Descarga completada" : "Descarga completada (demo)";
  } catch (err) {
    circulo.classList.remove("cargando");
    barra.textContent = "Algo salió mal, intenta de nuevo";
    console.error(err);
  }
}

function descargarBlob(blob, nombre) {
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 5000);
}

$("btn-otro").addEventListener("click", () => {
  inputUrl.value = "";
  estado.idVideo = null;
  estado.formato = "mp3";
  estado.calidad = { mp3: 1, wav: 1 };
  irA("pantalla-url");
  inputUrl.focus();
});

actualizarFormato();
