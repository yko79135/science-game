import type { RegionDef, RegionId } from './types';

export const REGION_ORDER: RegionId[] = [
  'skin',
  'nose',
  'throat',
  'lungs',
  'bloodstream',
  'heart',
  'liver',
  'stomach',
  'intestines',
  'kidneys',
  'lymphNodes',
  'spleen',
  'brain',
];

export const REGIONS: Record<RegionId, RegionDef> = {
  skin: {
    id: 'skin',
    name: 'Skin',
    icon: '🩹',
    description: 'The body\'s outer barrier. Wounds here are the most common entry point for bacteria.',
    traits: { bacteriaGrowthBonus: 1, vitality: 4 },
  },
  nose: {
    id: 'nose',
    name: 'Nose / Upper Airway',
    icon: '👃',
    description: 'First contact for airborne pathogens. A common launch point for viral infections.',
    traits: { virusReplicationBonus: 1, vitality: 3 },
  },
  throat: {
    id: 'throat',
    name: 'Throat',
    icon: '🗣️',
    description: 'A crossroads region connecting the airway and the digestive tract.',
    traits: { vitality: 4 },
  },
  lungs: {
    id: 'lungs',
    name: 'Lungs',
    icon: '🫁',
    description: 'High oxygen, huge surface area. Great for viral replication, but damage here hits the whole body hard.',
    traits: { virusReplicationBonus: 2, highConsequence: 1.6, vitality: 10 },
  },
  bloodstream: {
    id: 'bloodstream',
    name: 'Bloodstream',
    icon: '🩸',
    description: 'The great highway of the body. Fast travel for pathogens, but also heavily patrolled by immune cells.',
    traits: { immuneBonus: 1, vitality: 9 },
  },
  heart: {
    id: 'heart',
    name: 'Heart',
    icon: '❤️',
    description: 'Keeps blood moving. Rarely infected directly, but catastrophic if it fails.',
    traits: { highConsequence: 2, vitality: 9 },
  },
  liver: {
    id: 'liver',
    name: 'Liver',
    icon: '🫘',
    description: 'Filters toxins from the blood. Damage here lets toxins build up throughout the body.',
    traits: { highConsequence: 1.5, vitality: 8 },
  },
  stomach: {
    id: 'stomach',
    name: 'Stomach',
    icon: '🫄',
    description: 'Harsh acidic environment. Hostile to most pathogens that pass through.',
    traits: { vitality: 5 },
  },
  intestines: {
    id: 'intestines',
    name: 'Intestines',
    icon: '🌀',
    description: 'Home to a large beneficial microbiome that competes with invaders for resources.',
    traits: { bacteriaGrowthBonus: 2, microbiome: 60, vitality: 7 },
  },
  kidneys: {
    id: 'kidneys',
    name: 'Kidneys',
    icon: '🫗',
    description: 'Filter the blood and balance fluids. Sensitive to toxins and dehydration.',
    traits: { highConsequence: 1.3, vitality: 6 },
  },
  lymphNodes: {
    id: 'lymphNodes',
    name: 'Lymph Nodes',
    icon: '🔵',
    description: 'Command centers of the immune system. Adaptive immunity develops fastest here.',
    traits: { immuneBonus: 3, vitality: 5 },
  },
  spleen: {
    id: 'spleen',
    name: 'Spleen',
    icon: '🟣',
    description: 'Filters blood and helps immune cells mature. A quiet but important immune asset.',
    traits: { immuneBonus: 2, vitality: 5 },
  },
  brain: {
    id: 'brain',
    name: 'Brain',
    icon: '🧠',
    description: 'Protected by the blood-brain barrier, making it very hard to enter — but devastating if breached.',
    traits: { bloodBrainBarrier: true, highConsequence: 2.5, vitality: 10 },
  },
};

export const MAJOR_ORGANS: RegionId[] = ['lungs', 'liver', 'heart', 'kidneys', 'brain', 'intestines', 'spleen'];
