import * as THREE from "three";
import dados from "./data/municipios.json";
import contorno from "./data/contorno.json";

// Mapa do Brasil feito de pontos: cada ponto é uma das 5.571 localidades do IBGE.
// Pulsos acendem prefeituras ao acaso e arcos ligam uma cidade a outra —
// "o Brasil inteiro comprando".

const K = 0.13; // unidades por grau
const LON0 = -53;
const LAT0 = -14.5;
const COS = Math.cos((15 * Math.PI) / 180);
const proj = (lon, lat) => [(lon - LON0) * COS * K, (lat - LAT0) * K];

const BRASILIA = proj(-47.93, -15.78);

const vertPontos = /* glsl */ `
  attribute float tam;
  attribute float fase;
  attribute float ordem;
  attribute float brilho;
  uniform float uTempo;
  uniform float uPixel;
  uniform float uRevela;
  varying float vB;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float pisca = 0.62 + 0.38 * sin(uTempo * 1.4 + fase * 6.2831);
    float on = smoothstep(ordem - 0.06, ordem, uRevela);
    vB = brilho * pisca * on;
    gl_PointSize = tam * uPixel * (34.0 / -mv.z) * (0.4 + 0.6 * on);
    gl_Position = projectionMatrix * mv;
  }
`;
const fragPontos = /* glsl */ `
  uniform vec3 uCor;
  varying float vB;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 1.7);
    gl_FragColor = vec4(uCor * (0.55 + vB * 0.7), a * vB);
  }
`;

const vertAnel = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fragAnel = /* glsl */ `
  uniform float uProg;
  uniform vec3 uCor;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float r = uProg;
    float anel = smoothstep(0.09, 0.0, abs(d - r));
    float nucleo = smoothstep(0.18, 0.0, d) * (1.0 - uProg);
    float a = (anel * (1.0 - uProg) + nucleo) ;
    gl_FragColor = vec4(uCor, a);
  }
`;

export function iniciarMapa(canvas, chip) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const MENTA = new THREE.Color(0x6fe3ad);
  const BRANCO = new THREE.Color(0xeafff4);

  const palco = new THREE.Group(); // posição na tela (desktop: à direita)
  const mapa = new THREE.Group(); // inclinação
  palco.add(mapa);
  cena.add(palco);

  // ---------- pontos ----------
  const m = dados.m;
  const N = m.length;
  const pos = new Float32Array(N * 3);
  const tam = new Float32Array(N);
  const fase = new Float32Array(N);
  const ordem = new Float32Array(N);
  const brilho = new Float32Array(N);
  let dmax = 0;
  const dist = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const [lon, lat, plog, cap] = m[i];
    const [x, y] = proj(lon, lat);
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = 0;
    tam[i] = 0.55 + Math.max(0, plog - 3.4) * 0.75 + (cap ? 1.4 : 0);
    fase[i] = Math.random();
    brilho[i] = cap ? 1.5 : 0.55 + Math.max(0, plog - 3.6) * 0.35;
    dist[i] = Math.hypot(x - BRASILIA[0], y - BRASILIA[1]);
    dmax = Math.max(dmax, dist[i]);
  }
  // revelação em onda a partir de Brasília
  for (let i = 0; i < N; i++) ordem[i] = (dist[i] / dmax) * 0.92 + Math.random() * 0.08;

  const geoP = new THREE.BufferGeometry();
  geoP.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geoP.setAttribute("tam", new THREE.BufferAttribute(tam, 1));
  geoP.setAttribute("fase", new THREE.BufferAttribute(fase, 1));
  geoP.setAttribute("ordem", new THREE.BufferAttribute(ordem, 1));
  geoP.setAttribute("brilho", new THREE.BufferAttribute(brilho, 1));
  const uniP = {
    uTempo: { value: 0 },
    uPixel: { value: renderer.getPixelRatio() },
    uRevela: { value: 0 },
    uCor: { value: MENTA },
  };
  const matP = new THREE.ShaderMaterial({
    vertexShader: vertPontos,
    fragmentShader: fragPontos,
    uniforms: uniP,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  mapa.add(new THREE.Points(geoP, matP));

  // ---------- contorno ----------
  const matLinha = new THREE.LineBasicMaterial({ color: MENTA, transparent: true, opacity: 0.55 });
  const matSombra = new THREE.LineBasicMaterial({ color: MENTA, transparent: true, opacity: 0.12 });
  for (const anel of contorno) {
    const pts = anel.map(([lon, lat]) => new THREE.Vector3(...proj(lon, lat), 0));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    mapa.add(new THREE.LineLoop(g, matLinha));
    const s = new THREE.LineLoop(g, matSombra);
    s.position.z = -0.12;
    mapa.add(s);
  }

  // grade fina embaixo do mapa — dá chão e profundidade
  const grade = new THREE.GridHelper(9, 36, 0x1b7a4f, 0x123b29);
  grade.rotation.x = Math.PI / 2;
  grade.position.z = -0.14;
  grade.material.transparent = true;
  grade.material.opacity = 0.18;
  mapa.add(grade);

  // ---------- pulsos e arcos ----------
  const geoAnel = new THREE.PlaneGeometry(1, 1);
  const pulsos = [];
  const pesos = []; // sorteio ponderado pela população
  let soma = 0;
  for (let i = 0; i < N; i++) {
    soma += Math.pow(10, m[i][2] - 3);
    pesos.push(soma);
  }
  const sortear = () => {
    const r = Math.random() * soma;
    let lo = 0;
    let hi = N - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pesos[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  function criarPulso(i, origem) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertAnel,
      fragmentShader: fragAnel,
      uniforms: { uProg: { value: 0 }, uCor: { value: BRANCO } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const anel = new THREE.Mesh(geoAnel, mat);
    anel.position.set(pos[i * 3], pos[i * 3 + 1], 0.01);
    anel.scale.setScalar(0.55);
    mapa.add(anel);

    // arco da cidade de origem até o destino
    const a = new THREE.Vector3(pos[origem * 3], pos[origem * 3 + 1], 0);
    const b = anel.position.clone();
    const meio = a.clone().lerp(b, 0.5);
    meio.z = 0.25 + a.distanceTo(b) * 0.35;
    const curva = new THREE.QuadraticBezierCurve3(a, meio, b);
    const geoArco = new THREE.BufferGeometry().setFromPoints(curva.getPoints(60));
    geoArco.setDrawRange(0, 0);
    const matArco = new THREE.LineBasicMaterial({ color: MENTA, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
    const arco = new THREE.Line(geoArco, matArco);
    mapa.add(arco);

    pulsos.push({ anel, arco, t: 0, i });
  }

  // ---------- chip com o nome da cidade ----------
  const v = new THREE.Vector3();
  let chipAlvo = null;
  function mostrarChip(i) {
    const [, , , cap, uf, nome] = m[i];
    const sigla = dados.ufs[uf];
    const tipo = sigla === "DF" ? "União" : cap ? "Governo do Estado" : "Prefeitura";
    chip.innerHTML = `<b>${tipo}</b>${nome} · ${sigla}`;
    chipAlvo = i;
    chip.classList.remove("on");
    void chip.offsetWidth;
    chip.classList.add("on");
  }

  // ---------- estado externo ----------
  const estado = { progresso: 0, revela: 0, mx: 0, my: 0, tx: 0, ty: 0, ativo: true };
  let largura = 1;

  function tamanho() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    largura = w;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniP.uPixel.value = renderer.getPixelRatio() * Math.min(1.3, Math.max(0.75, w / 1440));
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
  let proximo = 1.2;
  let proximoChip = 2.2;

  function quadro(ts) {
    requestAnimationFrame(quadro);
    relogio.update(ts);
    if (!visivel) return;
    const t = relogio.getElapsed();
    const dt = Math.min(relogio.getDelta(), 0.05);
    const p = estado.progresso;
    const mobile = largura < 900;

    uniP.uTempo.value = t;
    estado.revela = Math.min(1.05, estado.revela + dt * 0.45);
    uniP.uRevela.value = estado.revela;

    estado.mx += (estado.tx - estado.mx) * 0.05;
    estado.my += (estado.ty - estado.my) * 0.05;

    // posição/inclinação: fica à direita (desktop) ou no alto (celular); com o scroll fica de frente
    palco.position.x = mobile ? 0 : 2.3 + p * 0.05;
    palco.position.y = mobile ? 1.15 + p * 0.25 : 0.05 + p * 0.25;
    palco.scale.setScalar(mobile ? 0.62 : 0.92);
    mapa.rotation.x = -0.95 + p * 0.7 + estado.my * 0.15;
    mapa.rotation.z = 0.18 - p * 0.18 + Math.sin(t * 0.15) * 0.04 + estado.mx * 0.12;
    mapa.rotation.y = estado.mx * 0.1;

    // novos pulsos
    if (estado.revela > 0.6 && t > proximo && estado.ativo) {
      const alvo = sortear();
      criarPulso(alvo, sortear());
      proximo = t + 0.45 + Math.random() * 0.5;
      // no celular o mapa fica atrás do título: etiqueta só depois que o texto sai
      if (t > proximoChip && (!mobile || p > 0.45)) {
        mostrarChip(alvo);
        proximoChip = t + 2.4;
      }
    }
    for (let k = pulsos.length - 1; k >= 0; k--) {
      const pu = pulsos[k];
      pu.t += dt;
      const ida = Math.min(1, pu.t / 0.9);
      pu.arco.geometry.setDrawRange(0, Math.floor(ida * 61));
      if (pu.t > 0.9) {
        const prog = Math.min(1, (pu.t - 0.9) / 1.6);
        pu.anel.material.uniforms.uProg.value = prog;
        pu.arco.material.opacity = 0.85 * (1 - prog);
      } else {
        pu.anel.material.uniforms.uProg.value = 0.999;
      }
      if (pu.t > 2.6) {
        mapa.remove(pu.anel, pu.arco);
        pu.anel.material.dispose();
        pu.arco.geometry.dispose();
        pu.arco.material.dispose();
        pulsos.splice(k, 1);
      }
    }

    renderer.render(cena, camera);

    // chip acompanha a cidade na tela
    if (chipAlvo !== null) {
      v.set(pos[chipAlvo * 3], pos[chipAlvo * 3 + 1], 0).applyMatrix4(mapa.matrixWorld).project(camera);
      const x = (v.x * 0.5 + 0.5) * canvas.clientWidth;
      const y = (-v.y * 0.5 + 0.5) * canvas.clientHeight;
      // se não couber à direita, a etiqueta vira para a esquerda do ponto
      const w = chip.offsetWidth;
      const vira = x + w + 30 > canvas.clientWidth;
      chip.classList.toggle("esq", vira);
      chip.style.transform = `translate(${vira ? x - w - 28 : x}px, ${y}px)`;
    }
  }
  requestAnimationFrame(quadro);

  return {
    setProgresso(p) {
      estado.progresso = p;
      estado.ativo = p < 0.98;
    },
  };
}
