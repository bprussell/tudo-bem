import type { Phrase } from "./types";

export const numbersPhrases: Phrase[] = [
  // Numbers reference
  {
    pt: "Um, dois, três, quatro, cinco, seis, sete, oito, nove, dez.",
    en: "1 to 10.",
    note: "Cardinal numbers. 'Um/uma' agrees with the noun's gender: 'um café' / 'uma cerveja'.",
  },
  {
    pt: "Onze, doze, treze, catorze, quinze, dezasseis, dezassete, dezoito, dezanove, vinte.",
    en: "11 to 20.",
    note: "pt-PT spells 16/17/19 as 'dezasseis / dezassete / dezanove'. pt-BR uses 'dezesseis / dezessete / dezenove'. Hearing the difference is a quick pt-PT vs pt-BR tell.",
  },
  {
    pt: "Vinte e um, vinte e dois… trinta, quarenta, cinquenta, sessenta, setenta, oitenta, noventa, cem.",
    en: "21, 22… 30, 40, 50, 60, 70, 80, 90, 100.",
    note: "Above 20 the pattern is 'tens-and-units' connected with 'e'.",
  },
  {
    pt: "Cento e vinte, duzentos, trezentos, quatrocentos, quinhentos, mil.",
    en: "120, 200, 300, 400, 500, 1000.",
    note: "100 alone is 'cem'; 100-with-something is 'cento e…'. Hundreds agree with gender for the noun: 'duzentas pessoas' (people, fem.), 'duzentos euros' (masc).",
  },

  // Prices
  {
    pt: "Quanto custa, se faz favor?",
    en: "How much, please?",
  },
  {
    pt: "São quinze euros e cinquenta cêntimos.",
    en: "It's fifteen euros and fifty cents.",
    note: "'Cêntimo' (pt-PT) vs 'centavo' (pt-BR). In speech often shortened: 'quinze e cinquenta'.",
  },
  {
    pt: "Três vírgula cinco euros, ou três e cinquenta.",
    en: "3.5 euros, or three fifty.",
    note: "Decimal separator in Europe is the comma — 'vírgula', not 'ponto'. Said both ways in conversation.",
  },
  {
    pt: "Pago em dinheiro ou com cartão?",
    en: "Cash or card?",
    note: "Cards almost universally accepted; small cafés sometimes cash-only under €5. Multibanco network is dense.",
  },

  // Time
  {
    pt: "Que horas são?",
    en: "What time is it?",
    note: "Reply: 'É uma hora' (singular for 1 o'clock), 'São duas horas' (plural otherwise).",
  },
  {
    pt: "São oito e meia da manhã.",
    en: "It's 8:30 AM.",
    note: "'E meia' = half past. 'E um quarto' = quarter past. 'Menos um quarto' = quarter to. 'Ao meio-dia' = at noon. 'À meia-noite' = at midnight.",
  },
  {
    pt: "A nossa reserva é às oito da noite.",
    en: "Our reservation is at 8 PM.",
    note: "Use 'da manhã' / 'da tarde' / 'da noite' to disambiguate. After ~7pm Portuguese say 'boa noite', not 'boa tarde'.",
  },
  {
    pt: "A que horas abre? A que horas fecha?",
    en: "What time does it open? Close?",
  },

  // Dates and days
  {
    pt: "Hoje é segunda-feira, dia quinze de junho.",
    en: "Today is Monday the 15th of June.",
    note: "Days of the week in pt-PT: domingo, segunda-feira, terça-feira, quarta-feira, quinta-feira, sexta-feira, sábado. Lowercase. Often shortened in speech to just 'segunda', 'terça', etc. Months also lowercase in pt-PT (pt-BR varies).",
  },
  {
    pt: "Amanhã, depois de amanhã, ontem, anteontem.",
    en: "Tomorrow, day after tomorrow, yesterday, day before yesterday.",
  },
  {
    pt: "Estamos cá nove dias.",
    en: "We're here for 9 days.",
    note: "'Cá' (pt-PT) is 'here' with a flavour of 'in this country/place' — common in Portugal, sometimes used like 'with us'.",
  },
  {
    pt: "Chegámos no sábado e voltamos no domingo da semana seguinte.",
    en: "We arrived Saturday and we leave Sunday of next week.",
    note: "'No' contraction = 'em + o' for masc. days; 'na' for fem. ('na quinta-feira' — feira is feminine).",
  },

  // Anniversary-relevant ordinals
  {
    pt: "Primeiro, segundo, terceiro, quarto, quinto, sexto, sétimo, oitavo, nono, décimo.",
    en: "1st through 10th.",
  },
  {
    pt: "Décimo primeiro, décimo segundo… vigésimo, trigésimo.",
    en: "11th, 12th… 20th, 30th.",
    note: "Your anniversary is 'o vigésimo aniversário'. Past 30, ordinals are rare in speech and most people switch to '101.º' kind of constructions — beyond beginner-relevant.",
  },

  // Phone numbers
  {
    pt: "O meu telemóvel é nove um dois, três quatro cinco, seis sete oito.",
    en: "My phone is 912 345 678.",
    note: "Pt phone numbers are 9 digits. Convention is to read them in 3+3+3 groups. 'Nove um dois' is just digit-by-digit; some pair them ('noventa e um, dois…') but that's less common.",
  },

  // Escape hatch
  {
    pt: "Pode escrever, se faz favor? Os números são difíceis.",
    en: "Could you write it down, please? Numbers are hard.",
    note: "Honest. Most Portuguese will happily write a price down on receipt paper.",
  },
  {
    pt: "Mais devagar, por favor — desculpe.",
    en: "More slowly, please — sorry.",
  },
];
