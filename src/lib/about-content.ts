export interface AboutPerson {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoUrl?: string;
}

export interface AboutContent {
  title: string;
  intro: string;
  composition: string;
  creator: string;
  people: AboutPerson[];
}

export const ABOUT_CONTENT_KEY = "giant_about_content";

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  title: "Quiénes somos",
  intro:
    "GIANT es el Grupo de trabajo de Inteligencia Artificial y Nuevas Tecnologías de SEIMC. Su objetivo es impulsar un uso práctico, responsable y colaborativo de la IA en enfermedades infecciosas y microbiología clínica.",
  composition:
    "GIANT está compuesto por profesionales vinculados a la asistencia, la microbiología, la investigación, la docencia, la salud pública y el desarrollo tecnológico dentro del entorno SEIMC.",
  creator:
    "La Promptoteca GIANT ha sido creada por Andrés Blanco Di Matteo como repositorio colaborativo para compartir prompts útiles, adaptables y revisables por la comunidad científica.",
  people: [
    {
      id: "andres-blanco-di-matteo",
      name: "Andrés Blanco Di Matteo",
      role: "Creador de la Promptoteca GIANT",
      bio: "Impulsor del repositorio y de su enfoque colaborativo para Enfermedades Infecciosas y Microbiología Clínica."
    }
  ]
};
