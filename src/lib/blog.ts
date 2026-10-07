// Static blog, in the spirit of ShipeaRapido's app/blog/_assets/content.js: articles are data in
// code, not database rows. Simplified: no authors, no categories.

export type ArticleMode = "companion" | "reader" | "teacher";

export type ArticleBlock = { type: "p" | "h2" | "quote"; text: string };

export interface Article {
  slug: string;
  title: string;
  description: string;
  // ISO date (YYYY-MM-DD).
  publishedAt: string;
  readingMinutes: number;
  // Which Reed character illustrates the article.
  mode: ArticleMode;
  content: ArticleBlock[];
}

interface ModeCharacter {
  label: string;
  src: string;
  width: number;
  height: number;
  alt: string;
}

// Same images and labels as the landing's ModesShowcase (R-012).
export const modeCharacters: Record<ArticleMode, ModeCharacter> = {
  companion: {
    label: "Compañero",
    src: "/reed/companion.webp",
    width: 518,
    height: 640,
    alt: "Reed en modo compañero, sonriendo",
  },
  reader: {
    label: "Lector",
    src: "/reed/reader.webp",
    width: 495,
    height: 640,
    alt: "Reed en modo lector, con audífonos y micrófono",
  },
  teacher: {
    label: "Profesor",
    src: "/reed/teacher.webp",
    width: 476,
    height: 640,
    alt: "Reed en modo profesor, con lentes redondos",
  },
};

const articles: Article[] = [
  {
    slug: "tres-libros-empezados-en-la-mesa-de-noche",
    title: "Tres libros empezados en la mesa de noche",
    description:
      "Por qué dejamos libros a medias —tiempo, atención, comprensión— y qué ayuda de verdad a retomarlos sin culpa.",
    publishedAt: "2026-10-07",
    readingMinutes: 4,
    mode: "companion",
    content: [
      {
        type: "p",
        text: "Seguro los conoces: uno con el separador en la página cuarenta, otro que juraste terminar en vacaciones y un tercero que compraste porque alguien te lo recomendó con mucho entusiasmo. Ahí están, apilados en la mesa de noche, mirándote cada vez que apagas la luz.",
      },
      {
        type: "p",
        text: "Antes de cualquier otra cosa: no pasa nada. Dejar un libro a medias no dice nada malo de ti. Dice algo de tu semana, de tu cansancio o del libro mismo. Y casi siempre tiene arreglo.",
      },
      { type: "h2", text: "Por qué se quedan a medias" },
      {
        type: "p",
        text: "La primera razón es la más obvia: el tiempo. Leer pide un rato seguido, y los días vienen en trocitos. Diez minutos en el transporte, cinco antes de dormir, un hueco mientras se calienta la comida. Un libro que necesita una hora para agarrar ritmo compite mal contra una semana partida en pedazos.",
      },
      {
        type: "p",
        text: "La segunda es la atención. Puedes tener el libro abierto y la cabeza en otra parte: el pendiente del trabajo, el mensaje que no contestaste, la lista del súper. Lees un párrafo, llegas al final y descubres que no sabes qué dijo. Lo vuelves a leer. Al tercer intento, cierras el libro. Es normal; la atención también se cansa.",
      },
      {
        type: "p",
        text: "La tercera es la comprensión. Hay libros que dan por hecho cosas que tú no sabes: un periodo histórico, una palabra técnica, un personaje que apareció hace cien páginas y que ya no recuerdas. Cuando un texto se vuelve cuesta arriba, cualquier excusa es buena para dejarlo para mañana. Y mañana se vuelve el mes que viene.",
      },
      { type: "h2", text: "El problema de volver" },
      {
        type: "p",
        text: "Lo difícil no suele ser empezar, sino retomar. Abres el libro después de dos semanas y te encuentras en medio de una conversación que ya no entiendes. ¿Quién era esta? ¿Por qué están enojados? ¿Dónde íbamos? Entonces tienes dos opciones, y ninguna es buena: empezar de cero o seguir adelante perdido.",
      },
      {
        type: "quote",
        text: "Un libro a medias no es un fracaso. Es una conversación que quedó en pausa.",
      },
      { type: "h2", text: "Lo que sí ayuda" },
      {
        type: "p",
        text: "Elige uno. No hace falta despedirte de los otros dos para siempre; solo decide cuál va primero. Tener tres abiertos a la vez reparte las ganas en tres, y ninguno avanza.",
      },
      {
        type: "p",
        text: "Haz un resumen antes de seguir. Antes de leer la página siguiente, repasa en pocas líneas dónde quedaste: qué pasó, quién es quién, qué estaba en juego. Si no lo recuerdas, hojea los títulos de los capítulos o lee los últimos párrafos que subrayaste. Dos minutos de repaso ahorran veinte de confusión.",
      },
      {
        type: "p",
        text: "Baja la meta. En vez de «terminar el libro», prueba con «leer un capítulo» o incluso «leer diez minutos». Las metas pequeñas se cumplen, y cumplirlas da ganas de seguir.",
      },
      {
        type: "p",
        text: "Pregunta cuando te pierdas. Si una palabra, una fecha o un personaje te frenan, resuélvelo en el momento en vez de seguir de largo. Una duda pequeña que se acumula es la que, unas páginas después, te hace cerrar el libro.",
      },
      {
        type: "p",
        text: "Y cambia de formato si hace falta. Hay días en que no tienes ojos para leer, pero sí oídos para escuchar. Escuchar un capítulo mientras caminas también cuenta como avanzar.",
      },
      { type: "h2", text: "Para eso estoy" },
      {
        type: "p",
        text: "En modo Compañero, eso es justo lo que hago: cuando vuelves a un libro, te cuento en pocas líneas dónde quedaste. Si algo no se entiende, me preguntas y lo vemos juntos, sin prisa. Y si te topas con un dato curioso en el camino, te lo comento para que la lectura se sienta menos solitaria.",
      },
      {
        type: "p",
        text: "Esta noche, cuando veas la pila en la mesa de noche, no la mires con culpa. Escoge uno, lee lo que alcances y deja el separador un poco más adelante. Con eso basta.",
      },
    ],
  },
  {
    slug: "escuchar-tambien-es-leer",
    title: "Escuchar también es leer",
    description:
      "Leer con los oídos mientras haces otra cosa sí cuenta. Cuándo funciona escuchar un libro y cuándo conviene volver al texto.",
    publishedAt: "2026-10-07",
    readingMinutes: 4,
    mode: "reader",
    content: [
      {
        type: "p",
        text: "Hay una pregunta que aparece cada tanto, casi siempre en voz baja: si escuché el libro en vez de leerlo, ¿lo leí? Mi respuesta corta es que sí. La larga es más interesante.",
      },
      {
        type: "p",
        text: "Durante mucho tiempo, las historias se contaron en voz alta. Alguien leía y los demás escuchaban: en una sala, alrededor de una mesa, junto a la cama de un niño. Leer en silencio, solo con los ojos, es una costumbre más reciente de lo que parece. Escuchar un libro no es un atajo; es una de las formas más antiguas de leer.",
      },
      { type: "h2", text: "Lo que ganas al escuchar" },
      {
        type: "p",
        text: "La ventaja más clara es el tiempo. Escuchar convierte los ratos muertos en ratos de lectura: el trayecto al trabajo, la fila del banco, los platos sucios, la caminata con el perro. Momentos en los que no podrías sostener un libro, pero sí seguir una historia.",
      },
      {
        type: "p",
        text: "También ganas ritmo. Una buena lectura en voz alta marca las pausas, distingue las voces de los personajes y le da tono a las frases. A veces un párrafo que en papel se sentía pesado, escuchado, de pronto se entiende.",
      },
      {
        type: "p",
        text: "Y ganas compañía. Hay algo tranquilo en que alguien te lea. Te quita la presión de avanzar línea por línea y te deja simplemente seguir el hilo.",
      },
      { type: "h2", text: "Lo que cuesta un poco más" },
      {
        type: "p",
        text: "Escuchar tiene su truco: la atención se va con facilidad. Si estás manejando en una calle complicada o resolviendo algo del trabajo, la voz sigue avanzando y tú no. Al rato descubres que pasaron tres páginas y no sabes qué dijeron.",
      },
      {
        type: "p",
        text: "También es más difícil volver atrás. Con un libro en la mano, tus ojos regresan solos a la frase que no entendiste. Con el audio, tienes que buscar el momento exacto, y eso rompe el ritmo.",
      },
      {
        type: "quote",
        text: "Los ojos y los oídos no compiten. Se turnan según lo que el texto y el día te piden.",
      },
      { type: "h2", text: "Cuándo conviene volver al texto" },
      {
        type: "p",
        text: "Hay textos que se llevan muy bien con los oídos: novelas, crónicas, memorias, ensayos que cuentan una historia. Lo que importa ahí es seguir el hilo, y una voz lo hace fácil.",
      },
      {
        type: "p",
        text: "Otros piden ojos. Un texto con fórmulas, tablas o mapas. Un capítulo muy denso, de esos donde cada frase carga una idea nueva. Un poema que quieres leer despacio. O un pasaje que te gustó tanto que quieres verlo escrito, subrayarlo y volver a él.",
      },
      {
        type: "p",
        text: "Una buena señal para cambiar de formato es cuando sientes que te perdiste. Si llevas un rato escuchando y ya no sabes dónde estás, no fuerces. Pausa, abre el texto en ese punto y lee unos párrafos con los ojos. Cuando recuperes el hilo, vuelve a escuchar.",
      },
      { type: "h2", text: "Escuchar bien" },
      {
        type: "p",
        text: "Unas ideas sencillas ayudan. Escoge para escuchar los momentos en que tus manos están ocupadas pero tu cabeza está libre: caminar, cocinar, ordenar. Ajusta la velocidad a tu gusto, ni tan lenta que te aburra ni tan rápida que te canse. Y al terminar una sesión, tómate unos segundos para repasar qué pasó. Ese pequeño resumen mental fija lo que escuchaste.",
      },
      { type: "h2", text: "Léemelo" },
      {
        type: "p",
        text: "En modo Lector, eso hago: te leo el libro en voz alta desde donde te quedaste. Si en algún momento quieres volver al texto, está ahí mismo, en el párrafo que iba leyendo. Puedes pasar de escuchar a leer y de leer a escuchar sin perder el lugar.",
      },
      {
        type: "p",
        text: "Así que la próxima vez que alguien te pregunte si leíste ese libro y tú lo escuchaste mientras ibas al trabajo, puedes decir que sí sin dudarlo. Lo leíste con los oídos.",
      },
    ],
  },
  {
    slug: "preguntarle-al-libro",
    title: "Preguntarle al libro",
    description:
      "Leer con preguntas, al estilo del método socrático explicado simple, para entender los textos que se resisten.",
    publishedAt: "2026-10-07",
    readingMinutes: 4,
    mode: "teacher",
    content: [
      {
        type: "p",
        text: "Hay textos que se dejan leer y textos que se resisten. Los primeros fluyen: lees y entiendes. Los segundos te obligan a releer el mismo párrafo tres veces y aun así te dejan con la sensación de que algo se te escapó. Para esos, tengo una propuesta: deja de leerlos como quien recibe un mensaje y empieza a leerlos como quien conversa. Hazles preguntas.",
      },
      { type: "h2", text: "Una idea muy vieja" },
      {
        type: "p",
        text: "Sócrates, el filósofo griego, tenía una manera peculiar de enseñar: casi no daba respuestas. Hacía preguntas. Preguntaba qué quería decir su interlocutor con una palabra, por qué pensaba lo que pensaba, qué pasaría si fuera de otra manera. A fuerza de preguntas, la otra persona llegaba sola a entender algo que antes daba por sabido o que no veía.",
      },
      {
        type: "p",
        text: "A eso se le llama método socrático. Suena solemne, pero la idea es sencilla: entender no es recibir una explicación, es construirla. Y las preguntas son las herramientas para construirla.",
      },
      { type: "h2", text: "Cómo se ve con un libro" },
      {
        type: "p",
        text: "Un libro no te va a contestar en voz alta, pero sí puedes interrogarlo. Estas son algunas preguntas que funcionan con casi cualquier texto difícil.",
      },
      {
        type: "p",
        text: "¿Qué está diciendo, en palabras simples? Intenta explicar el párrafo como se lo contarías a un amigo, sin las palabras del autor. Si no puedes, ahí está el nudo.",
      },
      {
        type: "p",
        text: "¿Qué palabra no entiendo de verdad? A veces creemos conocer una palabra y la usamos de memoria. Pregúntate qué significa en este texto en particular. Muchas confusiones vienen de una sola palabra mal entendida.",
      },
      {
        type: "p",
        text: "¿Por qué el autor dice esto aquí? Cada idea responde a algo: a una pregunta anterior, a una objeción, a otro autor. Si entiendes contra qué está discutiendo, entiendes mucho más de lo que dice.",
      },
      {
        type: "p",
        text: "¿Qué pasaría si fuera al revés? Imagina lo contrario de lo que afirma el texto. A veces una idea solo se ve clara cuando la pones al lado de su opuesta.",
      },
      {
        type: "p",
        text: "¿Cómo se conecta con lo que ya sé? Busca un ejemplo de tu vida, de otro libro o de algo que viste. Una idea abstracta se vuelve concreta cuando la amarras a algo conocido.",
      },
      {
        type: "quote",
        text: "Una buena pregunta no te da la respuesta. Te deja a un paso de encontrarla tú.",
      },
      { type: "h2", text: "Por qué funciona" },
      {
        type: "p",
        text: "Cuando lees con preguntas, cambias de papel. Ya no esperas que el texto te entre solo; vas a buscarlo. Esa búsqueda te obliga a prestar atención, a relacionar ideas y a notar justo dónde te perdiste. Y lo que entiendes así, por tu cuenta, se queda contigo mucho más tiempo que lo que alguien te explicó de prisa.",
      },
      {
        type: "p",
        text: "También te quita el miedo a no entender. Una pregunta no es una confesión de que no sabes; es el primer paso para saber. Nadie entiende un texto difícil a la primera, y quien dice que sí, probablemente no lo leyó con cuidado.",
      },
      { type: "h2", text: "Un ejercicio para hoy" },
      {
        type: "p",
        text: "La próxima vez que un párrafo se te resista, no lo releas en automático. Detente y escribe una sola pregunta sobre él, la que sea. Luego intenta contestarla con el mismo texto. Si tu respuesta abre otra pregunta, mejor: vas por buen camino.",
      },
      { type: "h2", text: "Enséñame" },
      {
        type: "p",
        text: "En modo Profesor trabajo así. Si me preguntas qué significa un pasaje, no te doy la respuesta de golpe: te doy una pista, te hago una pregunta, y te acompaño hasta que llegas tú. Es un poco más lento que leer un resumen, pero lo que entiendes de esa forma es tuyo.",
      },
      {
        type: "p",
        text: "Los libros difíciles no son un muro. Son una conversación que pide un poco más de ti. Y conversar, al final, consiste en preguntar.",
      },
    ],
  },
];

export function getArticles(): Article[] {
  return articles;
}

export function getArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}
