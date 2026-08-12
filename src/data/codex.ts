export interface CodexEntry {
  id: string;
  category: 'pathogens' | 'immune' | 'concepts' | 'organs';
  icon: string;
  title: string;
  text: string;
}

export const CODEX: CodexEntry[] = [
  {
    id: 'bacteria',
    category: 'pathogens',
    icon: '🦠',
    title: 'Bacteria',
    text: 'Single-celled organisms that can reproduce on their own, outside a host cell. Some cause disease by producing toxins or overwhelming tissue. Antibiotics target bacteria specifically — they do nothing to viruses.',
  },
  {
    id: 'virus',
    category: 'pathogens',
    icon: '🧫',
    title: 'Virus',
    text: 'A virus is not a complete cell — it cannot reproduce on its own. It must hijack a host cell\'s machinery to make copies of itself, which is why viral infections work so differently from bacterial ones.',
  },
  {
    id: 'biofilm',
    category: 'pathogens',
    icon: '🛡️',
    title: 'Biofilm',
    text: 'A protective layer of slime-like matrix that bacterial colonies build around themselves, making it much harder for immune cells and antibiotics to reach them.',
  },
  {
    id: 'resistance',
    category: 'pathogens',
    icon: '🧬',
    title: 'Antibiotic Resistance',
    text: 'When an antibiotic is used, susceptible bacteria die but any naturally resistant ones survive and reproduce. Over time, this natural selection makes the whole population harder to treat.',
  },
  {
    id: 'mutation',
    category: 'pathogens',
    icon: '🎲',
    title: 'Mutation',
    text: 'Random changes in a pathogen\'s genetic material. Most do nothing, some are harmful, and occasionally one gives an advantage — like evading the immune system or spreading faster — which then spreads through the population.',
  },
  {
    id: 'macrophage',
    category: 'immune',
    icon: '🟡',
    title: 'Macrophage',
    text: 'An innate immune cell that engulfs and digests pathogens. It also displays pieces of what it ate to other immune cells, helping "teach" the adaptive immune system what to look for.',
  },
  {
    id: 'neutrophil',
    category: 'immune',
    icon: '⚪',
    title: 'Neutrophil',
    text: 'The most abundant innate immune cell. Fast to respond and quick to attack, but individually less powerful than a macrophage.',
  },
  {
    id: 'innate',
    category: 'immune',
    icon: '⚡',
    title: 'Innate Immunity',
    text: 'The body\'s fast, general-purpose first line of defense. It responds quickly to many threats but isn\'t specialized against any one of them.',
  },
  {
    id: 'adaptive',
    category: 'immune',
    icon: '🧠',
    title: 'Adaptive Immunity',
    text: 'A slower but highly specific defense that develops after the body has had time to detect and study a pathogen. Once active, it becomes very effective and can leave lasting memory.',
  },
  {
    id: 'tcell',
    category: 'immune',
    icon: '🟢',
    title: 'Cytotoxic T Cell',
    text: 'An adaptive immune cell that recognizes and destroys the body\'s own cells once they\'ve been infected — stopping a virus from using them as a factory.',
  },
  {
    id: 'bcell',
    category: 'immune',
    icon: '🔷',
    title: 'B Cell',
    text: 'An adaptive immune cell that, once activated, produces antibodies precisely matched to a specific pathogen.',
  },
  {
    id: 'antibody',
    category: 'immune',
    icon: '🔷',
    title: 'Antibody',
    text: 'A Y-shaped protein produced by B cells that latches onto a specific pathogen, neutralizing it and marking it for destruction.',
  },
  {
    id: 'memory',
    category: 'immune',
    icon: '💾',
    title: 'Immune Memory',
    text: 'After a pathogen is cleared, some B and T cells stick around as memory cells. If the same pathogen returns, the body can respond much faster the second time.',
  },
  {
    id: 'inflammation',
    category: 'concepts',
    icon: '🔥',
    title: 'Inflammation',
    text: 'A local immune response that increases blood flow and draws immune cells into infected tissue. Helpful in fighting infection, but the swelling and chemical activity also damage the body\'s own tissue.',
  },
  {
    id: 'fever',
    category: 'concepts',
    icon: '🌡️',
    title: 'Fever',
    text: 'A deliberate rise in body temperature that slows the reproduction of many pathogens and boosts some immune activity — but a fever that runs too hot for too long strains the whole body.',
  },
  {
    id: 'cytokineStorm',
    category: 'concepts',
    icon: '⚡',
    title: 'Cytokine Storm',
    text: 'When inflammation signals spiral out of control body-wide, the immune response itself can cause severe damage — sometimes more dangerous than the original infection.',
  },
  {
    id: 'microbiome',
    category: 'concepts',
    icon: '🌀',
    title: 'Microbiome',
    text: 'Trillions of beneficial bacteria that normally live in and on the body, especially in the intestines. They compete with harmful invaders for space and resources, helping prevent infection.',
  },
  {
    id: 'lungs',
    category: 'organs',
    icon: '🫁',
    title: 'Lungs',
    text: 'A huge, moist, oxygen-rich surface built for gas exchange — which also makes it an easy environment for respiratory viruses to replicate. Damage here affects the whole body\'s oxygen supply.',
  },
  {
    id: 'liver',
    category: 'organs',
    icon: '🫘',
    title: 'Liver',
    text: 'Filters toxins out of the blood and supports the immune system. If it\'s damaged, toxins that would normally be cleared can build up throughout the body.',
  },
  {
    id: 'lymphNodes',
    category: 'organs',
    icon: '🔵',
    title: 'Lymph Nodes',
    text: 'Small hubs scattered through the body where immune cells gather, communicate, and where adaptive immunity is trained. This is where much of the immune "planning" happens.',
  },
  {
    id: 'brain',
    category: 'organs',
    icon: '🧠',
    title: 'Brain & Blood-Brain Barrier',
    text: 'A tightly sealed layer of cells protects the brain from most pathogens and toxins circulating in the blood. It\'s very hard to breach — but an infection that gets through can be devastating.',
  },
];

export const CODEX_CATEGORIES: { id: CodexEntry['category']; label: string }[] = [
  { id: 'pathogens', label: 'Pathogens' },
  { id: 'immune', label: 'Immune System' },
  { id: 'concepts', label: 'Key Concepts' },
  { id: 'organs', label: 'Organs' },
];
