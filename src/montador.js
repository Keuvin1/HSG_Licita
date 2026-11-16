import { linkWhats } from "./config.js";

const FRASES = {
  exp: {
    nunca: "Minha empresa nunca participou de uma licitação.",
    tentei: "Minha empresa já tentou participar, mas não foi adiante.",
    participo: "Minha empresa já participa de licitações.",
  },
  onde: {
    municipio: "Queria competir em órgãos do município.",
    estado: "Queria competir em órgãos do estado.",
    uniao: "Queria competir em órgãos da União.",
    naosei: "Queria competir onde fizer mais sentido.",
  },
};

export function iniciarMontador() {
  const estado = { exp: null, forn: null, onde: null };
  const msg = document.querySelector(".js-msg");
  const dig = document.querySelector(".digitando");
  const botao = document.querySelector(".js-whats-montador");
  const hora = document.querySelector(".js-hora");
  let timer;

  const agora = new Date();
  hora.textContent = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

  function montarTexto() {
    const partes = ["Olá! Vi a página da HG Assessoria."];
    if (estado.exp) partes.push(FRASES.exp[estado.exp]);
    if (estado.forn) partes.push(`A gente fornece ${estado.forn}.`);
    if (estado.onde) partes.push(FRASES.onde[estado.onde]);
    if (!estado.exp && !estado.forn && !estado.onde)
      return "Olá! Vi a página da HG Assessoria e gostaria de saber se minha empresa pode participar de licitações.";
    partes.push("Consigo participar?");
    return partes.join(" ");
  }

  function escrever(texto) {
    clearTimeout(timer);
    botao.href = linkWhats(texto);
    msg.parentElement.style.opacity = "0.35";
    dig.classList.add("on");
    timer = setTimeout(() => {
      dig.classList.remove("on");
      msg.textContent = texto;
      msg.parentElement.style.opacity = "1";
    }, 420);
  }

  document.querySelectorAll(".grupo").forEach((grupo) => {
    const campo = grupo.dataset.campo;
    grupo.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        const mesmo = estado[campo] === b.dataset.v;
        estado[campo] = mesmo ? null : b.dataset.v;
        grupo.querySelectorAll("button").forEach((x) => x.classList.toggle("ativo", x === b && !mesmo));
        escrever(montarTexto());
      })
    );
  });

  msg.textContent = montarTexto();
  botao.href = linkWhats(montarTexto());
}
