import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import "lenis/dist/lenis.css";
import "./style.css";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { iniciarHero3D } from "./hero3d.js";
import { iniciarMontador } from "./montador.js";
import { config, linkWhats } from "./config.js";

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// ---------- links fixos ----------
$$(".js-whats-padrao").forEach((a) => (a.href = linkWhats(config.mensagemPadrao)));
$$("[data-confirmar]").forEach((a) => {
  const v = config[a.dataset.confirmar];
  if (!v) return a.remove();
  a.href = a.dataset.confirmar === "email" ? `mailto:${v}` : v;
});

// ---------- smooth scroll ----------
const lenis = new Lenis({ lerp: 0.09 });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const alvo = $(a.getAttribute("href"));
    if (!alvo) return;
    e.preventDefault();
    lenis.scrollTo(alvo, { offset: a.getAttribute("href") === "#inicio" ? 0 : -20, duration: 1.6 });
  })
);

// ---------- header: some ao descer, volta ao subir; barra de progresso ----------
const topo = $(".topo");
const barra = $(".topo-progresso");
lenis.on("scroll", (l) => {
  barra.style.transform = `scaleX(${l.progress})`;
  if (l.scroll > 240 && l.direction === 1) topo.classList.add("escondido");
  else if (l.direction === -1 || l.scroll < 240) topo.classList.remove("escondido");
});

document.fonts.ready.then(montar);

function montar() {
  const mm = gsap.matchMedia();

  // ================= HERO =================
  const hero3d = iniciarHero3D($(".hero-3d"));

  SplitText.create(".hero-titulo", {
    type: "lines,words",
    mask: "lines",
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.words, { yPercent: 115, duration: 1.4, ease: "expo.out", stagger: 0.09, delay: 0.15 }),
  });
  gsap.from([".hero .eyebrow", ".hero-sub", ".hero-ctas", ".hero-pilulas li"], {
    opacity: 0,
    y: 24,
    duration: 1.1,
    ease: "expo.out",
    stagger: 0.08,
    delay: 0.55,
  });

  // hero preso: a câmera atravessa os documentos e o texto sai
  gsap.timeline({
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "+=90%",
      pin: true,
      scrub: true,
      onUpdate: (self) => hero3d.setProgresso(self.progress),
    },
  })
    .to(".hero-conteudo", { yPercent: -18, opacity: 0, ease: "power1.in" }, 0)
    .to(".hero-pilulas, .hero-rolar", { opacity: 0, y: 30, ease: "power1.in" }, 0);

  // ================= MANIFESTO: palavras acendem =================
  SplitText.create(".js-acende", {
    type: "words",
    autoSplit: true,
    onSplit: (self) =>
      gsap.fromTo(
        self.words,
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: "none",
          scrollTrigger: { trigger: ".js-acende", start: "top 78%", end: "bottom 42%", scrub: true },
        }
      ),
  });

  // ================= CAMINHO =================
  const etapas = $$(".etapa");
  const nos = $$(".caminho-nos li");
  const linha = $(".caminho-linha span");

  mm.add("(min-width: 900px)", () => {
    const trilho = $(".caminho-trilho");
    const distancia = () => trilho.scrollWidth - window.innerWidth;
    const horizontal = gsap.to(trilho, {
      x: () => -distancia(),
      ease: "none",
      scrollTrigger: {
        trigger: ".caminho-pin",
        start: "top top",
        end: () => "+=" + distancia(),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          linha.style.transform = `scaleX(${self.progress})`;
          const ativo = Math.round(self.progress * (nos.length - 1));
          nos.forEach((n, i) => n.classList.toggle("ativo", i <= ativo));
        },
      },
    });
    etapas.forEach((etapa, i) =>
      animarDocumento(
        etapa,
        // a 1ª etapa já está na tela quando a seção trava: dispara pela entrada da seção
        i === 0
          ? { trigger: ".caminho", start: "top 45%" }
          : { containerAnimation: horizontal, start: "left 75%" }
      )
    );
  });

  mm.add("(max-width: 899px)", () => {
    etapas.forEach((etapa) => animarDocumento(etapa, { start: "top 70%" }));
  });

  // ================= OFERTA =================
  gsap.to(".risco", {
    scaleX: 1,
    stagger: 0.25,
    ease: "none",
    scrollTrigger: { trigger: ".comp-interna", start: "top 70%", end: "bottom 55%", scrub: true },
  });
  gsap.to(".comp-interna li", {
    opacity: 0.45,
    stagger: 0.25,
    ease: "none",
    scrollTrigger: { trigger: ".comp-interna", start: "top 70%", end: "bottom 55%", scrub: true },
  });
  gsap.from(".comp-hg li", {
    opacity: 0,
    x: 30,
    stagger: 0.1,
    duration: 0.9,
    ease: "expo.out",
    scrollTrigger: { trigger: ".comp-hg", start: "top 70%" },
  });

  // ================= FAIXA "Fidelize-se" =================
  const faixa = gsap.to(".faixa-trilho", { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
  lenis.on("scroll", (l) => {
    const v = gsap.utils.clamp(-6, 6, l.velocity * 0.12);
    gsap.to(faixa, { timeScale: 1 + Math.abs(v), duration: 0.2, overwrite: true });
    gsap.to(faixa, { timeScale: 1, duration: 1.2, delay: 0.2 });
  });
  gsap.fromTo(".faixa", { rotate: -2.5 }, {
    rotate: 2.5,
    ease: "none",
    scrollTrigger: { trigger: ".faixa", start: "top bottom", end: "bottom top", scrub: true },
  });

  // ================= FAQ =================
  $$(".faq-item").forEach((item) => {
    const b = $(".faq-q", item);
    b.addEventListener("click", () => {
      const abrir = !item.classList.contains("aberto");
      item.classList.toggle("aberto", abrir);
      b.setAttribute("aria-expanded", abrir);
      setTimeout(() => ScrollTrigger.refresh(), 520);
    });
  });

  // ================= MONTADOR =================
  iniciarMontador();

  mm.add("(pointer: fine)", () => {
    const cel = $(".celular");
    const rx = gsap.quickTo(cel, "rotationX", { duration: 0.8, ease: "power3" });
    const ry = gsap.quickTo(cel, "rotationY", { duration: 0.8, ease: "power3" });
    const mover = (e) => {
      ry((e.clientX / window.innerWidth - 0.5) * 16);
      rx(-(e.clientY / window.innerHeight - 0.5) * 12);
    };
    window.addEventListener("pointermove", mover);
    return () => window.removeEventListener("pointermove", mover);
  });

  // ================= RODAPÉ =================
  gsap.from(".rodape-marca", {
    yPercent: 40,
    opacity: 0,
    ease: "none",
    scrollTrigger: { trigger: ".rodape", start: "top bottom", end: "top 30%", scrub: true },
  });

  // ================= reveals genéricos =================
  $$("[data-revela]").forEach((el) =>
    gsap.from(el, {
      opacity: 0,
      y: 50,
      duration: 1.2,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    })
  );

  // ================= tema do header (criado por último: depende dos pins acima) =================
  $$("[data-tema]").forEach((sec) => {
    if (sec === topo) return;
    ScrollTrigger.create({
      trigger: sec,
      start: "top 40px",
      end: "bottom 40px",
      onToggle: (self) => self.isActive && (topo.dataset.tema = sec.dataset.tema),
    });
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
}

// ---------- animação de cada documento do caminho ----------
function animarDocumento(etapa, st) {
  const doc = $(".doc", etapa);
  const tipo = etapa.dataset.doc;
  const tl = gsap.timeline({
    scrollTrigger: { trigger: doc, toggleActions: "play none none reverse", ...st },
  });
  tl.from(doc, { y: 60, opacity: 0, rotate: 0, duration: 0.9, ease: "expo.out" })
    .from($(".etapa-texto", etapa).children, { y: 30, opacity: 0, stagger: 0.08, duration: 0.8, ease: "expo.out" }, 0);

  if (tipo === "edital") {
    tl.to($$(".marca-texto b", doc), { scaleX: 1, stagger: 0.25, duration: 0.6, ease: "power2.inOut" }, 0.5)
      .from($$(".doc-checklist li", doc), { opacity: 0, x: -16, stagger: 0.12, duration: 0.5, ease: "back.out(2)" }, 0.8);
  }
  if (tipo === "proposta") {
    const el = $(".js-valor", doc);
    const v = { n: 0 };
    tl.to(v, {
      n: 48680,
      duration: 1.4,
      ease: "power3.out",
      onUpdate: () => (el.textContent = v.n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })),
    }, 0.4).from($(".doc-status", doc), { scale: 0.6, opacity: 0, duration: 0.6, ease: "back.out(2.5)" }, 1.4);
  }
  if (tipo === "sessao") {
    const lances = $$(".lance", doc);
    tl.from(lances.reverse(), { opacity: 0, y: 24, stagger: 0.14, duration: 0.5, ease: "power3.out" }, 0.4)
      .from($(".lance.sua", doc), { scale: 0.92, duration: 0.6, ease: "back.out(3)" }, ">-0.1");
    const relogio = $(".js-relogio", doc);
    let s = 14 * 3600 + 2 * 60 + 11;
    setInterval(() => {
      s++;
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      relogio.textContent = `${h}:${m}:${String(s % 60).padStart(2, "0")}`;
    }, 1000);
  }
  if (tipo === "contrato") {
    const path = $(".js-assinatura", doc);
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    tl.to(path, { strokeDashoffset: 0, duration: 1.6, ease: "power1.inOut" }, 0.5)
      .from($(".selo-assinado", doc), { scale: 0, rotate: -20, duration: 0.6, ease: "back.out(3)" }, ">-0.2");
  }
  if (tipo === "empenho") {
    tl.from($(".carimbo", doc), { scale: 2.6, opacity: 0, rotate: -30, duration: 0.45, ease: "power4.in" }, 0.7)
      .to(doc, { x: 6, duration: 0.05, repeat: 5, yoyo: true, ease: "none" }, ">");
  }
  return tl;
}
