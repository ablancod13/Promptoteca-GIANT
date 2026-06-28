import { detectVariables } from "@/lib/prompt-utils";
import type { Prompt, PromptAuthor, PromptVariable, VariableFieldType } from "@/lib/types";

const AUTHORS: PromptAuthor[] = [
  {
    id: "author-ana",
    displayName: "Dra. Ana Rivera",
    role: "Enfermedades infecciosas",
    country: "Espana",
    institution: "GIANT-SEIMC",
    level: 5
  },
  {
    id: "author-mateo",
    displayName: "Dr. Mateo Soler",
    role: "Microbiologia clinica",
    country: "Espana",
    institution: "GIANT-SEIMC",
    level: 4
  },
  {
    id: "author-lucia",
    displayName: "Lucia Martin",
    role: "Investigacion biomedica",
    country: "Espana",
    institution: "GIANT-SEIMC",
    level: 3
  }
];

interface PromptSeed extends Omit<Prompt, "variables" | "license"> {
  variableOverrides?: Record<
    string,
    Partial<Pick<PromptVariable, "type" | "options" | "required" | "helpText" | "defaultValue">>
  >;
}

function prompt(seed: PromptSeed): Prompt {
  const { variableOverrides, ...base } = seed;
  const variables = detectVariables(seed.id, seed.content).map((variable) => ({
    ...variable,
    ...variableOverrides?.[variable.name]
  }));

  return {
    ...base,
    variables,
    license: "CC BY 4.0"
  };
}

function select(options: string[], helpText?: string): { type: VariableFieldType; options: string[]; helpText: string } {
  return { type: "select", options, helpText: helpText ?? "Selecciona una opcion." };
}

export const seedPrompts: Prompt[] = [
  prompt({
    id: "prompt-001",
    slug: "lectura-critica-articulo-clinico",
    title: "Lectura critica de articulo clinico",
    summary: "Estructura una lectura critica de un articulo de infecciosas o microbiologia con foco en validez, resultados y aplicabilidad.",
    content:
      "Actua como [rol profesional] y realiza una lectura critica de un articulo sobre [tema]. Evalua: 1) pregunta de investigacion, 2) diseno, 3) poblacion, 4) intervencion o exposicion, 5) comparador, 6) desenlaces, 7) sesgos principales, 8) magnitud del efecto, 9) validez externa y 10) aplicabilidad a [contexto asistencial]. Devuelve una tabla breve y una conclusion final para [publico objetivo]. No inventes datos que no aparezcan en el texto proporcionado.",
    objective: "Ayudar a preparar journal club y sesiones de lectura critica.",
    context: "El usuario debe pegar el resumen o el texto del articulo sin datos personales.",
    author: AUTHORS[0],
    category: "Lectura critica",
    secondaryCategories: ["Investigacion", "Docencia"],
    tools: ["ChatGPT", "Claude", "Elicit"],
    recommendedModel: "ChatGPT 5.5",
    intelligenceLevel: "Alto",
    language: "Español",
    bestLanguage: "Español",
    difficulty: "intermedio",
    tags: ["journal club", "evidencia", "sesion clinica"],
    reviewStatus: "approved",
    experimental: false,
    validatedByGiant: true,
    giantQualityScore: 5,
    likes: 46,
    favorites: 32,
    copies: 121,
    templateUses: 88,
    timeSavedMinutes: 35,
    publishedAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-06-10T08:00:00.000Z",
    version: 2,
    limitations: "Necesita que el usuario aporte informacion del articulo; no sustituye lectura metodologica experta.",
    misuseRisks: "Puede producir conclusiones demasiado seguras si el usuario pega solo fragmentos.",
    references: ["CASP", "CONSORT", "STROBE"],
    variableOverrides: {
      "rol profesional": select(["infectologo/a", "microbiologo/a", "residente", "investigador/a"]),
      "contexto asistencial": select(["hospital terciario", "hospital comarcal", "atencion primaria", "laboratorio clinico"]),
      "publico objetivo": select(["residentes", "adjuntos", "comite PROA", "equipo de laboratorio"])
    }
  }),
  prompt({
    id: "prompt-002",
    slug: "pico-pregunta-investigacion",
    title: "Convertir una idea en pregunta PICO",
    summary: "Transforma una idea clinica o microbiologica en pregunta PICO, objetivos e hipotesis operativa.",
    content:
      "Convierte la idea [idea inicial] en una pregunta de investigacion PICO. Define poblacion, intervencion o exposicion, comparador, desenlace principal y desenlaces secundarios. Propone un objetivo principal, tres objetivos secundarios, una hipotesis y un diseno de estudio razonable para [entorno]. Senala supuestos y datos que faltan antes de iniciar el protocolo.",
    objective: "Acelerar la fase inicial de diseno de estudios.",
    context: "Pensado para residentes, investigadores y grupos multicentricos.",
    author: AUTHORS[2],
    category: "Investigacion",
    secondaryCategories: ["Protocolos y guias clinicas", "Redaccion cientifica"],
    tools: ["ChatGPT", "Claude", "Consensus"],
    recommendedModel: "ChatGPT 5.5",
    intelligenceLevel: "Alto",
    language: "Español",
    bestLanguage: "Español",
    difficulty: "principiante",
    tags: ["PICO", "protocolo", "hipotesis"],
    reviewStatus: "approved",
    experimental: false,
    validatedByGiant: true,
    giantQualityScore: 4,
    likes: 39,
    favorites: 28,
    copies: 97,
    templateUses: 64,
    timeSavedMinutes: 45,
    publishedAt: "2026-06-03T08:00:00.000Z",
    updatedAt: "2026-06-11T08:00:00.000Z",
    version: 1,
    limitations: "No sustituye asesoramiento metodologico ni calculo muestral.",
    misuseRisks: "Puede sobredimensionar objetivos si no se acota bien la idea inicial.",
    references: ["SPIRIT", "EQUATOR Network"],
    variableOverrides: {
      "idea inicial": { type: "textarea", options: [], helpText: "Describe la pregunta o intuicion en lenguaje natural." },
      entorno: select(["hospital", "laboratorio", "red multicentrica", "consulta externa"])
    }
  }),
  prompt({
    id: "prompt-003",
    slug: "resumen-articulo-redaccion-cientifica",
    title: "Resumen estructurado para redaccion cientifica",
    summary: "Genera un resumen estructurado con tono cientifico a partir de resultados aportados por el usuario.",
    content:
      "Redacta un resumen estructurado en [idioma] para un manuscrito sobre [tema]. Usa las secciones: Introduccion, Metodos, Resultados y Conclusiones. Mantente fiel a estos datos: [datos principales]. No anadas cifras no proporcionadas. Ajusta el texto a [limite de palabras] palabras y deja una lista de inconsistencias o datos ausentes.",
    objective: "Preparar borradores iniciales de abstracts y comunicaciones.",
    context: "El usuario debe aportar datos anonimizados y cifras ya revisadas.",
    author: AUTHORS[2],
    category: "Redaccion cientifica",
    secondaryCategories: ["Investigacion", "Comunicacion cientifica"],
    tools: ["ChatGPT", "Claude", "Microsoft Copilot"],
    recommendedModel: "Claude Sonnet",
    intelligenceLevel: "Muy alto",
    language: "Español",
    bestLanguage: "Ingles",
    difficulty: "intermedio",
    tags: ["abstract", "manuscrito", "congreso"],
    reviewStatus: "pending",
    experimental: false,
    validatedByGiant: false,
    likes: 24,
    favorites: 19,
    copies: 81,
    templateUses: 57,
    timeSavedMinutes: 30,
    publishedAt: "2026-06-05T08:00:00.000Z",
    updatedAt: "2026-06-05T08:00:00.000Z",
    version: 1,
    limitations: "Necesita revision humana de estilo, estadistica y coherencia.",
    misuseRisks: "Riesgo de crear resultados no presentes si se dan instrucciones ambiguas.",
    references: ["ICMJE", "EQUATOR Network"],
    variableOverrides: {
      idioma: select(["Español", "ingles", "portugues", "frances"]),
      "datos principales": { type: "textarea", options: [], helpText: "Pega solo datos anonimizados y verificados." },
      "limite de palabras": { type: "number", options: [], defaultValue: "250" }
    }
  }),
  prompt({
    id: "prompt-004",
    slug: "comentario-antibiograma",
    title: "Borrador de comentario de antibiograma",
    summary: "Ayuda a redactar un comentario prudente de antibiograma sin sustituir criterio microbiologico.",
    content:
      "Actua como apoyo de redaccion para microbiologia clinica. Con estos datos anonimizados: [resultado microbiologico], redacta un comentario orientativo para [destinatario]. Incluye interpretacion prudente, limitaciones, necesidad de correlacion clinica y advertencias sobre no usar el texto como recomendacion automatica de tratamiento. Si faltan datos clave, listalos antes de proponer el comentario.",
    objective: "Acelerar comentarios de laboratorio manteniendo prudencia profesional.",
    context: "No debe usarse con datos identificables ni para prescripcion automatizada.",
    author: AUTHORS[1],
    category: "Microbiologia clinica",
    secondaryCategories: ["Productividad en laboratorio", "Enfermedades infecciosas"],
    tools: ["ChatGPT", "Claude", "Herramienta local"],
    recommendedModel: "ChatGPT 5.5",
    intelligenceLevel: "Extremadamente alto",
    language: "Español",
    bestLanguage: "Español",
    difficulty: "avanzado",
    tags: ["antibiograma", "laboratorio", "interpretacion"],
    reviewStatus: "pending",
    experimental: true,
    validatedByGiant: false,
    likes: 31,
    favorites: 25,
    copies: 73,
    templateUses: 49,
    timeSavedMinutes: 20,
    publishedAt: "2026-06-06T08:00:00.000Z",
    updatedAt: "2026-06-08T08:00:00.000Z",
    version: 1,
    limitations: "Prompt con impacto sanitario potencial; requiere revision local y criterio profesional.",
    misuseRisks: "No debe generar decisiones terapeuticas individualizadas.",
    references: ["EUCAST", "CLSI"],
    variableOverrides: {
      "resultado microbiologico": { type: "textarea", options: [], helpText: "Usa datos anonimizados y no identificables." },
      destinatario: select(["clinico solicitante", "equipo PROA", "informe interno", "sesion de laboratorio"])
    }
  }),
  prompt({
    id: "prompt-005",
    slug: "proa-revision-tratamiento",
    title: "Checklist PROA para revision de tratamiento",
    summary: "Organiza una revision PROA estructurada sin emitir una orden clinica automatica.",
    content:
      "Prepara un checklist PROA general para revisar [escenario clinico] en [tipo de centro]. Incluye indicacion, foco, muestras, microbiologia disponible, espectro, dosis, duracion, desescalada, via oral, alergias, interacciones y criterios para consultar a infecciosas. Formula preguntas, no decisiones automaticas. No uses datos identificables de pacientes.",
    objective: "Ayudar a estructurar discusiones PROA y auditorias internas.",
    context: "Orientado a revision profesional, no a decisiones automatizadas.",
    author: AUTHORS[0],
    category: "PROA",
    secondaryCategories: ["Enfermedades infecciosas", "Productividad clinica"],
    tools: ["ChatGPT", "Microsoft Copilot", "Claude"],
    recommendedModel: "ChatGPT 5.5",
    intelligenceLevel: "Alto",
    language: "Español",
    bestLanguage: "Español",
    difficulty: "intermedio",
    tags: ["PROA", "antimicrobianos", "desescalada"],
    reviewStatus: "approved",
    experimental: false,
    validatedByGiant: true,
    giantQualityScore: 5,
    likes: 58,
    favorites: 41,
    copies: 133,
    templateUses: 75,
    timeSavedMinutes: 25,
    publishedAt: "2026-06-07T08:00:00.000Z",
    updatedAt: "2026-06-12T08:00:00.000Z",
    version: 2,
    limitations: "Debe adaptarse a protocolos locales.",
    misuseRisks: "No sustituye recomendaciones clinicas individualizadas.",
    references: ["Programas PROA SEIMC"],
    variableOverrides: {
      "escenario clinico": { type: "textarea", options: [], helpText: "Describe el escenario de forma general y anonima." },
      "tipo de centro": select(["hospital terciario", "hospital comarcal", "atencion primaria", "centro sociosanitario"])
    }
  }),
  prompt({
    id: "prompt-006",
    slug: "sesion-clinica-residentes",
    title: "Guion de sesion clinica para residentes",
    summary: "Crea un guion docente con objetivos, dinamica, preguntas y cierre practico.",
    content:
      "Disena una sesion docente de [duracion] minutos sobre [tema] para [nivel de audiencia]. Incluye objetivos de aprendizaje, estructura temporal, preguntas interactivas, caso ficticio sin datos reales, mensajes clave y una diapositiva final de take-home messages.",
    objective: "Preparar sesiones de forma rapida y pedagogica.",
    context: "Especialmente util para residentes y tutores.",
    author: AUTHORS[0],
    category: "Docencia",
    secondaryCategories: ["Preparacion de sesiones clinicas", "Presentaciones"],
    tools: ["ChatGPT", "Claude", "Gemini"],
    language: "Español",
    bestLanguage: "Español",
    difficulty: "principiante",
    tags: ["docencia", "residentes", "sesion"],
    reviewStatus: "approved",
    experimental: false,
    validatedByGiant: false,
    giantQualityScore: 4,
    likes: 34,
    favorites: 22,
    copies: 69,
    templateUses: 52,
    timeSavedMinutes: 40,
    publishedAt: "2026-06-09T08:00:00.000Z",
    updatedAt: "2026-06-09T08:00:00.000Z",
    version: 1,
    limitations: "Requiere ajustar bibliografia y protocolos locales.",
    misuseRisks: "Puede simplificar en exceso temas complejos.",
    references: ["Taxonomia de Bloom"],
    variableOverrides: {
      duracion: select(["20", "30", "45", "60"], "Duracion en minutos."),
      "nivel de audiencia": select(["R1", "R2-R3", "R4-R5", "adjuntos", "mixto"])
    }
  }),
  prompt({
    id: "prompt-007",
    slug: "correo-profesional-colaboracion",
    title: "Correo profesional para colaboracion cientifica",
    summary: "Redacta correos claros para propuestas multicentricas, revision de documentos o invitaciones docentes.",
    content:
      "Redacta un correo profesional en [tono] para [destinatario] con el objetivo de [objetivo]. Incluye asunto, saludo, contexto breve, peticion concreta, plazo razonable y cierre cordial. Mantente conciso y evita presion indebida.",
    objective: "Mejorar productividad en comunicacion profesional.",
    context: "Uso general para gestion de proyectos y colaboraciones.",
    author: AUTHORS[2],
    category: "Gestion de correo electronico",
    secondaryCategories: ["Productividad clinica", "Comunicacion cientifica"],
    tools: ["ChatGPT", "Microsoft Copilot", "Gemini"],
    language: "Español",
    bestLanguage: "Español",
    difficulty: "principiante",
    tags: ["correo", "colaboracion", "productividad"],
    reviewStatus: "approved",
    experimental: false,
    validatedByGiant: false,
    likes: 27,
    favorites: 17,
    copies: 104,
    templateUses: 43,
    timeSavedMinutes: 12,
    publishedAt: "2026-06-10T08:00:00.000Z",
    updatedAt: "2026-06-10T08:00:00.000Z",
    version: 1,
    limitations: "Debe revisarse el tono segun relacion profesional.",
    misuseRisks: "Puede sonar generico si no se aporta contexto concreto.",
    references: [],
    variableOverrides: {
      tono: select(["formal", "cercano", "muy breve", "diplomatico"]),
      destinatario: { type: "text", options: [], helpText: "Ejemplo: coordinador del estudio, servicio colaborador." },
      objetivo: { type: "textarea", options: [], helpText: "Describe la peticion concreta." }
    }
  }),
  prompt({
    id: "prompt-008",
    slug: "pipeline-analisis-datos",
    title: "Plan de analisis de datos clinico-microbiologicos",
    summary: "Convierte una tabla de variables en un plan de limpieza, descriptivo y analisis reproducible.",
    content:
      "A partir de esta descripcion de datos: [descripcion de dataset], propone un plan de analisis reproducible para [pregunta]. Incluye limpieza, variables derivadas, analisis descriptivo, comparaciones, modelo principal, sensibilidad, visualizaciones y tabla 1. Indica supuestos y errores frecuentes. No generes conclusiones sin resultados.",
    objective: "Planificar analisis antes de abrir R, Python o Stata.",
    context: "Para equipos clinicos con datos anonimizados.",
    author: AUTHORS[2],
    category: "Analisis de datos",
    secondaryCategories: ["Investigacion", "Herramientas digitales"],
    tools: ["ChatGPT", "Claude", "Herramienta local"],
    language: "Español",
    bestLanguage: "Español",
    difficulty: "avanzado",
    tags: ["estadistica", "dataset", "reproducibilidad"],
    reviewStatus: "pending",
    experimental: false,
    validatedByGiant: false,
    likes: 21,
    favorites: 18,
    copies: 45,
    templateUses: 29,
    timeSavedMinutes: 55,
    publishedAt: "2026-06-11T08:00:00.000Z",
    updatedAt: "2026-06-11T08:00:00.000Z",
    version: 1,
    limitations: "No reemplaza apoyo estadistico profesional.",
    misuseRisks: "Puede proponer modelos inadecuados si la descripcion del dataset es insuficiente.",
    references: ["STROBE", "TRIPOD"],
    variableOverrides: {
      "descripcion de dataset": { type: "textarea", options: [], helpText: "Incluye variables y tamano, sin datos personales." },
      pregunta: { type: "textarea", options: [], helpText: "Pregunta analitica principal." }
    }
  }),
  prompt({
    id: "prompt-009",
    slug: "revision-bibliografica-rapida",
    title: "Mapa inicial de revision bibliografica",
    summary: "Estructura terminos de busqueda, criterios y matriz de extraccion para una revision narrativa o scoping.",
    content:
      "Ayudame a preparar una revision bibliografica sobre [tema]. Propone terminos MeSH/libres, sinonimos, criterios de inclusion y exclusion, bases de datos, estrategia preliminar, matriz de extraccion y riesgos de sesgo. Separa claramente lo que es busqueda de lo que es interpretacion.",
    objective: "Arrancar revisiones con una estructura clara.",
    context: "No realiza la busqueda por si mismo; organiza el trabajo.",
    author: AUTHORS[2],
    category: "Revision bibliografica",
    secondaryCategories: ["Investigacion", "Lectura critica"],
    tools: ["Perplexity", "Elicit", "Consensus", "ChatGPT"],
    language: "Español",
    bestLanguage: "Ingles",
    difficulty: "intermedio",
    tags: ["revision", "MeSH", "scoping"],
    reviewStatus: "approved",
    experimental: false,
    validatedByGiant: false,
    likes: 29,
    favorites: 24,
    copies: 66,
    templateUses: 31,
    timeSavedMinutes: 50,
    publishedAt: "2026-06-12T08:00:00.000Z",
    updatedAt: "2026-06-12T08:00:00.000Z",
    version: 1,
    limitations: "Debe validarse con bibliotecario/a o experto/a en documentacion.",
    misuseRisks: "Una mala estrategia inicial puede sesgar la revision.",
    references: ["PRISMA", "JBI Scoping Review guidance"]
  }),
  prompt({
    id: "prompt-010",
    slug: "diapositivas-caso-docente",
    title: "Esquema de diapositivas para caso docente",
    summary: "Convierte un caso ficticio o anonimizado en una secuencia docente con preguntas.",
    content:
      "Crea un esquema de [numero de diapositivas] diapositivas para una sesion sobre [tema]. Usa un caso ficticio o completamente anonimizado. Incluye titulo, objetivo de cada diapositiva, contenido visual sugerido, pregunta al publico y mensaje clave. Evita datos identificables.",
    objective: "Preparar presentaciones docentes con narrativa clara.",
    context: "Ideal para sesiones clinicas, laboratorio y docencia de residentes.",
    author: AUTHORS[0],
    category: "Presentaciones",
    secondaryCategories: ["Docencia", "Preparacion de sesiones clinicas"],
    tools: ["ChatGPT", "Gemini", "Microsoft Copilot"],
    language: "Español",
    bestLanguage: "Español",
    difficulty: "principiante",
    tags: ["diapositivas", "caso docente", "presentacion"],
    reviewStatus: "approved",
    experimental: false,
    validatedByGiant: false,
    likes: 22,
    favorites: 16,
    copies: 51,
    templateUses: 39,
    timeSavedMinutes: 30,
    publishedAt: "2026-06-13T08:00:00.000Z",
    updatedAt: "2026-06-13T08:00:00.000Z",
    version: 1,
    limitations: "No genera diseno grafico final; sirve como guion.",
    misuseRisks: "Puede sobrecargar diapositivas si se pide demasiado contenido.",
    references: [],
    variableOverrides: {
      "numero de diapositivas": { type: "number", options: [], defaultValue: "12" }
    }
  }),
  prompt({
    id: "prompt-011",
    slug: "bioinformatica-informe-variantes",
    title: "Explicar informe bioinformatico para equipo clinico",
    summary: "Traduce resultados bioinformaticos complejos a un resumen entendible para equipos clinicos.",
    content:
      "Explica este resultado bioinformatico anonimo: [resultado] para un equipo de [audiencia]. Distingue hallazgos robustos, incertidumbres, limitaciones tecnicas, posibles siguientes pasos y preguntas para el laboratorio. No conviertas el resultado en decision clinica individual.",
    objective: "Facilitar comunicacion entre bioinformatica, microbiologia e infecciosas.",
    context: "Pensado para informes de vigilancia, brotes o resistencia.",
    author: AUTHORS[1],
    category: "Bioinformatica",
    secondaryCategories: ["Microbiologia clinica", "Herramientas digitales"],
    tools: ["ChatGPT", "Claude", "Herramienta local"],
    language: "Español",
    bestLanguage: "Español",
    difficulty: "avanzado",
    tags: ["bioinformatica", "resistencia", "vigilancia"],
    reviewStatus: "pending",
    experimental: true,
    validatedByGiant: false,
    likes: 18,
    favorites: 14,
    copies: 38,
    templateUses: 25,
    timeSavedMinutes: 25,
    publishedAt: "2026-06-14T08:00:00.000Z",
    updatedAt: "2026-06-14T08:00:00.000Z",
    version: 1,
    limitations: "Necesita revision por bioinformatica o microbiologia experta.",
    misuseRisks: "Puede simplificar hallazgos tecnicos con implicaciones importantes.",
    references: [],
    variableOverrides: {
      resultado: { type: "textarea", options: [], helpText: "Pega solo datos no identificables." },
      audiencia: select(["infecciosas", "microbiologia", "comite de brotes", "direccion medica"])
    }
  }),
  prompt({
    id: "prompt-012",
    slug: "hilo-redes-sociales-cientifico",
    title: "Hilo para redes sociales cientificas",
    summary: "Convierte un hallazgo o publicacion en un hilo profesional, prudente y con llamada a lectura critica.",
    content:
      "Crea un hilo de [numero de publicaciones] publicaciones para redes profesionales sobre [tema]. Mantén tono cientifico, claro y prudente. Incluye gancho inicial, puntos clave, limitaciones, llamada a leer la fuente original y cierre con pregunta. No exageres impacto ni uses titulares sensacionalistas.",
    objective: "Comunicar ciencia sin perder rigor.",
    context: "Para perfiles profesionales y sociedades cientificas.",
    author: AUTHORS[2],
    category: "Redes sociales profesionales",
    secondaryCategories: ["Comunicacion cientifica", "Redaccion cientifica"],
    tools: ["ChatGPT", "Claude", "Gemini"],
    language: "Español",
    bestLanguage: "Español",
    difficulty: "principiante",
    tags: ["redes", "divulgacion", "comunicacion"],
    reviewStatus: "approved",
    experimental: false,
    validatedByGiant: false,
    likes: 26,
    favorites: 18,
    copies: 59,
    templateUses: 33,
    timeSavedMinutes: 18,
    publishedAt: "2026-06-15T08:00:00.000Z",
    updatedAt: "2026-06-15T08:00:00.000Z",
    version: 1,
    limitations: "Debe revisarse con politica de comunicacion institucional.",
    misuseRisks: "Puede trivializar limitaciones si se fuerza demasiado el gancho.",
    references: [],
    variableOverrides: {
      "numero de publicaciones": { type: "number", options: [], defaultValue: "6" }
    }
  })
];

export const seedCategories = Array.from(
  seedPrompts.reduce((categories, promptItem) => {
    categories.add(promptItem.category);
    promptItem.secondaryCategories.forEach((category) => categories.add(category));
    return categories;
  }, new Set<string>())
).sort((a, b) => a.localeCompare(b));

