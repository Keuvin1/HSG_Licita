// Dados do cliente. [CONFIRMAR] = ainda é exemplo.
export const config = {
  nome: "HG Assessoria",
  whatsapp: "5547900000000", // [CONFIRMAR] número real, só dígitos com 55 + DDD
  instagram: "", // [CONFIRMAR] ex.: https://www.instagram.com/hgassessoria/
  email: "", // [CONFIRMAR]
  mensagemPadrao: "Olá! Vi a página da HG Assessoria e gostaria de saber se minha empresa pode participar de licitações.",
};

export const linkWhats = (texto) =>
  `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(texto)}`;
