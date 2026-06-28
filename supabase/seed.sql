insert into public.levels(level, min_xp, max_xp, name) values
  (1, 0, 49, 'Explorador/a GIANT'),
  (2, 50, 149, 'Aprendiz de Prompt'),
  (3, 150, 349, 'Contribuidor/a'),
  (4, 350, 749, 'Arquitecto/a de Prompts'),
  (5, 750, 1499, 'Referente GIANT'),
  (6, 1500, 2999, 'Maestro/a Promptologo/a'),
  (7, 3000, 5999, 'Leyenda GIANT'),
  (8, 6000, 9999, 'Oraculo de IA Clinica'),
  (9, 10000, null, 'Embajador/a GIANT')
on conflict (level) do nothing;

insert into public.categories(name, slug, description) values
  ('Investigacion', 'investigacion', 'Prompts para diseno y ejecucion de estudios.'),
  ('Lectura critica', 'lectura-critica', 'Prompts para evaluacion de literatura cientifica.'),
  ('Redaccion cientifica', 'redaccion-cientifica', 'Prompts para manuscritos, abstracts y comunicacion cientifica.'),
  ('Docencia', 'docencia', 'Prompts para ensenanza y sesiones.'),
  ('Enfermedades infecciosas', 'enfermedades-infecciosas', 'Prompts aplicados a infecciosas.'),
  ('Microbiologia clinica', 'microbiologia-clinica', 'Prompts de laboratorio y microbiologia.'),
  ('PROA', 'proa', 'Prompts para programas de optimizacion antimicrobiana.'),
  ('Productividad clinica', 'productividad-clinica', 'Prompts de productividad asistencial.'),
  ('Productividad en laboratorio', 'productividad-laboratorio', 'Prompts de productividad en laboratorio.'),
  ('Gestion de correo electronico', 'gestion-correo-electronico', 'Prompts para comunicacion profesional.'),
  ('Presentaciones', 'presentaciones', 'Prompts para diapositivas y sesiones.'),
  ('Analisis de datos', 'analisis-de-datos', 'Prompts para planes analiticos.'),
  ('Bioinformatica', 'bioinformatica', 'Prompts para interpretar resultados bioinformaticos.'),
  ('Comunicacion cientifica', 'comunicacion-cientifica', 'Prompts de comunicacion responsable.'),
  ('Redes sociales profesionales', 'redes-sociales-profesionales', 'Prompts para redes profesionales.'),
  ('Preparacion de sesiones clinicas', 'preparacion-sesiones-clinicas', 'Prompts para sesiones clinicas.'),
  ('Revision bibliografica', 'revision-bibliografica', 'Prompts para busquedas y revisiones.'),
  ('Protocolos y guias clinicas', 'protocolos-guias-clinicas', 'Prompts para protocolos y guias.'),
  ('Herramientas digitales', 'herramientas-digitales', 'Prompts para nuevas tecnologias.')
on conflict (slug) do nothing;

insert into public.about_content(id, title, intro, composition, creator_note) values (
  'main',
  'Quiénes somos',
  'GIANT es el Grupo de trabajo de Inteligencia Artificial y Nuevas Tecnologías de SEIMC. Su objetivo es impulsar un uso práctico, responsable y colaborativo de la IA en enfermedades infecciosas y microbiología clínica.',
  'GIANT está compuesto por profesionales vinculados a la asistencia, la microbiología, la investigación, la docencia, la salud pública y el desarrollo tecnológico dentro del entorno SEIMC.',
  'La Promptoteca GIANT ha sido creada por Andrés Blanco Di Matteo como repositorio colaborativo para compartir prompts útiles, adaptables y revisables por la comunidad científica.'
)
on conflict (id) do update set
  title = excluded.title,
  intro = excluded.intro,
  composition = excluded.composition,
  creator_note = excluded.creator_note;

insert into public.about_people(name, role, bio, person_type, display_order, photo_alt) values (
  'Andrés Blanco Di Matteo',
  'Creador de la Promptoteca GIANT',
  'Impulsor del repositorio y de su enfoque colaborativo para Enfermedades Infecciosas y Microbiología Clínica.',
  'creator',
  1,
  'Foto de Andrés Blanco Di Matteo'
)
on conflict (name, person_type) do update set
  role = excluded.role,
  bio = excluded.bio,
  display_order = excluded.display_order,
  photo_alt = excluded.photo_alt;

insert into public.prompts(
  slug, title, summary, content, author_display_name, primary_category_id, recommended_tools,
  language, best_language, difficulty, tags, review_status, experimental, validated_by_giant,
  giant_quality_score, no_patient_data_confirmed, likes_count, favorites_count, copies_count, template_uses_count
) values
  (
    'lectura-critica-articulo-clinico',
    'Lectura critica de articulo clinico',
    'Estructura una lectura critica con foco en validez, resultados y aplicabilidad.',
    'Actua como [rol profesional] y realiza una lectura critica de un articulo sobre [tema]. Evalua pregunta, diseno, poblacion, desenlaces, sesgos, validez externa y aplicabilidad a [contexto asistencial].',
    'Equipo GIANT',
    (select id from public.categories where slug = 'lectura-critica'),
    array['ChatGPT','Claude','Elicit'],
    'Espanol',
    'Espanol',
    'intermedio',
    array['journal club','evidencia','sesion clinica'],
    'approved',
    false,
    true,
    5,
    true,
    46,
    32,
    121,
    88
  ),
  (
    'pico-pregunta-investigacion',
    'Convertir una idea en pregunta PICO',
    'Transforma una idea clinica o microbiologica en pregunta PICO.',
    'Convierte la idea [idea inicial] en una pregunta PICO. Define poblacion, intervencion o exposicion, comparador, desenlace principal, objetivos, hipotesis y diseno para [entorno].',
    'Equipo GIANT',
    (select id from public.categories where slug = 'investigacion'),
    array['ChatGPT','Claude','Consensus'],
    'Espanol',
    'Espanol',
    'principiante',
    array['PICO','protocolo','hipotesis'],
    'approved',
    false,
    true,
    4,
    true,
    39,
    28,
    97,
    64
  ),
  (
    'comentario-antibiograma',
    'Borrador de comentario de antibiograma',
    'Ayuda a redactar un comentario prudente de antibiograma sin sustituir criterio microbiologico.',
    'Con estos datos anonimizados: [resultado microbiologico], redacta un comentario orientativo para [destinatario]. Incluye interpretacion prudente, limitaciones y necesidad de correlacion clinica.',
    'Equipo GIANT',
    (select id from public.categories where slug = 'microbiologia-clinica'),
    array['ChatGPT','Claude','Herramienta local'],
    'Espanol',
    'Espanol',
    'avanzado',
    array['antibiograma','laboratorio','interpretacion'],
    'pending',
    true,
    false,
    null,
    true,
    31,
    25,
    73,
    49
  )
on conflict (slug) do nothing;
