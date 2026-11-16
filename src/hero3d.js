import * as THREE from "three";

// Tipos de documento que flutuam no hero — o caminho "do edital ao empenho".
const TIPOS = [
  { titulo: "EDITAL DE LICITAÇÃO", num: "PE nº 047/2026", selo: null },
  { titulo: "PROPOSTA COMERCIAL", num: "Lote 03", selo: null },
  { titulo: "ATA DA SESSÃO PÚBLICA", num: "Sessão 14:00", selo: "HABILITADA" },
  { titulo: "CONTRATO ADMINISTRATIVO", num: "nº 112/2026", selo: null, assinatura: true },
  { titulo: "NOTA DE EMPENHO", num: "2026NE000318", selo: "EMPENHADO" },
];

function texturaDocumento(tipo, i) {
  const W = 512;
  const H = 724;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  g.fillStyle = "#f6f3ec";
  g.fillRect(0, 0, W, H);

  // brasão/topo
  g.fillStyle = "#1b7a4f";
  g.fillRect(40, 40, 6, 46);
  g.fillStyle = "#0c1a14";
  g.font = "700 22px Georgia, serif";
  g.fillText(tipo.titulo, 60, 62);
  g.fillStyle = "#6b7a72";
  g.font = "16px 'Courier New', monospace";
  g.fillText(tipo.num, 60, 86);
  g.fillStyle = "rgba(12,26,20,0.15)";
  g.fillRect(40, 110, W - 80, 2);

  // linhas de texto
  let y = 150;
  const rnd = mulberry(i * 97 + 13);
  for (let l = 0; l < 17; l++) {
    const w = (W - 80) * (l % 6 === 5 ? 0.45 + rnd() * 0.2 : 0.82 + rnd() * 0.18);
    g.fillStyle = "rgba(12,26,20,0.13)";
    roundRect(g, 40, y, w, 9, 4);
    if (l === 3 || l === 9) {
      g.fillStyle = "rgba(111,227,173,0.55)";
      roundRect(g, 40, y - 3, w * 0.7, 15, 3);
    }
    y += l % 6 === 5 ? 38 : 24;
  }

  if (tipo.assinatura) {
    g.strokeStyle = "#183a8a";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(70, 640);
    g.bezierCurveTo(110, 560, 140, 660, 170, 610);
    g.bezierCurveTo(200, 570, 220, 650, 260, 615);
    g.bezierCurveTo(290, 590, 330, 640, 380, 600);
    g.stroke();
    g.fillStyle = "#0c1a14";
    g.fillRect(60, 660, 330, 1.5);
  }

  if (tipo.selo) {
    g.save();
    g.translate(W - 150, H - 120);
    g.rotate(-0.16);
    g.strokeStyle = "rgba(27,122,79,0.9)";
    g.lineWidth = 5;
    g.strokeRect(-110, -36, 220, 72);
    g.lineWidth = 2;
    g.strokeRect(-102, -28, 204, 56);
    g.fillStyle = "rgba(27,122,79,0.95)";
    g.font = "800 28px 'Courier New', monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(tipo.selo, 0, 2);
    g.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Papel levemente curvado: desloca os vértices em z com uma senoide.
function geometriaPapel() {
  const geo = new THREE.PlaneGeometry(1.6, 2.26, 16, 16);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin((x / 1.6 + 0.5) * Math.PI) * 0.09 + Math.sin(y * 1.3) * 0.03);
  }
  geo.computeVertexNormals();
  return geo;
}

export function iniciarHero3D(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x06140e, 1);

  const cena = new THREE.Scene();
  cena.fog = new THREE.Fog(0x06140e, 7, 24);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  cena.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(-4, 6, 8);
  cena.add(sol);
  const brilho = new THREE.PointLight(0x6fe3ad, 30, 18);
  brilho.position.set(3, -1, 4);
  cena.add(brilho);

  const geo = geometriaPapel();
  const materiais = TIPOS.map(
    (t, i) => new THREE.MeshStandardMaterial({ map: texturaDocumento(t, i), side: THREE.DoubleSide, roughness: 0.85, metalness: 0 })
  );

  const grupo = new THREE.Group();
  cena.add(grupo);

  const rnd = mulberry(7);
  const papeis = [];
  const N = 26;
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(geo, materiais[i % materiais.length]);
    const z = -16 + rnd() * 17;
    // mais papéis do lado direito, para o título respirar à esquerda
    const x = (rnd() < 0.72 ? 0.6 + rnd() * 6.5 : -6.5 + rnd() * 6) * (1 + (-z) * 0.06);
    const y = (-4 + rnd() * 8) * (1 + (-z) * 0.05);
    m.position.set(x, y, z);
    m.rotation.set((rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.4, (rnd() - 0.5) * 1.2);
    m.userData = {
      base: m.position.clone(),
      rot: m.rotation.clone(),
      vel: 0.2 + rnd() * 0.5,
      fase: rnd() * Math.PI * 2,
      giro: (rnd() - 0.5) * 0.25,
    };
    grupo.add(m);
    papeis.push(m);
  }

  // estado controlado de fora (scroll) e pelo mouse
  const estado = { progresso: 0, mx: 0, my: 0, tx: 0, ty: 0 };

  function tamanho() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // no celular os papéis ficam mais pra trás para não cobrir o título
    camera.fov = w < 900 ? 52 : 38;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(tamanho).observe(canvas);
  tamanho();

  if (window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", (e) => {
      estado.tx = e.clientX / window.innerWidth - 0.5;
      estado.ty = e.clientY / window.innerHeight - 0.5;
    });
  }

  let visivel = true;
  new IntersectionObserver(([e]) => (visivel = e.isIntersecting)).observe(canvas);

  const relogio = new THREE.Timer();
  function quadro(ts) {
    requestAnimationFrame(quadro);
    relogio.update(ts);
    if (!visivel) return;
    const t = relogio.getElapsed();
    const p = estado.progresso;

    estado.mx += (estado.tx - estado.mx) * 0.05;
    estado.my += (estado.ty - estado.my) * 0.05;

    for (const m of papeis) {
      const d = m.userData;
      m.position.y = d.base.y + Math.sin(t * d.vel + d.fase) * 0.18;
      m.position.x = d.base.x + Math.cos(t * d.vel * 0.7 + d.fase) * 0.1;
      m.rotation.x = d.rot.x + Math.sin(t * d.vel * 0.6 + d.fase) * 0.12 + p * 0.8;
      m.rotation.y = d.rot.y + t * d.giro * 0.2 + p * d.giro * 6;
      m.rotation.z = d.rot.z + Math.cos(t * d.vel * 0.5) * 0.06;
    }

    // scroll: a câmera atravessa a pilha de documentos
    camera.position.z = 9 - p * 13;
    camera.position.x = estado.mx * 0.8 + p * 1.2;
    camera.position.y = -estado.my * 0.6 - p * 0.6;
    camera.lookAt(p * 1.5, 0, camera.position.z - 9);
    grupo.rotation.z = p * 0.25;

    renderer.render(cena, camera);
  }
  requestAnimationFrame(quadro);

  return {
    setProgresso(p) {
      estado.progresso = p;
    },
  };
}
