import React, { useState, useEffect } from 'react';
import { Upload, Play, Users, Target, Zap, Shield, Sword, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';

// Base de données des règles de keywords
const KEYWORD_RULES = {
  'Ignores Cover': {
    name: 'Ignores Cover',
    description: 'Les armes avec [IGNORES COVER] dans leur profil sont connues comme des armes Ignores Cover. Chaque fois qu\'une attaque est faite avec une telle arme, la cible ne peut pas avoir l\'Avantage de Couverture contre cette attaque.',
    page: 25
  },
  'Torrent': {
    name: 'Torrent',
    description: 'Les armes avec [TORRENT] dans leur profil sont connues comme des armes Torrent. Chaque fois qu\'une attaque est faite avec une telle arme, cette attaque touche automatiquement la cible.',
    page: 25
  },
  'Anti-Monster 4+': {
    name: 'Anti-Monster 4+',
    description: 'Les armes avec [ANTI-KEYWORD X+] dans leur profil sont connues comme des armes Anti. Chaque fois qu\'une attaque est faite avec une telle arme contre une cible avec le mot-clé après le mot "Anti-", un jet de Blessure non modifié de "x+" compte comme une Blessure Critique.',
    page: 28
  },
  'Anti-Vehicle 4+': {
    name: 'Anti-Vehicle 4+',
    description: 'Les armes avec [ANTI-KEYWORD X+] dans leur profil sont connues comme des armes Anti. Chaque fois qu\'une attaque est faite avec une telle arme contre une cible avec le mot-clé après le mot "Anti-", un jet de Blessure non modifié de "x+" compte comme une Blessure Critique.',
    page: 28
  },
  'Anti-Titanic 4+': {
    name: 'Anti-Titanic 4+',
    description: 'Les armes avec [ANTI-KEYWORD X+] dans leur profil sont connues comme des armes Anti. Chaque fois qu\'une attaque est faite avec une telle arme contre une cible avec le mot-clé après le mot "Anti-", un jet de Blessure non modifié de "x+" compte comme une Blessure Critique.',
    page: 28
  },
  'Devastating Wounds': {
    name: 'Devastating Wounds',
    description: 'Les armes avec [DEVASTATING WOUNDS] dans leur profil sont connues comme des armes Devastating Wounds. Chaque fois qu\'une attaque est faite avec une telle arme, si cette attaque compte comme une Blessure Critique, aucun jet de sauvegarde de quelque nature que ce soit ne peut être fait contre cette attaque (y compris les sauvegardes d\'invulnérabilité).',
    page: 28
  },
  'Melta 2': {
    name: 'Melta 2',
    description: 'Les armes avec [MELTA X] dans leur profil sont connues comme des armes Melta. Chaque fois qu\'une attaque faite avec une telle arme cible une unité à moins de la moitié de la portée de cette arme, la caractéristique de Dégâts de cette attaque est augmentée de la quantité dénotée par "x".',
    page: 26
  },
  'Melta 4': {
    name: 'Melta 4',
    description: 'Les armes avec [MELTA X] dans leur profil sont connues comme des armes Melta. Chaque fois qu\'une attaque faite avec une telle arme cible une unité à moins de la moitié de la portée de cette arme, la caractéristique de Dégâts de cette attaque est augmentée de la quantité dénotée par "x".',
    page: 26
  },
  'Twin-Linked': {
    name: 'Twin-Linked',
    description: 'Les armes avec [TWIN-LINKED] dans leur profil sont connues comme des armes Twin-linked. Chaque fois qu\'une attaque est faite avec une telle arme, vous pouvez relancer le jet de Blessure de cette attaque.',
    page: 25
  },
  'Blast': {
    name: 'Blast',
    description: 'Les armes avec [BLAST] dans leur profil sont connues comme des armes Blast, et elles font un nombre aléatoire d\'attaques. Chaque fois que vous déterminez combien d\'attaques sont faites avec une arme Blast, ajoutez 1 au résultat pour chaque cinq modèles qui étaient dans l\'unité cible quand vous l\'avez sélectionnée comme cible (en arrondissant vers le bas).',
    page: 26
  },
  'Rapid Fire 3': {
    name: 'Rapid Fire 3',
    description: 'Les armes avec [RAPID FIRE X] dans leur profil sont connues comme des armes Rapid Fire. Chaque fois qu\'une telle arme cible une unité à moins de la moitié de sa portée, la caractéristique d\'Attaques de cette arme est augmentée de la quantité dénotée par "x".',
    page: 25
  }
};

const Warhammer40kAssistant = () => {
  const [gameState, setGameState] = useState('setup');
  const [armyData, setArmyData] = useState<any>(null);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [currentPhase, setCurrentPhase] = useState('command');
  const [activePlayer, setActivePlayer] = useState('player');
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [unitHealth, setUnitHealth] = useState<Record<string, number>>({});
  const [commandPoints, setCommandPoints] = useState(0);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({
    loadout: false,
    ranged: true,
    melee: true
  });
  const [resolvedRules, setResolvedRules] = useState<Record<string, boolean>>({});
  const [selectedOath, setSelectedOath] = useState<string | null>(null); // 'Lay Low The Tyrant' | 'Reclaim the Realm'
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const phases = [
    { id: 'command', name: 'Commandement', icon: Users, color: 'bg-blue-500' },
    { id: 'movement', name: 'Mouvement', icon: Target, color: 'bg-green-500' },
    { id: 'shooting', name: 'Tir', icon: Zap, color: 'bg-red-500' },
    { id: 'charge', name: 'Charge', icon: Sword, color: 'bg-orange-500' },
    { id: 'fight', name: 'Combat', icon: Shield, color: 'bg-purple-500' },
    { id: 'endofturn', name: 'End of Turn', icon: AlertCircle, color: 'bg-gray-500' }
  ];

  // Base de données des stratagèmes Leagues of Votann
  const LEAGUES_STRATAGEMS = [
    {
      name: "Newfound Nemesis",
      cost: 1,
      phase: "fight", // Peut être utilisé pendant la Fight phase après attaque ennemie
      timing: "After an enemy unit has resolved its attacks (Fight phase or opponent's Shooting phase)",
      description: "The attacking unit gains 1 Judgement token, or up to 2 Judgement tokens instead if that LEAGUES OF VOTANN unit contained your WARLORD when it was targeted by those attacks.",
      keywords: ["LEAGUES OF VOTANN"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    },
    {
      name: "Warrior Pride",
      cost: 1,
      phase: "fight",
      timing: "Fight phase",
      description: "Until the end of the phase, each time a model in your unit makes a melee attack that targets that enemy unit, improve the Armour Penetration characteristic of that attack by 1 for each Judgement token that enemy unit has.",
      keywords: ["LEAGUES OF VOTANN"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    },
    {
      name: "Void Armour",
      cost: 1,
      phase: "any",
      timing: "When your unit is targeted",
      description: "Until the attacking unit has finished making its attacks, each time an attack targets your LEAGUES OF VOTANN unit, worsen the Armour Penetration characteristic of that attack by 1.",
      keywords: ["LEAGUES OF VOTANN"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    },
    {
      name: "Reactive Reprisal",
      cost: 2,
      phase: "shooting",
      timing: "Enemy Shooting phase after unit with Judgement tokens attacks",
      description: "Your LEAGUES OF VOTANN unit can shoot as if it were your Shooting phase, but it must target the enemy unit that just attacked it, and can only do so if that enemy unit is an eligible target.",
      keywords: ["LEAGUES OF VOTANN"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    },
    {
      name: "Ordered Retreat",
      cost: 1,
      phase: "movement",
      timing: "After a unit Falls Back",
      description: "Until the end of the turn, your unit is eligible to shoot and declare a charge.",
      keywords: ["LEAGUES OF VOTANN"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    },

    {
      name: "Ancestral Sentence",
      cost: 1,
      phase: "shooting",
      timing: "Your Shooting phase",
      description: "Until the end of the phase, each time a model in your unit makes a ranged attack, that attack has the [SUSTAINED HITS 1] ability, and each time a model in your unit makes a ranged attack that targets a unit that has one or more Judgement tokens, that attack has the [SUSTAINED HITS 2] ability instead.",
      keywords: ["LEAGUES OF VOTANN"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    },

  ];

  // Base de données des stratagèmes Imperial Knights (OFFICIEL - Wahapedia)
  const IMPERIAL_KNIGHTS_STRATAGEMS = [
    {
      name: "Squires' Duty",
      cost: 1,
      type: "Noble Lance – Battle Tactic Stratagem",
      phase: "shooting,fight",
      timing: "The start of your Shooting phase or the start of the Fight phase",
      target: "Two or more ARMIGER models from your army and one enemy unit that is an eligible target for all of those ARMIGER models",
      effect: "Until the end of the phase, when resolving attacks that target that enemy unit, improve the Strength and Armour Penetration characteristics of weapons equipped by those ARMIGER models by 1. If your army is Honoured, until the end of the phase, add 1 to the Damage characteristic of those weapons as well",
      flavorText: "Under the scrutiny and judgement of their Noble betters, Armiger pilots will redouble their efforts, attacking as one to smash aside their foes",
      keywords: ["IMPERIAL KNIGHTS", "ARMIGER"],
      unitTypes: ["ARMIGER"],
      frequency: "once_per_turn"
    },
    {
      name: "Rotate Ion Shields",
      cost: 1,
      type: "Noble Lance – Wargear Stratagem",
      phase: "shooting",
      timing: "Your opponent's Shooting phase, just after an enemy unit has selected its targets",
      target: "One IMPERIAL KNIGHTS model from your army that was selected as the target of one or more of the attacking unit's attacks",
      effect: "Until the end of the phase, that IMPERIAL KNIGHTS model has a 4+ invulnerable save against ranged attacks",
      flavorText: "Veteran Knight pilots can swiftly angle their ion shields to better deflect incoming fire",
      keywords: ["IMPERIAL KNIGHTS"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    },
    {
      name: "Thunderstomp",
      cost: 1,
      type: "Noble Lance – Epic Deed Stratagem",
      phase: "fight",
      timing: "Fight phase",
      target: "One IMPERIAL KNIGHTS model from your army that has not been selected to fight this phase",
      effect: "Until the end of the phase, your model cannot target MONSTER or VEHICLE units, but all melee weapons equipped by your model have the [DEVASTATING WOUNDS] ability",
      flavorText: "The Noble brings their Knight suit's full weight crashing down with the force of an industrial piledriver. Few can survive such a blow",
      keywords: ["IMPERIAL KNIGHTS"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    },
    {
      name: "Valiant Last Stand",
      cost: 2,
      type: "Noble Lance – Epic Deed Stratagem",
      phase: "fight",
      timing: "Fight phase",
      target: "One IMPERIAL KNIGHTS model from your army that was just destroyed and that is eligible to fight but has not been selected to fight this phase. You can use this Stratagem on that model even though it was just destroyed",
      effect: "Before rolling to see if this model deals any mortal wounds as a result of its Deadly Demise ability, it can fight; when doing so, it is assumed to have 1 wound remaining, or all its wounds remaining if your army is Honoured. After it has finished resolving its attacks, resolve its Deadly Demise ability as normal",
      flavorText: "Badly wounded, their Knight's generator on the verge of overload, still the Noble fights on, drawing upon their reserves of chivalric heroism to sell their life as dearly as they can",
      restrictions: "You cannot target SIR HEKHTUR with this Stratagem",
      keywords: ["IMPERIAL KNIGHTS"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    },
    {
      name: "Trophy Claim",
      cost: 2,
      type: "Noble Lance – Epic Deed Stratagem",
      phase: "shooting,fight",
      timing: "Your Shooting phase or the Fight phase",
      target: "One IMPERIAL KNIGHTS model from your army that has not been selected to shoot or fight this phase, and one enemy MONSTER or VEHICLE unit",
      effect: "Until the end of the phase, each time your model makes an attack that targets that enemy unit, add 1 to the Wound roll. If your model destroys that enemy unit this phase, you gain 1CP, but if your model does not destroy that enemy unit this phase, you cannot use this Stratagem again for the rest of the battle",
      flavorText: "Once a mighty foe is laid low, the victorious Knight's emitters blare its triumph, announcing the glory brought to the Imperium, but shame awaits those who fail in such confrontations",
      keywords: ["IMPERIAL KNIGHTS"],
      unitTypes: ["any"],
      frequency: "once_per_battle"
    },
    {
      name: "Shoulder the Burden",
      cost: 2,
      type: "Noble Lance – Battle Tactic Stratagem",
      phase: "command",
      timing: "Your Command phase",
      target: "One IMPERIAL KNIGHTS model from your army that has lost one or more wounds",
      effect: "Until the start of your next Command phase, improve your model's Move, Toughness, Save, Leadership and Objective Control characteristics by 1 and each time your model makes an attack, add 1 to the Hit roll",
      flavorText: "When faced with their darkest hour, knightly Nobles rise to the challenge, for nothing shall deter them from fulfilling their duty",
      restrictions: "You can only use this Stratagem once per battle. If your army is Honoured, you can use this Stratagem one additional time",
      keywords: ["IMPERIAL KNIGHTS"],
      unitTypes: ["any"],
      frequency: "once_per_battle"
    }
  ];

  // Base de données des stratagèmes communs (Core Stratagems) - OFFICIEL
  const CORE_STRATAGEMS = [
    {
      name: "Command Re-roll",
      cost: 1,
      type: "Core – Battle Tactic Stratagem",
      phase: "command,movement,shooting,charge,fight",
      timing: "Any phase, just after you make an Advance roll, a Charge roll, a Desperate Escape test or a Hazardous test for a unit from your army, or a Hit roll, a Wound roll, a Damage roll or a saving throw for a model in that unit, or a roll to determine the number of attacks made with a weapon equipped by a model in that unit.",
      target: "That unit or model from your army.",
      effect: "You re-roll that roll, test or saving throw. If you are using fast dice rolling, select one of those rolls or saving throws to re-roll.",
      flavorText: "A great commander can bend even the vagaries of fate and fortune to their will, the better to ensure victory.",
      keywords: ["CORE"],
      unitTypes: ["any"],
      frequency: "once_per_phase"
    },
    {
      name: "Counter-offensive",
      cost: 2,
      type: "Core – Strategic Ploy Stratagem",
      phase: "fight",
      timing: "Fight phase, just after an enemy unit has fought.",
      target: "One unit from your army that is within Engagement Range of one or more enemy units and that has not already been selected to fight this phase.",
      effect: "Your unit fights next.",
      flavorText: "In close-quarters combat, the slightest hesitation can leave an opening for a swift foe to exploit.",
      keywords: ["CORE"],
      unitTypes: ["any"],
      frequency: "once_per_phase"
    },
    {
      name: "Epic Challenge",
      cost: 1,
      type: "Core – Epic Deed Stratagem",
      phase: "fight",
      timing: "Fight phase, when a CHARACTER unit from your army that is within Engagement Range of one or more Attached units is selected to fight.",
      target: "One CHARACTER model in your unit.",
      effect: "Until the end of the phase, all melee attacks made by that model have the [PRECISION] ability.",
      flavorText: "The legends of the 41st Millennium are replete with deadly duels between mighty champions.",
      keywords: ["CORE"],
      unitTypes: ["CHARACTER"],
      frequency: "once_per_phase"
    },
    {
      name: "Insane Bravery",
      cost: 1,
      type: "Core – Epic Deed Stratagem",
      phase: "command",
      timing: "Battle-shock step of your Command phase, just before you take a Battle-shock test for a unit from your army.",
      target: "That unit from your army.",
      effect: "Your unit automatically passes that Battle-shock test.",
      restrictions: "You cannot use this Stratagem more than once per battle.",
      flavorText: "Indifferent to their own survival, these warriors hold their ground against seemingly impossible odds.",
      keywords: ["CORE"],
      unitTypes: ["any"],
      frequency: "once_per_battle"
    },
    {
      name: "Grenade",
      cost: 1,
      type: "Core – Wargear Stratagem",
      phase: "shooting",
      timing: "Your Shooting phase.",
      target: "One GRENADES unit from your army (excluding units that Advanced, Fell Back or have shot this turn) that is not within Engagement Range of one or more enemy units.",
      effect: "Select one GRENADES model in your unit and one enemy unit that is not within Engagement Range of any units from your army and is within 8\" of and visible to your GRENADES model. Roll six D6: for each 4+, that enemy unit suffers 1 mortal wound.",
      flavorText: "Priming their hand-held projectiles, these warriors draw back and hurl death into the enemy's midst.",
      keywords: ["CORE"],
      unitTypes: ["GRENADES"],
      frequency: "once_per_phase"
    },
    {
      name: "Tank Shock",
      cost: 1,
      type: "Core – Strategic Ploy Stratagem",
      phase: "charge",
      timing: "Your Charge phase, just after a VEHICLE unit from your army ends a Charge move.",
      target: "That VEHICLE unit.",
      effect: "Select one enemy unit within Engagement Range of your unit, and select one VEHICLE model in your unit that is within Engagement Range of that enemy unit. Roll a number of D6 equal to the Toughness characteristic of the selected VEHICLE model. For each 5+, that enemy unit suffers 1 mortal wound (to a maximum of 6 mortal wounds).",
      flavorText: "Ramming the foe with a speeding vehicle may be an unsubtle tactic, but it is a murderously effective one.",
      keywords: ["CORE"],
      unitTypes: ["VEHICLE"],
      frequency: "once_per_phase"
    },
    {
      name: "Rapid Ingress",
      cost: 1,
      type: "Core – Strategic Ploy Stratagem",
      phase: "reactive",
      timing: "End of your opponent's Movement phase.",
      target: "One unit from your army that is in Reserves.",
      effect: "Your unit can arrive on the battlefield as if it were the Reinforcements step of your Movement phase, and if every model in that unit has the Deep Strike ability, you can set that unit up as described in the Deep Strike ability (even though it is not your Movement phase).",
      restrictions: "You cannot use this Stratagem to enable a unit to arrive on the battlefield during a battle round it would not normally be able to do so in.",
      flavorText: "Be it cunning strategy, potent technology or supernatural ritual, there are many means by which a commander may hasten their warriors' onset.",
      keywords: ["CORE"],
      unitTypes: ["any"],
      frequency: "once_per_phase"
    },
    {
      name: "Fire Overwatch",
      cost: 1,
      type: "Core – Strategic Ploy Stratagem",
      phase: "reactive",
      timing: "Your opponent's Movement or Charge phase, just after an enemy unit is set up or when an enemy unit starts or ends a Normal, Advance or Fall Back move, or declares a charge.",
      target: "One unit from your army that is within 24\" of that enemy unit and that would be eligible to shoot if it were your Shooting phase.",
      effect: "If that enemy unit is visible to your unit, your unit can shoot that enemy unit as if it were your Shooting phase.",
      restrictions: "You cannot target a TITANIC unit with this Stratagem. Until the end of the phase, each time a model in your unit makes a ranged attack, an unmodified Hit roll of 6 is required to score a hit, irrespective of the attacking weapon's Ballistic Skill or any modifiers. You can only use this Stratagem once per turn.",
      flavorText: "A hail of wildfire can drive back advancing foes.",
      keywords: ["CORE"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    },
    {
      name: "Go to Ground",
      cost: 1,
      type: "Core – Battle Tactic Stratagem",
      phase: "shooting",
      timing: "Your opponent's Shooting phase, just after an enemy unit has selected its targets.",
      target: "One INFANTRY unit from your army that was selected as the target of one or more of the attacking unit's attacks.",
      effect: "Until the end of the phase, all models in your unit have a 6+ invulnerable save and have the Benefit of Cover.",
      flavorText: "Seeking salvation from incoming fire, warriors hurl themselves into whatever cover they can find.",
      keywords: ["CORE"],
      unitTypes: ["INFANTRY"],
      frequency: "once_per_phase"
    },
    {
      name: "Smokescreen",
      cost: 1,
      type: "Core – Wargear Stratagem",
      phase: "shooting",
      timing: "Your opponent's Shooting phase, just after an enemy unit has selected its targets.",
      target: "One SMOKE unit from your army that was selected as the target of one or more of the attacking unit's attacks.",
      effect: "Until the end of the phase, all models in your unit have the Benefit of Cover and the Stealth ability.",
      flavorText: "Even the most skilled marksmen struggle to hit targets veiled by billowing screens of smoke.",
      keywords: ["CORE"],
      unitTypes: ["SMOKE"],
      frequency: "once_per_phase"
    },
    {
      name: "Heroic Intervention",
      cost: 1,
      type: "Core – Strategic Ploy Stratagem",
      phase: "reactive",
      timing: "Your opponent's Charge phase, just after an enemy unit ends a Charge move.",
      target: "One unit from your army that is within 6\" of that enemy unit and would be eligible to declare a charge against that enemy unit if it were your Charge phase.",
      effect: "Your unit now declares a charge that targets only that enemy unit, and you resolve that charge as if it were your Charge phase.",
      restrictions: "You can only select a VEHICLE unit from your army if it is a WALKER. Note that even if this charge is successful, your unit does not receive any Charge bonus this turn.",
      flavorText: "Voices raised in furious war cries, your warriors surge forth to meet the enemy's onslaught head-on.",
      keywords: ["CORE"],
      unitTypes: ["any"],
      frequency: "once_per_phase"
    }
  ];

  // Base de données complète des capacités et leurs phases correctes
  // ✅ TOUTES LES UNITÉS LEAGUES OF VOTANN SONT COUVERTES
  // 
  // UNITÉS ACTUELLEMENT DANS LE ROSTER :
  // - Einhyr Champion ✅
  // - Cthonian Beserks ✅  
  // - Einhyr Hearthguard ✅
  // - Hernkyn Yaegirs ✅
  // - Hernkyn Pioneers ✅
  // - Sagitaur ✅
  //
  // UNITÉS MANQUANTES MAIS ABILITÉS PRÉPARÉES :
  // - Kâhl (Leader avec Kindred Hero + 4+ inv save) ✅
  // - Hearthkyn Warriors (Luck Has, Need Keeps, Toil Earns) ✅
  // - Brôkhyr Iron-master (Multi-spectral visor + Brôkhyr's Guild) ✅
  // - Brôkhyr Thunderkyn (Oathband Covering Fire) ✅
  // - Hekaton Land Fortress (Fire Support + Damaged) ✅
  //
  const ABILITY_PHASE_MAPPING: { [key: string]: { phases: string[], description?: string, timing?: string, playerOnly?: boolean } } = {

    "Indomitable Heroes": {
      phases: ['shooting', 'fight'],
      timing: "When saving against attacks",
      description: "This model has a Feel No Pain 6+ ability. If this model is Honoured and has completed its Deed, it has a Feel No Pain 5+ ability instead.",
      playerOnly: false // Peut être utilisé pendant le tour adverse
    },
    "Lay Low The Tyrant": {
      phases: ['shooting', 'fight'],
      timing: "Each time this model is selected to shoot or fight",
      description: "You can re-roll one Hit roll and you can re-roll one Wound roll.",
      playerOnly: true
    },
    "Reclaim the Realm": {
      phases: ['movement', 'charge'],
      timing: "Passive",
      description: "Add 1\" to this model's Move characteristic and add 1 to Advance and Charge rolls made for this model.",
      playerOnly: true
    },
    "Ion Aegis (Aura)": {
      phases: [], // Capacité passive - pas besoin d'affichage spécifique
      timing: "Passive - While a friendly ARMIGER model is within 6\"",
      description: "While a friendly ARMIGER model is within 6\" of this model, that ARMIGER model has the Benefits of Cover."
    },
    "Overwhelming Firestorm": {
      phases: ['shooting'],
      timing: "In your Shooting phase, after this model has shot",
      description: "Select one enemy unit hit by this model this phase. That unit must take a Battle-shock test."
    },
    "Invulnerable Save (5+*)": {
      phases: ['shooting'], // Affiché pendant la phase de tir adverse
      timing: "When saving against ranged attacks",
      description: "This model has a 5+ invulnerable save against ranged attacks."
    },
    "Damaged: 1-10 Wounds Remaining": {
      phases: ['shooting', 'fight'],
      timing: "While this model has 1-10 wounds remaining",
      description: "Subtract 5 from this model's Objective Control characteristic and each time this model makes an attack, subtract 1 from the Hit roll."
    },
    "Damaged: 1-5 Wounds Remaining": {
      phases: ['shooting', 'fight'],
      timing: "While this model has 1-5 wounds remaining",
      description: "Subtract 3 from this model's Objective Control characteristic and each time this model makes an attack, subtract 1 from the Hit roll."
    },
    "Protection Protocols": {
      phases: ['charge'], // Pendant la phase de charge adverse
      timing: "Enemy Charge phase",
      description: "You can target this unit with the Heroic Intervention Stratagem for 0CP, and can do so even if you have already targeted a different unit with that Stratagem this phase."
    },
    "Impetuous Glory": {
      phases: ['charge'], // Se déclenche en charge, l'effet dure jusqu'à la fin du tour
      timing: "Each time this model makes a Charge move",
      description: "Until the end of the turn, melee weapons equipped by this model have the [SUSTAINED HITS 1] ability.",
      playerOnly: true // Seulement pendant le tour du joueur
    },
    "Mysterious Guardian": {
      phases: ['endofturn'], // À la fin du tour adverse
      timing: "Once per battle, at the end of your opponent's turn",
      description: "If the bearer is not within Engagement Range of any enemy units, it can fade away and return in your next Movement phase."
    },
    "Super-Heavy Walker": {
      phases: ['movement'],
      timing: "Each time this model makes a Normal, Advance or Fall Back move",
      description: "It can move through models and terrain features that are 4\" or less in height.",
      playerOnly: true
    },
    "Deadly Demise D6+2": {
      phases: ['any'], // Peut se déclencher à n'importe quel moment
      timing: "When this model is destroyed",
      description: "Roll one D6 before removing it from play. On a 6, each unit within 6\" suffers D6+2 mortal wounds.",
      playerOnly: false // Peut se déclencher pendant le tour adverse aussi
    },
    "Deadly Demise D3": {
      phases: ['any'], // Peut se déclencher à n'importe quel moment
      timing: "When this model is destroyed",
      description: "Roll one D6 before removing it from play. On a 6, each unit within 6\" suffers D3 mortal wounds.",
      playerOnly: false // Peut se déclencher pendant le tour adverse aussi
    },

    // EINHYR CHAMPION
    "Exemplar of the Einhyr": {
      phases: ['charge'],
      timing: "While leading a unit",
      description: "Re-roll Charge rolls made for that unit"
    },
    "Mass Driver Accelerators": {
      phases: ['charge'],
      timing: "Each time this model ends a Charge move",
      description: "Select one enemy unit in Engagement Range and roll D6 for mortal wounds"
    },
    
    // CTHONIAN BESERKS
    "Cyberstimms": {
      phases: ['fight'],
      timing: "Each time a model is destroyed by a melee attack",
      description: "If model has not fought this phase, roll D6: on 4+, it can fight after attacking unit finishes"
    },
    "Subterranean Explosives": {
      phases: ['shooting'],
      timing: "In your Shooting phase, after this unit has shot",
      description: "Select enemy unit hit by mole grenade launchers, roll D6: on 4+ that unit is shaken"
    },
    
    // EINHYR HEARTHGUARD
    "Oathband Bodyguard": {
      phases: [], // Capacité défensive pure - sera gérée par la logique automatique
      timing: "Each time an attack targets this unit (Defensive)",
      description: "While a CHARACTER is leading this unit: Subtract 1 from Wound rolls if attack Strength > unit Toughness"
    },
    "Teleport crest": {
      phases: ['deployment'], // Capacité de déploiement
      timing: "Deployment",
      description: "Models in bearer's unit have Deep Strike ability"
    },
    "Deep Strike": {
      phases: ['deployment', 'movement'],
      timing: "Declare Battle Formations step (deployment) or Reinforcements step of YOUR Movement phase",
      description: "During the Declare Battle Formations step, if every model in a unit has this ability, you can set it up in Reserves instead of setting it up on the battlefield. If you do, in the Reinforcements step of one of your Movement phases you can set up this unit anywhere on the battlefield that is more than 9\" horizontally away from all enemy models. If a unit with the Deep Strike ability arrives from Strategic Reserves, the controlling player can choose for that unit to be set up either using the rules for Strategic Reserves or using the Deep Strike ability."
    },
    
    // HERNKYN YAEGIRS - Capacité qui se déclenche pendant la phase de mouvement adverse
    "Pragmatic Hunters": {
      phases: ['movement'], // Affichée en Movement phase mais seulement pendant le tour adverse
      timing: "Once per turn, when enemy unit ends Normal/Advance/Fall Back move within 9\"",
      description: "If not in Engagement Range, can make Normal move up to D6\""
    },
    
    // HERNKYN PIONEERS - Capacité qui se déclenche pendant le tour adverse
    "Outflanking Mag-Riders": {
      phases: ['endofturn'], // Affichée en End of Turn mais seulement pendant le tour adverse
      timing: "At the end of your opponent's turn",
      description: "If within 6\" of battlefield edge and not in Engagement Range, can go into Strategic Reserves"
    },
    "Pan spectral scanner": {
      phases: ['shooting'],
      timing: "Passive",
      description: "Ranged weapons equipped by models in bearer's unit have [IGNORES COVER]"
    },
    "Pan-spectral scanner": {
      phases: ['shooting'],
      timing: "Passive", 
      description: "Ranged weapons equipped by models in bearer's unit have [IGNORES COVER]"
    },
    "Rollbar searchlight": {
      phases: ['shooting', 'fight'],
      timing: "When targeting units with Stealth",
      description: "Add 1 to Hit roll when targeting units with Stealth ability"
    },
    
    // HEKATON LAND FORTRESS
    "Fire Support": {
      phases: ['shooting'],
      timing: "In your Shooting phase, after this model has shot",
      description: "Friendly models that disembarked this turn can re-roll Wound rolls vs hit target"
    },
    "Damaged: 1-5 wounds remaining": {
      phases: ['shooting', 'fight'],
      timing: "While this model has 1-5 wounds remaining",
      description: "Each time this model makes an attack, subtract 1 from the Hit roll"
    },

    // KÂHL
    "Kindred Hero": {
      phases: ['shooting', 'fight'],
      timing: "While this model is leading a unit",
      description: "Weapons equipped by models in that unit have the [LETHAL HITS] ability"
    },
    
    // HEARTHKYN WARRIORS
    "Luck Has, Need Keeps, Toil Earns": {
      phases: ['command'],
      timing: "At the end of your Command phase",
      description: "If this unit is within range of an objective marker you control, that objective marker remains under your control, even if you have no models within range of it, until your opponent controls it"
    },
    
    // BRÔKHYR IRON-MASTER
    "Multi-spectral visor": {
      phases: ['shooting'],
      timing: "While this model is leading a unit",
      description: "Each time a model in that unit makes a ranged attack, add 1 to the Hit roll"
    },
    "Brôkhyr's Guild": {
      phases: ['movement'],
      timing: "At the end of your Movement phase",
      description: "This unit can repair one friendly LEAGUES OF VOTANN VEHICLE or EXO-FRAME model within 3\" - regains up to D3 lost wounds (or up to 3 if contains Ironkyn Assistant)"
    },
    
    // BRÔKHYR THUNDERKYN
    "Oathband Covering Fire": {
      phases: ['endofturn'], // Fire Overwatch se fait généralement à la fin du tour adverse
      timing: "When targeted with Fire Overwatch Stratagem",
      description: "Hits are scored on unmodified Hit rolls of 5+ when resolving Fire Overwatch"
    },
    
    // ÛTHAR THE DESTINED (personnage spécial)
    "Ancestral Fortune": {
      phases: ['shooting', 'fight'],
      timing: "Once per turn",
      description: "You can change one Hit roll or one Wound roll made for this model to an unmodified 6"
    },
    "The Destined": {
      phases: [], // Capacité défensive passive
      timing: "Each time an attack is allocated to this model",
      description: "Change the Damage characteristic of that attack to 1"
    },
    
    // SAGITAUR
    "Blistering Advance": {
      phases: ['movement'],
      timing: "After this TRANSPORT has Advanced",
      description: "Units can disembark and count as having made Normal move (cannot charge)"
    },
    
    // EQUIPEMENTS ET CRESTS
    "Weavefield crest": {
      phases: [], // Sauvegarde passive - pas besoin d'affichage spécifique
      timing: "Passive invulnerable save",
      description: "Bearer has 4+ invulnerable save"
    },
    
    // ENHANCEMENTS
    "Appraising Glare": {
      phases: ['command'],
      timing: "In your Command phase",
      description: "Select one objective marker your opponent controls - enemy units in range count as having +1 Judgement token"
    },
    "Grim Demeanour": {
      phases: ['command'], // Les tests de Battle-shock se font en Command phase
      timing: "Battle-shock tests (Command phase)",
      description: "Can re-roll Battle-shock tests and ignore modifiers to Characteristics (except saves)"
    },
    "Ancestral Sentence": {
      phases: ['shooting'],
      timing: "Shooting phase enhancement",
      description: "1CP stratagem enhancement for shooting attacks"
    },
    "A Long List": {
      phases: ['shooting', 'fight'],
      timing: "When bearer's unit destroys an enemy unit",
      description: "If destroyed enemy has Judgement tokens, select another visible enemy unit - it gains 1 Judgement token"
    },
    "Wayfarer's Grace": {
      phases: ['endofturn'],
      timing: "When bearer is destroyed",
      description: "First time destroyed: roll D6 at end of phase, on 2+ set back up with full wounds"
    },
    "Bastion Shield": {
      phases: ['shooting'],
      timing: "When unit is targeted by ranged attacks",
      description: "Ranged attacks within 12\" have AP worsened by 1"
    },
    "High Kâhl": {
      phases: ['fight'],
      timing: "When model destroyed by melee attack",
      description: "If not fought this phase, on 4+ can fight before being removed"
    },
    "Ironskein": {
      phases: ['passive'],
      timing: "Passive enhancement",
      description: "Add 2 to bearer's Wounds characteristic"
    },
    "Quake Multigenerator": {
      phases: ['shooting'],
      timing: "After shooting",
      description: "Select hit enemy unit (not TITANIC) - until next turn it's suppressed (-1 to Hit)"
    },
    
    // CRESTS SPÉCIAUX
    "Rampart crest": {
      phases: [], // Capacité défensive passive
      timing: "Passive defensive ability",
      description: "Defensive enhancement for units"
    },
    
    // ÉQUIPEMENTS SPÉCIAUX BRÔKHYR
    "Ironkyn Assistant": {
      phases: ['movement'],
      timing: "When repairing with Brôkhyr's Guild",
      description: "Increases repair from D3 to 3 wounds when Brôkhyr Iron-master repairs vehicles"
    },
    "E-COG": {
      phases: [], // Unité de soutien passive
      timing: "Support unit",
      description: "Support models for Brôkhyr Iron-master - destroyed if Iron-master dies"
    }
  };

    // Fonction intelligente pour déterminer si une capacité est pertinente pour la phase
  const isAbilityRelevantForPhase = (abilityName: string, abilityDescription: string, currentPhase: string, currentActivePlayer: string = activePlayer): boolean => {

    // FILTRE ABSOLU : Capacités qui ne doivent JAMAIS s'afficher dans les suggestions normales
    if (abilityName === 'Teleport crest' || abilityName === 'Code Chivalric') {
      return false;
    }
    
    // LOGIQUE SPÉCIALE POUR MYSTERIOUS GUARDIAN
    if (abilityName === 'Mysterious Guardian') {
      // Mysterious Guardian ne s'affiche qu'à la fin du tour adverse
      return currentPhase === 'endofturn' && currentActivePlayer === 'opponent';
    }
    
    // LOGIQUE SPÉCIALE POUR PROTECTION PROTOCOLS
    if (abilityName === 'Protection Protocols') {
      // Protection Protocols ne s'affiche que pendant la phase de charge adverse
      return currentPhase === 'charge' && currentActivePlayer === 'opponent';
    }
    
    // LOGIQUE SPÉCIALE POUR INVULNERABLE SAVE
    if (abilityName === 'Invulnerable Save (5+*)') {
      // Invulnerable Save ne s'affiche que pendant la phase de tir adverse
      return currentPhase === 'shooting' && currentActivePlayer === 'opponent';
    }
    
    // PREMIÈRE ÉTAPE : Vérifier universellement si c'est une capacité du tour adverse
    // Cette logique s'applique à TOUTES les capacités, qu'elles soient dans notre base de données ou pas
    const lowerDesc = abilityDescription.toLowerCase();
    const lowerName = abilityName.toLowerCase();
    
    // Détection des capacités du tour adverse (offensives adverses)
    const isOpponentTurnAbility = lowerDesc.includes('opponent\'s turn') || 
                                 lowerDesc.includes('end of your opponent\'s turn') ||
                                 lowerDesc.includes('during your opponent\'s turn') ||
                                 lowerDesc.includes('at the end of your opponent\'s turn') ||
                                 lowerDesc.includes('when an enemy unit') ||
                                 lowerDesc.includes('when enemy unit') ||
                                 lowerDesc.includes('once per turn, when an enemy') ||
                                 lowerDesc.includes('once per turn, when enemy') ||
                                 lowerDesc.includes('opponent\'s shooting phase') ||
                                 lowerDesc.includes('opponent\'s movement phase') ||
                                 lowerDesc.includes('opponent\'s charge phase') ||
                                 lowerDesc.includes('opponent\'s fight phase');
    
    // Détection STRICTE des capacités défensives (se déclenchent quand on est attaqué)
    const isDefensiveAbility = (lowerDesc.includes('when this unit is targeted') ||
                               lowerDesc.includes('when an attack targets this unit') ||
                               lowerDesc.includes('each time an attack targets this unit') ||
                               lowerDesc.includes('subtract from wound roll') ||
                               lowerDesc.includes('subtract 1 from the wound roll') ||
                               lowerName.includes('bodyguard')) &&
                               // EXCLURE les capacités offensives mal détectées
                               !lowerDesc.includes('in your shooting phase') &&
                               !lowerDesc.includes('ranged weapons equipped by') &&
                               !lowerDesc.includes('when this unit attacks') &&
                               !lowerDesc.includes('when this model attacks') &&
                               !lowerDesc.includes('add 1 to the hit roll') &&
                               !lowerDesc.includes('ignores cover');
    
    // Détection intelligente des aptitudes
    
    // LOGIQUE SPÉCIALE POUR LES CAPACITÉS DÉFENSIVES
    if (isDefensiveAbility) {
      // Les capacités défensives s'affichent quand l'unité peut être attaquée
      if (currentActivePlayer === 'opponent') {
        // Pendant le tour adverse : shooting et fight phases
        if (currentPhase === 'shooting' || currentPhase === 'fight') {
          return true;
        }
      } else {
        // Pendant notre tour : seulement fight phase (riposte adverse)
        if (currentPhase === 'fight') {
          return true;
        }
      }
      return false;
    }
    
    // Détection des capacités du tour adverse
    if (isOpponentTurnAbility) {
      // Si c'est une capacité du tour adverse, l'afficher seulement quand c'est le tour adverse
      if (currentActivePlayer !== 'opponent') {
        return false; // Ne JAMAIS afficher pendant notre tour
      }
      
      // C'est le tour adverse, déterminer dans quelle phase l'afficher
      if (lowerDesc.includes('end of your opponent\'s turn') || 
          lowerDesc.includes('at the end of your opponent\'s turn')) {
        return currentPhase === 'endofturn';
      }
      if (lowerDesc.includes('opponent\'s shooting phase')) {
        return currentPhase === 'shooting';
      }
      if (lowerDesc.includes('opponent\'s movement phase') || 
          lowerDesc.includes('when enemy unit ends') ||
          lowerDesc.includes('when an enemy unit ends')) {
        return currentPhase === 'movement';
      }
      if (lowerDesc.includes('opponent\'s charge phase')) {
        return currentPhase === 'charge';
      }
      if (lowerDesc.includes('opponent\'s fight phase')) {
        return currentPhase === 'fight';
      }
      // Par défaut pour les capacités du tour adverse qui ne spécifient pas la phase
      if (lowerDesc.includes('move') || lowerDesc.includes('movement')) {
        return currentPhase === 'movement';
      }
      // Sinon, End of Turn par défaut
      return currentPhase === 'endofturn';
    }
    
    // DEUXIÈME ÉTAPE : Vérifier dans notre base de données pour les capacités de notre tour
    const mapping = ABILITY_PHASE_MAPPING[abilityName];
    if (mapping) {
      // Vérification pour les capacités playerOnly
      if (mapping.playerOnly && currentActivePlayer !== 'player') {
        return false; // Ne pas afficher les capacités playerOnly pendant le tour adverse
      }
      
      // Les capacités de déploiement s'affichent en phase de commandement
      if (mapping.phases.includes('deployment')) {
        return currentPhase === 'command';
      }
      
      // Vérification spéciale pour les capacités du tour adverse dans la base de données
      // Même si elles sont dans la base de données, elles doivent respecter la logique des tours
      if (mapping.timing && (
        mapping.timing.toLowerCase().includes('opponent\'s turn') ||
        mapping.timing.toLowerCase().includes('end of your opponent\'s turn') ||
        mapping.timing.toLowerCase().includes('at the end of your opponent\'s turn')
      )) {
        // Cette capacité est du tour adverse selon notre base de données
        if (currentActivePlayer !== 'opponent') {
          return false; // Ne pas afficher pendant notre tour
        }
        // Afficher seulement pendant le tour adverse dans la bonne phase
        return mapping.phases.includes(currentPhase);
      }
      
      // VÉRIFICATION CRITIQUE : Les capacités offensives (notre tour) ne doivent PAS s'afficher pendant le tour adverse
      if (currentActivePlayer === 'opponent') {
        // Pendant le tour adverse, ne pas afficher les capacités offensives
        const lowerTiming = mapping.timing ? mapping.timing.toLowerCase() : '';
        const lowerAbilityDesc = abilityDescription.toLowerCase();
        
        const isOffensiveAbility = lowerTiming.includes('in your shooting phase') ||
          lowerTiming.includes('when this unit attacks') ||
          lowerTiming.includes('when this model attacks') ||
          lowerTiming.includes('passive') ||
          lowerTiming.includes('ranged weapons equipped by') ||
          lowerTiming.includes('when targeting') ||
          lowerTiming.includes('when shooting') ||
          lowerAbilityDesc.includes('ranged weapons equipped by') ||
          lowerAbilityDesc.includes('ignores cover') ||
          lowerAbilityDesc.includes('add 1 to the hit roll') ||
          lowerAbilityDesc.includes('add 1 to hit roll') ||
          lowerAbilityDesc.includes('re-roll wound roll') ||
          lowerAbilityDesc.includes('improve the armour penetration') ||
          lowerAbilityDesc.includes('after this model has shot') ||
          lowerAbilityDesc.includes('after this unit has shot') ||
          lowerName.includes('scanner') ||
          lowerName.includes('searchlight') ||
          lowerName.includes('sight') ||
          lowerName.includes('scope');
        
        if (isOffensiveAbility) {
          return false; // Ne JAMAIS afficher les capacités offensives pendant le tour adverse
        }
      }
      
      return mapping.phases.includes(currentPhase);
    }
    
    // VÉRIFICATION FINALE : Même si pas dans la base de données, vérifier si c'est offensif pendant le tour adverse
    if (currentActivePlayer === 'opponent') {
      const isGlobalOffensiveAbility = lowerDesc.includes('ranged weapons equipped by') ||
        lowerDesc.includes('ignores cover') ||
        lowerDesc.includes('add 1 to the hit roll') ||
        lowerDesc.includes('add 1 to hit roll') ||
        lowerDesc.includes('re-roll wound roll') ||
        lowerDesc.includes('improve the armour penetration') ||
        lowerDesc.includes('after this model has shot') ||
        lowerDesc.includes('after this unit has shot') ||
        lowerDesc.includes('in your shooting phase') ||
        lowerDesc.includes('when this unit attacks') ||
        lowerDesc.includes('when this model attacks') ||
        lowerName.includes('scanner') ||
        lowerName.includes('searchlight') ||
        lowerName.includes('sight') ||
        lowerName.includes('scope');
      
      if (isGlobalOffensiveAbility) {
        return false; // Ne JAMAIS afficher les capacités offensives pendant le tour adverse
      }
    }
    


    // Si pas dans la base de données, analyser la description avec une logique améliorée
    // MAIS SEULEMENT SI C'EST NOTRE TOUR ! Pendant le tour adverse, ne montrer QUE les capacités défensives ou du tour adverse
    if (currentActivePlayer === 'opponent') {
      // Pendant le tour adverse, ne rien afficher par défaut (sauf défensives déjà gérées ci-dessus)
      return false;
    }
    
    switch (currentPhase) {
      case 'command':
        return lowerDesc.includes('command phase') || 
               lowerDesc.includes('your command phase') ||
               lowerDesc.includes('at the start of your command phase') ||
               lowerDesc.includes('at the end of your command phase') ||
               lowerDesc.includes('in your command phase') ||
               lowerDesc.includes('start of') ||
               lowerDesc.includes('end of') ||
               lowerDesc.includes('beginning of') ||
               lowerDesc.includes('objective marker') ||
               lowerDesc.includes('battle-shock') ||
               lowerDesc.includes('leadership test') ||
               lowerDesc.includes('cp') ||
               lowerDesc.includes('command point');
               
      case 'movement':
        return lowerDesc.includes('move') || 
               lowerDesc.includes('advance') || 
               lowerDesc.includes('fall back') ||
               lowerDesc.includes('movement phase') ||
               lowerDesc.includes('at the end of your movement phase') ||
               lowerDesc.includes('after this transport has advanced') ||
               lowerDesc.includes('disembark') ||
               lowerDesc.includes('embark') ||
               lowerDesc.includes('repair') ||
               lowerDesc.includes('deep strike') ||
               lowerDesc.includes('reserves') ||
               lowerDesc.includes('deployment');
               
      case 'shooting':
        return lowerDesc.includes('shoot') || 
               lowerDesc.includes('shooting phase') ||
               lowerDesc.includes('ranged attack') ||
               lowerDesc.includes('ranged weapon') ||
               lowerDesc.includes('hit roll') || 
               lowerDesc.includes('ballistic skill') ||
               lowerDesc.includes('bs') ||
               lowerDesc.includes('ignores cover') ||
               lowerDesc.includes('precision') ||
               lowerDesc.includes('indirect fire') ||
               lowerDesc.includes('blast') ||
               lowerName.includes('sight') ||
               lowerName.includes('scope') ||
               lowerName.includes('scanner');
               
      case 'charge':
        return lowerDesc.includes('charge') || 
               lowerDesc.includes('charging') ||
               lowerDesc.includes('charge roll') ||
               lowerDesc.includes('charge move') ||
               lowerDesc.includes('declare a charge') ||
               lowerDesc.includes('ends a charge') ||
               lowerDesc.includes('when this model ends a charge move') ||
               lowerDesc.includes('charge phase') ||
               lowerName.includes('accelerator') ||
               lowerName.includes('momentum');
               
      case 'fight':
        return lowerDesc.includes('fight') || 
               lowerDesc.includes('combat') || 
               lowerDesc.includes('melee') ||
               lowerDesc.includes('fight phase') ||
               lowerDesc.includes('melee attack') ||
               lowerDesc.includes('weapon skill') ||
               lowerDesc.includes('ws') ||
               lowerDesc.includes('close combat') ||
               lowerDesc.includes('engagement range') ||
               lowerDesc.includes('fights first') ||
               lowerDesc.includes('fights last') ||
               lowerDesc.includes('destroyed by a melee attack') ||
               lowerName.includes('combat') ||
               lowerName.includes('duelist') ||
               lowerName.includes('fighter');
               
      case 'endofturn':
        return lowerDesc.includes('end of turn') || 
               lowerDesc.includes('end of the turn') ||
               lowerDesc.includes('at the end of') ||
               lowerDesc.includes('during the end phase') ||
               lowerName.includes('end');
               
      default:
        return true; // Afficher toutes les capacités si phase inconnue
    }
  };

  const parseArmyData = (jsonData: any) => {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const roster = data.roster || data;
      
      const units: any[] = [];
      const detachmentRules: any[] = [];
      let totalPoints = 0;

      if (roster.forces && roster.forces[0] && roster.forces[0].selections) {
        roster.forces[0].selections.forEach((selection: any) => {
          if (selection.type === 'model' || selection.type === 'unit') {
            const unit = {
              id: selection.id,
              name: selection.name,
              type: selection.type,
              profiles: selection.profiles || [],
              rules: selection.rules || [],
              selections: selection.selections || [],
              costs: selection.costs || [],
              categories: selection.categories || [],
              points: 0,
              modelCount: 0,
              totalWounds: 0,
              modelBreakdown: [] as Array<{name: string, count: number, wounds: number}>,
              stats: {
                M: '',
                T: '',
                SV: '',
                W: '',
                LD: '',
                OC: ''
              }
            };
            
            let unitTotalPoints = 0;
            const baseCost = selection.costs?.find((cost: any) => cost.name === 'pts');
            if (baseCost) {
              unitTotalPoints += baseCost.value;
            }
            
            const addSelectionCosts = (selections: any[]) => {
              if (!selections) return;
              selections.forEach((sel: any) => {
                const selCost = sel.costs?.find((cost: any) => cost.name === 'pts');
                if (selCost) {
                  unitTotalPoints += selCost.value;
                }
                if (sel.selections) {
                  addSelectionCosts(sel.selections);
                }
              });
            };
            
            addSelectionCosts(selection.selections);
            unit.points = unitTotalPoints;
            totalPoints += unitTotalPoints;

            // Calculer le nombre de modèles et les PV totaux
            const calculateModelsAndWounds = (selection: any) => {
              let totalModels = 0;
              let totalWounds = 0;
              let modelBreakdown: Array<{name: string, count: number, wounds: number}> = [];
              
              // Compter les modèles directs de l'unité
              if (selection.type === 'model' && selection.number) {
                const profile = selection.profiles?.find((p: any) => p.typeName === 'Unit');
                const wounds = profile ? parseInt(profile.characteristics?.find((c: any) => c.name === 'W')?.$text || '1') : 1;
                totalModels += selection.number;
                totalWounds += selection.number * wounds;
                modelBreakdown.push({
                  name: selection.name,
                  count: selection.number,
                  wounds: wounds
                });
              }
              
              // Compter les modèles dans les sélections
              if (selection.selections) {
                selection.selections.forEach((sel: any) => {
                  if (sel.type === 'model' && sel.number) {
                    const profile = sel.profiles?.find((p: any) => p.typeName === 'Unit');
                    const wounds = profile ? parseInt(profile.characteristics?.find((c: any) => c.name === 'W')?.$text || '1') : 1;
                    totalModels += sel.number;
                    totalWounds += sel.number * wounds;
                    modelBreakdown.push({
                      name: sel.name,
                      count: sel.number,
                      wounds: wounds
                    });
                  }
                });
              }
              
              return { totalModels, totalWounds, modelBreakdown };
            };
            
            const modelInfo = calculateModelsAndWounds(selection);
            unit.modelCount = modelInfo.totalModels;
            unit.totalWounds = modelInfo.totalWounds;
            unit.modelBreakdown = modelInfo.modelBreakdown;

            const unitProfile = selection.profiles?.find((p: any) => p.typeName === 'Unit');
            if (unitProfile) {
              unit.stats = {
                M: unitProfile.characteristics?.find((c: any) => c.name === 'M')?.$text || '',
                T: unitProfile.characteristics?.find((c: any) => c.name === 'T')?.$text || '',
                SV: unitProfile.characteristics?.find((c: any) => c.name === 'SV')?.$text || '',
                W: unitProfile.characteristics?.find((c: any) => c.name === 'W')?.$text || '',
                LD: unitProfile.characteristics?.find((c: any) => c.name === 'LD')?.$text || '',
                OC: unitProfile.characteristics?.find((c: any) => c.name === 'OC')?.$text || ''
              };
            } else {
              // Debug: chercher les profils dans les sélections pour les unités sans profil direct
              if (selection.name && selection.name.toLowerCase().includes('beser')) {
                console.log('🔍 Beserks debug:', {
                  name: selection.name,
                  profiles: selection.profiles,
                  selections: selection.selections?.map((s: any) => ({
                    name: s.name,
                    type: s.type,
                    profiles: s.profiles
                  }))
                });
              }
              
              // Chercher le profil dans les sélections
              if (selection.selections) {
                for (const sel of selection.selections) {
                  const subProfile = sel.profiles?.find((p: any) => p.typeName === 'Unit');
                  if (subProfile) {
                    unit.stats = {
                      M: subProfile.characteristics?.find((c: any) => c.name === 'M')?.$text || '',
                      T: subProfile.characteristics?.find((c: any) => c.name === 'T')?.$text || '',
                      SV: subProfile.characteristics?.find((c: any) => c.name === 'SV')?.$text || '',
                      W: subProfile.characteristics?.find((c: any) => c.name === 'W')?.$text || '',
                      LD: subProfile.characteristics?.find((c: any) => c.name === 'LD')?.$text || '',
                      OC: subProfile.characteristics?.find((c: any) => c.name === 'OC')?.$text || ''
                    };
                    break;
                  }
                }
              }
            }
            
            // Chercher les sauvegardes invulnérables dans les équipements
            const findInvulnerableSave = (selections: any[]): string | null => {
              if (!selections) return null;
              
              for (const sel of selections) {
                // Debug: afficher les informations de la sélection
                if (sel.name && sel.name.toLowerCase().includes('weavefield')) {
                  console.log('🔍 Weavefield trouvé:', {
                    name: sel.name,
                    rules: sel.rules,
                    profiles: sel.profiles
                  });
                }
                
                // Chercher dans les règles de l'équipement
                if (sel.rules) {
                  for (const rule of sel.rules) {
                    if (rule.description) {
                      console.log('🔍 Règle trouvée:', rule.name, rule.description);
                      const invulnMatch = rule.description.match(/(\d+)\+\s+invulnerable\s+save/i);
                      if (invulnMatch) {
                        console.log('✅ Invuln trouvé dans règle:', invulnMatch[1]);
                        return invulnMatch[1] + '++';
                      }
                    }
                  }
                }
                
                // Chercher dans les profiles de l'équipement
                if (sel.profiles) {
                  for (const profile of sel.profiles) {
                    if (profile.characteristics) {
                      for (const char of profile.characteristics) {
                        if (char.name === 'Description' && char.$text) {
                          console.log('🔍 Description profile trouvée:', char.$text);
                          const invulnMatch = char.$text.match(/(\d+)\+\s+invulnerable\s+save/i);
                          if (invulnMatch) {
                            console.log('✅ Invuln trouvé dans profile:', invulnMatch[1]);
                            return invulnMatch[1] + '++';
                          }
                        }
                      }
                    }
                  }
                }
                
                // Chercher récursivement dans les sous-sélections
                const subResult = findInvulnerableSave(sel.selections);
                if (subResult) return subResult;
              }
              
              return null;
            };
            
            const invulnSave = findInvulnerableSave(selection.selections);
            
            // Chercher les sauvegardes Feel No Pain dans les règles
            const findFeelNoPain = (unit: any): string | null => {
              // Chercher dans les règles directes de l'unité
              if (unit.rules) {
                for (const rule of unit.rules) {
                  if (rule.name && rule.name.toLowerCase().includes('feel no pain')) {
                    const fnpMatch = rule.name.match(/feel no pain (\d+)\+/i);
                    if (fnpMatch) {
                      return fnpMatch[1] + '+++';
                    }
                  }
                }
              }
              
              // Chercher dans les profiles des abilities
              if (unit.profiles) {
                for (const profile of unit.profiles) {
                  if (profile.typeName === 'Abilities' && profile.name && profile.name.toLowerCase().includes('feel no pain')) {
                    const fnpMatch = profile.name.match(/feel no pain (\d+)\+/i);
                    if (fnpMatch) {
                      return fnpMatch[1] + '+++';
                    }
                  }
                }
              }
              
              // Chercher dans les selections et leurs profiles
              if (unit.selections) {
                for (const sel of unit.selections) {
                  if (sel.profiles) {
                    for (const profile of sel.profiles) {
                      if (profile.typeName === 'Abilities' && profile.name && profile.name.toLowerCase().includes('feel no pain')) {
                        const fnpMatch = profile.name.match(/feel no pain (\d+)\+/i);
                        if (fnpMatch) {
                          return fnpMatch[1] + '+++';
                        }
                      }
                    }
                  }
                }
              }
              
              return null;
            };
            
            const fnpSave = findFeelNoPain(unit);
            
            // Construire l'affichage des sauvegardes
            let saveDisplay = unit.stats.SV;
            if (invulnSave) {
              saveDisplay += `/${invulnSave}`;
            }
            if (fnpSave) {
              saveDisplay += `/${fnpSave}`;
            }
            unit.stats.SV = saveDisplay;

            units.push(unit);
          }

          if (selection.name === 'Detachment Choice' && selection.selections) {
            selection.selections.forEach((det: any) => {
              if (det.rules) {
                detachmentRules.push(...det.rules);
              }
            });
          }
        });
      }

      return {
        name: roster.name || 'Armée',
        totalPoints,
        units,
        detachmentRules,
        factionRules: (() => {
          // Extraire les règles d'armée depuis forces[0].rules ET forces[0].selections
          const factionRules: any[] = [];
          console.log('🔍 DEBUG PARSING: roster.forces[0].rules:', roster.forces?.[0]?.rules);
          
          // Règles directes de forces[0].rules
          if (roster.forces && roster.forces[0] && roster.forces[0].rules) {
            roster.forces[0].rules.forEach((rule: any) => {
              console.log('🔍 DEBUG PARSING: Règle trouvée (directe):', rule.name);
              factionRules.push({
                name: rule.name,
                description: rule.description
              });
            });
          }
          
          // Règles dans les sélections (comme "Noble Lance")
          if (roster.forces && roster.forces[0] && roster.forces[0].selections) {
            roster.forces[0].selections.forEach((selection: any) => {
              // Règles directes de la sélection
              if (selection.rules) {
                selection.rules.forEach((rule: any) => {
                  console.log('🔍 DEBUG PARSING: Règle trouvée (sélection):', rule.name);
                  factionRules.push({
                    name: rule.name,
                    description: rule.description
                  });
                });
              }
              
              // Règles dans les sous-sélections (comme dans "Noble Lance")
              if (selection.selections) {
                selection.selections.forEach((subSelection: any) => {
                  if (subSelection.rules) {
                    subSelection.rules.forEach((rule: any) => {
                      console.log('🔍 DEBUG PARSING: Règle trouvée (sous-sélection):', rule.name);
                      factionRules.push({
                        name: rule.name,
                        description: rule.description
                      });
                    });
                  }
                });
              }
            });
          }
          
          console.log('🔍 DEBUG PARSING: factionRules final:', factionRules);
          return factionRules;
        })()
      };
    } catch (error) {
      console.error('Erreur parsing JSON:', error);
      return null;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        const parsed = parseArmyData(content);
        if (parsed) {
          setArmyData(parsed);
          
          setUnitHealth(prevHealth => {
            const healthState: Record<string, number> = { ...prevHealth };
            parsed.units.forEach((unit: any) => {
              // Utiliser les PV totaux de l'unité (tous modèles confondus)
              const totalWounds = unit.totalWounds || parseInt(unit.stats?.W) || 1;
              // Ne réinitialiser que si l'unité n'existe pas déjà
              if (!(unit.id in healthState)) {
                healthState[unit.id] = totalWounds;
              }
            });
            return healthState;
          });
          
          setCommandPoints(1);
          setGameState('first-player');
        }
      } catch (error) {
        alert('Erreur lors de la lecture du fichier');
      }
    };
    reader.readAsText(file);
  };

  const loadPresetArmy = async (armyName: string) => {
    try {
      const response = await fetch(`/${armyName}.json`);
      const content = await response.text();
      const parsed = parseArmyData(content);
      if (parsed) {
        setArmyData(parsed);
        
        setUnitHealth(prevHealth => {
          const healthState: Record<string, number> = { ...prevHealth };
          parsed.units.forEach((unit: any) => {
            const totalWounds = unit.totalWounds || parseInt(unit.stats?.W) || 1;
            if (!(unit.id in healthState)) {
              healthState[unit.id] = totalWounds;
            }
          });
          return healthState;
        });
        
        setCommandPoints(1);
        setGameState('first-player');
      }
    } catch (error) {
      alert(`Erreur lors du chargement de ${armyName}`);
    }
  };

  const startGame = (firstPlayer: string) => {
    setActivePlayer(firstPlayer);
    setGameState('deployment');
  };

  const startBattlePhase = () => {
    setGameState('battle-start');
  };

  const startScoutsPhase = () => {
    setGameState('scouts');
  };

  const startFirstTurn = () => {
    setGameState('playing');
  };

  const getInfiltratorsUnits = () => {
    if (!armyData) return [];
    return armyData.units.filter((unit: any) => {
      return unit.rules?.some((rule: any) => rule.name === 'Infiltrators');
    });
  };

  const getDeepStrikeUnits = () => {
    if (!armyData) return [];
    console.log('🔍 Recherche unités Deep Strike...');
    
    // Fonction récursive pour chercher dans toutes les sélections et sous-sélections
    const searchInSelections = (selections: any[], level = 0): boolean => {
      if (!selections) return false;
      
      for (const selection of selections) {
        const indent = '  '.repeat(level + 1);
        console.log(`${indent}🔍 Selection (niveau ${level}):`, selection.name);
        
        // Vérifier le nom
        if (selection.name && selection.name.toLowerCase().includes('teleport')) {
          console.log(`${indent}✅ TELEPORT TROUVÉ!`, selection.name);
          return true;
        }
        
        // Vérifier dans les profiles
        if (selection.profiles) {
          for (const profile of selection.profiles) {
            if (profile.characteristics) {
              for (const char of profile.characteristics) {
                if (char.name === 'Description' && char.$text && char.$text.toLowerCase().includes('deep strike ability')) {
                  console.log(`${indent}✅ DEEP STRIKE ABILITY TROUVÉ!`, selection.name, char.$text);
                  return true;
                }
              }
            }
          }
        }
        
        // Chercher récursivement dans les sous-sélections
        if (selection.selections && searchInSelections(selection.selections, level + 1)) {
          return true;
        }
      }
      
      return false;
    };
    
    const result = armyData.units.filter((unit: any) => {
      console.log('🔍 Analyse unité:', unit.name);
      
      const hasTeleportCrest = searchInSelections(unit.selections);
      
      if (hasTeleportCrest) {
        console.log('  ✅ Unité avec Deep Strike trouvée:', unit.name);
      }
      
      return hasTeleportCrest;
    }).map((unit: any) => {
      return {
        ...unit,
        deepStrikeSource: 'Teleport crest'
      };
    });
    
    console.log('🔍 Résultat final Deep Strike:', result.length, 'unités trouvées');
    return result;
  };

  const getScoutsUnits = () => {
    if (!armyData) return [];
    return armyData.units.filter((unit: any) => {
      return unit.rules?.some((rule: any) => rule.name && rule.name.includes('Scouts'));
    }).map((unit: any) => {
      const scoutsRule = unit.rules.find((rule: any) => rule.name && rule.name.includes('Scouts'));
      const match = scoutsRule?.name?.match(/Scouts (\d+)/);
      const distance = match ? match[1] : '?';
      return {
        ...unit,
        scoutsDistance: distance,
        scoutsRule: scoutsRule
      };
    });
  };

  const getBattleStartRules = () => {
    if (!armyData) return [];
    const battleStartRules: any[] = [];
    const seenRules = new Set();
    
    // Détecter si c'est une armée Imperial Knights
    const isImperialKnights = armyData?.forces?.[0]?.selections?.some((selection: any) => 
      selection.categories?.some((cat: any) => cat.name === 'Faction: Imperial Knights')
    );
    
    // Code Chivalric pour Imperial Knights
    // Essayer aussi de détecter via les unités
    const isImperialKnightsViaUnits = armyData?.units?.some((unit: any) => 
      unit.categories?.some((cat: any) => cat.name === 'Faction: Imperial Knights')
    );
    
    if ((isImperialKnights || isImperialKnightsViaUnits) && !seenRules.has('Code Chivalric')) {
      battleStartRules.push({
        source: 'Faction: Imperial Knights',
        name: 'Code Chivalric',
        description: 'If your Army Faction is IMPERIAL KNIGHTS, at the end of the Read Mission Objectives step, you must select one of the Oaths below to be active for your army. Models from your army with this ability gain the associated Oath ability, and you gain the associated Deed to complete.\n\nLay Low The Tyrant\n- Oath Ability: Each time this model is selected to shoot or fight, you can re-roll one Hit roll and you can re-roll one Wound roll.\n- Deed: This deed is completed if the enemy WARLORD is destroyed.\n\nReclaim the Realm\n- Oath Ability: Add 1" to this model\'s Move characteristic and add 1 to Advance and Charge rolls made for this model.\n- Deed: This deed is completed if you control one or more objective markers in your opponent\'s deployment zone.',
        priority: 1
      });
      seenRules.add('Code Chivalric');
    }
    
    armyData.units?.forEach((unit: any) => {
      unit.rules?.forEach((rule: any) => {
        if (rule.name === 'Eye of the Ancestors' && !seenRules.has(rule.name)) {
          battleStartRules.push({
            source: 'Faction: Leagues of Votann',
            name: rule.name,
            description: rule.description,
            priority: 2
          });
          seenRules.add(rule.name);
        }
      });
    });
    
    armyData.detachmentRules?.forEach((rule: any) => {
      if (rule.name === 'Ruthless Efficiency' && !seenRules.has(rule.name)) {
        battleStartRules.push({
          source: 'Détachement',
          name: rule.name,
          description: rule.description,
          priority: 3
        });
        seenRules.add(rule.name);
      }
    });
    
    return battleStartRules.sort((a, b) => a.priority - b.priority);
  };

  const toggleRuleExpansion = (ruleIndex: number) => {
    setExpandedRules(prev => ({
      ...prev,
      [ruleIndex]: !prev[ruleIndex]
    }));
  };

    // Fonction pour obtenir les stratagèmes applicables à une unité
  const getApplicableStratagems = (unit: any, phase: string, currentActivePlayer: string) => {
    if (!unit) return [];

    // Détecter si c'est une armée Imperial Knights
    const isImperialKnights = armyData?.forces?.[0]?.selections?.some((selection: any) => 
      selection.categories?.some((cat: any) => cat.name === 'Faction: Imperial Knights')
    ) || unit.categories?.some((cat: any) => cat.name === 'Faction: Imperial Knights');



    // Choisir les stratagèmes appropriés (stratagèmes communs + stratagèmes d'armée)
    const armyStratagems = isImperialKnights ? IMPERIAL_KNIGHTS_STRATAGEMS : LEAGUES_STRATAGEMS;
    const allStratagems = [...CORE_STRATAGEMS, ...armyStratagems];


    return allStratagems.filter(stratagem => {

      
      // Filtrer par phase - gérer les phases multiples séparées par des virgules
      const stratagemPhases = stratagem.phase.split(',').map((p: string) => p.trim());
      const phaseMatch = stratagemPhases.includes(phase) || stratagem.phase === "any";
      
      if (!phaseMatch) {
        return false;
      }
      
      // Gestion des stratagèmes réactifs (stratagèmes communs)
      if (stratagem.phase === "reactive") {
        // RAPID INGRESS - Seulement pour les unités avec Deep Strike
        if (stratagem.name === "Rapid Ingress") {
          // Vérifier si l'unité a Deep Strike
          const hasDeepStrike = unit.rules?.some((rule: any) => 
            rule.name === 'Deep Strike' || 
            (rule.description && rule.description.toLowerCase().includes('deep strike'))
          );
          return hasDeepStrike;
        }
        
        // FIRE OVERWATCH - Disponible pour toutes les unités qui peuvent tirer
        if (stratagem.name === "Fire Overwatch") {
          return true; // Disponible pour toutes les unités
        }
        
        // HEROIC INTERVENTION - Disponible pour toutes les unités
        if (stratagem.name === "Heroic Intervention") {
          return true; // Disponible pour toutes les unités
        }
        
        // Les autres stratagèmes réactifs ne s'affichent pas dans les suggestions de phase normale
        return false;
      }
      
      // Gestion spéciale pour les stratagèmes communs
      if (stratagem.keywords?.includes("CORE")) {
        // INSANE BRAVERY - Seulement dans MA Command phase
        if (stratagem.name === "Insane Bravery") {
          return phase === "command" && currentActivePlayer === 'player';
        }
        
        // Les autres stratagèmes communs suivent la logique normale
      }
      
      // Gestion spéciale pour "endofturn" - afficher en phase "command" du tour suivant
      if (stratagem.phase === "endofturn") {
        return phase === "command" && currentActivePlayer === 'player';
      }
      
      // GESTION DES STRATAGEMES IMPERIAL KNIGHTS (OFFICIEL - Wahapedia)
      if (isImperialKnights) {
        // SQUIRES' DUTY - Phase Shooting ou Fight (ARMIGER uniquement)
        if (stratagem.name === "Squires' Duty") {
          const unitKeywords = unit.categories?.map((cat: any) => cat.name.toLowerCase()) || [];
          const isArmiger = unitKeywords.includes("armiger");
          return (phase === "shooting" || phase === "fight") && currentActivePlayer === 'player' && isArmiger;
        }
        
        // ROTATE ION SHIELDS - Seulement quand l'ennemi tire sur vous
        if (stratagem.name === "Rotate Ion Shields") {
          return phase === "shooting" && currentActivePlayer === 'opponent';
        }
        
        // THUNDERSTOMP - Phase Fight
        if (stratagem.name === "Thunderstomp") {
          return phase === "fight" && currentActivePlayer === 'player';
        }
        
        // VALIANT LAST STAND - Phase Fight (quand un modèle est détruit)
        if (stratagem.name === "Valiant Last Stand") {
          return phase === "fight";
        }
        
        // TROPHY CLAIM - VOTRE Shooting phase ou LA Fight phase (votre tour ET tour adverse)
        if (stratagem.name === "Trophy Claim") {
          const shouldShow = (phase === "shooting" && currentActivePlayer === 'player') || phase === "fight";
          return shouldShow;
        }
        
        // SHOULDER THE BURDEN - VOTRE Command phase
        if (stratagem.name === "Shoulder the Burden") {
          return phase === "command" && currentActivePlayer === 'player';
        }
        
        // Vérifier si le stratagème s'applique au type d'unité
        if (stratagem.unitTypes.includes("any")) return true;
        
        // Vérifier les mots-clés de l'unité
        const unitKeywords = unit.categories?.map((cat: any) => cat.name.toLowerCase()) || [];
        
        // Vérifier chaque type d'unité requis par le stratagème
        for (const unitType of stratagem.unitTypes) {
          if (unitType === "Vehicle" && unitKeywords.includes("vehicle")) {
            return true;
          }
          if (unitType === "ARMIGER" && unitKeywords.includes("armiger")) {
            return true;
          }
          if (unitType === "exo-armour" && unitKeywords.includes("exo-armour")) {
            return true;
          }
        }
        
        return false;
      } else {
        // STRATAGEMES LEAGUES OF VOTANN
        // VOID ARMOUR - Peut être utilisé quand vos unités sont ciblées
        if (stratagem.name === "Void Armour") {
          if (currentActivePlayer === 'opponent') {
            // Tour adverse : shooting et fight phases (quand l'ennemi attaque)
            return phase === "shooting" || phase === "fight";
          } else {
            // Votre tour : seulement fight phase (quand l'ennemi riposte)
            return phase === "fight";
          }
        }
        
        // REACTIVE REPRISAL - Seulement pendant Enemy Shooting phase
        if (stratagem.name === "Reactive Reprisal") {
          if (currentActivePlayer === 'opponent' && phase === "shooting") {
            return true;
          }
          return false;
        }
        
        // STRATAGEMES OFFENSIFS - seulement pendant VOTRE tour
        const offensiveStratagems = ["Ancestral Sentence", "Ordered Retreat"];
        if (offensiveStratagems.includes(stratagem.name)) {
          if (currentActivePlayer === 'opponent') {
            console.log(`🚫 STRATAGÈME OFFENSIF "${stratagem.name}" bloqué pendant le tour adverse`);
            return false; // Ne pas afficher pendant le tour adverse
          }
        }
        
        // Vérifier si le stratagème s'applique au type d'unité
        if (stratagem.unitTypes.includes("any")) return true;
        
        // Vérifier les mots-clés de l'unité
        const unitKeywords = unit.categories?.map((cat: any) => cat.name.toLowerCase()) || [];
        
        if (stratagem.unitTypes.includes("exo-armour")) {
          return unitKeywords.includes("exo-armour");
        }
        
        // Par défaut, applicable à toutes les unités Leagues of Votann
        return unitKeywords.includes("faction: leagues of votann");
      }
    });
  };

  // Fonction pour extraire les armes d'une unité
  const getUnitWeapons = (unit: any) => {
    if (!unit || !unit.selections) return { ranged: [], melee: [] };
    
    const rangedWeapons: any[] = [];
    const meleeWeapons: any[] = [];
    
    const extractWeapons = (selections: any[]) => {
      selections.forEach((selection: any) => {
        // Vérifier si c'est une arme
        if (selection.profiles) {
          selection.profiles.forEach((profile: any) => {
            if (profile.typeName === 'Ranged Weapons') {
              const quantity = selection.number || 1;
              const weaponName = quantity > 1 ? `${profile.name} (x${quantity})` : profile.name;
              
              rangedWeapons.push({
                name: weaponName,
                range: profile.characteristics?.find((c: any) => c.name === 'Range')?.$text || '-',
                attacks: profile.characteristics?.find((c: any) => c.name === 'A')?.$text || '-',
                ballisticSkill: profile.characteristics?.find((c: any) => c.name === 'BS')?.$text || '-',
                strength: profile.characteristics?.find((c: any) => c.name === 'S')?.$text || '-',
                armourPenetration: profile.characteristics?.find((c: any) => c.name === 'AP')?.$text || '-',
                damage: profile.characteristics?.find((c: any) => c.name === 'D')?.$text || '-',
                keywords: profile.characteristics?.find((c: any) => c.name === 'Keywords')?.$text || '-'
              });
            } else if (profile.typeName === 'Melee Weapons') {
              const quantity = selection.number || 1;
              const weaponName = quantity > 1 ? `${profile.name} (x${quantity})` : profile.name;
              
              meleeWeapons.push({
                name: weaponName,
                range: profile.characteristics?.find((c: any) => c.name === 'Range')?.$text || '-',
                attacks: profile.characteristics?.find((c: any) => c.name === 'A')?.$text || '-',
                weaponSkill: profile.characteristics?.find((c: any) => c.name === 'WS')?.$text || '-',
                strength: profile.characteristics?.find((c: any) => c.name === 'S')?.$text || '-',
                armourPenetration: profile.characteristics?.find((c: any) => c.name === 'AP')?.$text || '-',
                damage: profile.characteristics?.find((c: any) => c.name === 'D')?.$text || '-',
                keywords: profile.characteristics?.find((c: any) => c.name === 'Keywords')?.$text || '-'
              });
            }
          });
        }
        
        // Récursion pour les sélections imbriquées
        if (selection.selections) {
          extractWeapons(selection.selections);
        }
      });
    };
    
    extractWeapons(unit.selections);
    
    return { ranged: rangedWeapons, melee: meleeWeapons };
  };

  // Fonction pour détecter les unités qui doivent faire des tests de Battle-shock
  const getBattleShockUnits = () => {
    if (!armyData) return [];
    
    const battleShockUnits: any[] = [];
    
    armyData.units?.forEach((unit: any) => {
      const maxWounds = unit.totalWounds || parseInt(unit.stats?.W) || 1;
      const currentWounds = unitHealth[unit.id] !== undefined ? unitHealth[unit.id] : maxWounds;
      const halfWounds = Math.ceil(maxWounds / 2);
      
      // Unité Below Half-strength et encore vivante
      if (currentWounds > 0 && currentWounds < halfWounds) {
        const leadership = unit.stats?.LD || '7+';
        battleShockUnits.push({
          name: unit.name,
          currentWounds: currentWounds,
          totalWounds: maxWounds,
          leadership: leadership,
          id: unit.id
        });
      }
    });
    
    return battleShockUnits;
  };

  // Fonction pour générer les suggestions intelligentes


  const generateSuggestions = () => {
    const newSuggestions: any[] = [];
    const seenAbilities = new Set<string>(); // Pour éviter les doublons
    
    // Tests de Battle-shock à effectuer en Command phase
    if (currentPhase === 'command') {
      const battleShockUnits = getBattleShockUnits();
      if (battleShockUnits.length > 0) {
        newSuggestions.push({
          id: 'battle-shock-tests',
          text: `⚠️ Tests de Battle-shock requis pour ${battleShockUnits.length} unité(s)`,
          detail: `Unités Below Half-strength qui doivent faire un test de Battle-shock :\n\n${battleShockUnits.map(unit => 
            `• ${unit.name}: ${unit.currentWounds}/${unit.totalWounds} W restantes (LD ${unit.leadership})`
          ).join('\n')}\n\n📋 Règle: Lancez 2D6. Si le résultat ≥ Leadership, l'unité est Battle-shocked.`,
          type: 'battle-shock',
          phase: 'command',
          timing: 'Début de Command phase'
        });
      }
    }

    // Suggestions spéciales pour Imperial Knights
    const isImperialKnights = armyData?.forces?.[0]?.selections?.some((selection: any) => 
      selection.categories?.some((cat: any) => cat.name === 'Faction: Imperial Knights')
    );
    
    // Essayer aussi de détecter via les unités (comme dans getBattleStartRules)
    const isImperialKnightsViaUnits = armyData?.units?.some((unit: any) => 
      unit.categories?.some((cat: any) => cat.name === 'Faction: Imperial Knights')
    );
    
    const finalIsImperialKnights = isImperialKnights || isImperialKnightsViaUnits;
    
    console.log('🔍 DEBUG: finalIsImperialKnights:', finalIsImperialKnights);
    console.log('🔍 DEBUG: armyData?.forces?.[0]?.rules:', armyData?.forces?.[0]?.rules);
    console.log('🔍 DEBUG: Structure complète de forces[0]:', armyData?.forces?.[0]);
    console.log('🔍 DEBUG: Toutes les propriétés de forces[0]:', Object.keys(armyData?.forces?.[0] || {}));
    console.log('🔍 DEBUG: Structure complète de armyData:', armyData);
    console.log('🔍 DEBUG: Propriétés de armyData:', Object.keys(armyData || {}));
    console.log('🔍 DEBUG: armyData.forces:', armyData?.forces);
    console.log('🔍 DEBUG: armyData.factionRules:', armyData?.factionRules);
    console.log('🔍 DEBUG: armyData.detachmentRules:', armyData?.detachmentRules);
    
    // TRAITEMENT DES RÈGLES D'ARMÉE (applicables à toutes les unités)
    if (finalIsImperialKnights && armyData?.factionRules) {
      console.log('🔍 DEBUG: Traitement des règles d\'armée Imperial Knights');
      console.log('🔍 DEBUG: Règles d\'armée trouvées:', armyData.factionRules.map((r: any) => r.name));
      
      armyData.factionRules.forEach((armyRule: any) => {
        const ruleName = armyRule.name;
        const ruleDescription = armyRule.description || 'Règle d\'armée';
        
        console.log(`🔍 DEBUG: Traitement de la règle d'armée: ${ruleName}`);
        
        // Traiter spécifiquement "Indomitable Heroes"
        if (ruleName === 'Indomitable Heroes') {
          console.log('🔍 DEBUG: Indomitable Heroes trouvé!');
          console.log('🔍 DEBUG: Phase actuelle:', currentPhase);
          console.log('🔍 DEBUG: Joueur actif:', activePlayer);
          
          // Indomitable Heroes s'applique seulement quand l'unité peut subir des dégâts (pas pendant votre tour d'attaque)
          const phaseCheck = (currentPhase === 'shooting' || currentPhase === 'fight');
          
          // Feel No Pain s'active seulement quand vous subissez des dégâts, pas quand vous attaquez
          const playerCheck = (
            (currentPhase === 'shooting' && activePlayer === 'opponent') || // Ennemi tire sur vous
            (currentPhase === 'fight' && activePlayer === 'opponent') || // Ennemi combat contre vous
            (currentPhase === 'fight' && activePlayer === 'player') // Ennemi riposte contre vous
          );
          
          console.log('🔍 DEBUG: Phase check (shooting/fight):', phaseCheck);
          console.log('🔍 DEBUG: Player check (défensif):', playerCheck);
          
          if (phaseCheck && playerCheck) {
            
            // Éviter les doublons
            const abilityKey = `army-${ruleName}`;
            if (!seenAbilities.has(abilityKey)) {
              seenAbilities.add(abilityKey);
              
              // Utiliser les informations de notre base de données si disponible
              const abilityMapping = ABILITY_PHASE_MAPPING[ruleName];
              let displayDescription = ruleDescription;
              let timing = '';
              
              if (abilityMapping) {
                if (abilityMapping.timing) {
                  timing = `📅 ${abilityMapping.timing} | `;
                }
                if (abilityMapping.description) {
                  displayDescription = `${timing}${abilityMapping.description}\n\n📜 Description complète: ${ruleDescription}`;
                } else {
                  displayDescription = `${timing}${ruleDescription}`;
                }
              }
              
              console.log('🔍 DEBUG: Ajout de la suggestion Indomitable Heroes');
              newSuggestions.push({
                id: `army-rule-${ruleName}`,
                text: `🛡️ Imperial Knights Army: ${ruleName}`,
                detail: displayDescription,
                type: 'ability', // Changer en 'ability' pour que l'interface reconnaisse l'expansion
                phase: currentPhase,
                timing: abilityMapping?.timing || 'Règle d\'armée active'
              });
            }
          }
        }
        
        // Traiter "Code Chivalric" (déjà géré par la sélection d'Oath)
        if (ruleName === 'Code Chivalric') {
          // Cette règle est gérée par la sélection d'Oath, pas besoin de l'afficher ici
          return;
        }
      });
    }
    
    // Ajouter les Oaths Imperial Knights si un Oath a été sélectionné
    if (finalIsImperialKnights && selectedOath && activePlayer === 'player') {
      if (selectedOath === 'Lay Low The Tyrant' && (currentPhase === 'shooting' || currentPhase === 'fight')) {
        newSuggestions.push({
          id: 'imperial-knights-oath-lay-low',
          text: `⚔️ Imperial Knights - Lay Low The Tyrant (Oath)`,
          detail: `🛡️ **Oath Ability Active**\n\nChaque fois que cette unité est sélectionnée pour tirer ou combattre, vous pouvez relancer un jet de touche et un jet de blessure.\n\n🎯 **Deed en cours** : Détruire l'ennemi WARLORD\n\n💎 Si le Deed est accompli : votre armée devient Honoured (+3CP)`,
          type: 'ability',
          phase: currentPhase,
          timing: 'Active Oath Ability'
        });
      }
      
      if (selectedOath === 'Reclaim the Realm' && (currentPhase === 'movement' || currentPhase === 'charge')) {
        newSuggestions.push({
          id: 'imperial-knights-oath-reclaim',
          text: `⚔️ Imperial Knights - Reclaim the Realm (Oath)`,
          detail: `🏰 **Oath Ability Active**\n\nAjoutez 1" à la caractéristique de Mouvement de cette unité et +1 aux jets d'Advance et de Charge.\n\n🎯 **Deed en cours** : Contrôler un objectif dans la zone de déploiement ennemie\n\n💎 Si le Deed est accompli : votre armée devient Honoured (+3CP)`,
          type: 'ability',
          phase: currentPhase,
          timing: 'Active Oath Ability'
        });
      }
    }

    // Afficher les capacités selon la sélection d'unité
    if (armyData && armyData.units) {
      armyData.units.forEach((unit: any) => {
        const currentWounds = unitHealth[unit.id] || 0;
        if (currentWounds > 0) { // Unité encore vivante
          
          // Si une unité est sélectionnée, afficher seulement les capacités de cette unité
          // Si aucune unité sélectionnée, afficher toutes les capacités
          if (selectedUnit && selectedUnit !== unit.id) {
            return; // Skip cette unité si une autre est sélectionnée
          }
          
          // Ajouter les habilités de l'unité (exclure les règles d'armée/faction)
          if (unit.rules && unit.rules.length > 0) {
            unit.rules.forEach((rule: any) => {
              // Filtrer les règles d'armée/faction et règles communes
              const armyRules = [
                'Ruthless Efficiency', 'Eye of the Ancestors', 'Oath of Moment',
                'Combat Doctrines', 'Angels of Death', 'And They Shall Know No Fear',
                'Bolter Discipline', 'Shock Assault', 'Chapter Tactic', 'Detachment Rule',
                'Leader', 'Leaders', 'Feel No Pain', 'Deep Strike',
                'Infiltrators', 'Scouts', 'Stealth', 'Lone Operative', 'Deadly Demise',
                'Conversion', 'Damaged:'
              ];
              
              // Ignorer si c'est une règle d'armée
              if (armyRules.some(armyRule => rule.name?.includes(armyRule))) {
                return;
              }
              
                              // Vérifier si la règle est pertinente pour la phase actuelle
                const ruleDescription = rule.description || 'Capacité spéciale de l\'unité';
                if (isAbilityRelevantForPhase(rule.name, ruleDescription, currentPhase, activePlayer)) {
                  // Éviter les doublons - utiliser le nom de la capacité comme clé unique
                  const abilityKey = rule.name;
                  if (!seenAbilities.has(abilityKey)) {
                    seenAbilities.add(abilityKey);
                    
                    // Utiliser les informations de notre base de données si disponible
                    const abilityMapping = ABILITY_PHASE_MAPPING[rule.name];
                    let displayDescription = ruleDescription;
                    let timing = '';
                    
                    if (abilityMapping) {
                      if (abilityMapping.timing) {
                        timing = `📅 ${abilityMapping.timing} | `;
                      }
                      if (abilityMapping.description) {
                        displayDescription = `${timing}${abilityMapping.description}\n\n📜 Description complète: ${ruleDescription}`;
                      } else {
                        displayDescription = `${timing}${ruleDescription}`;
                      }
                    }
                    
                    newSuggestions.push({
                      id: `ability-${unit.id}-${rule.name}`,
                      text: `✨ ${unit.name}: ${rule.name}`,
                      detail: displayDescription,
                      type: 'ability',
                      phase: currentPhase,
                      unit: unit.name,
                      timing: abilityMapping?.timing || 'Phase active'
                    });
                  }
                }
            });
          }

          // Ajouter les capacités trouvées dans les profiles de l'unité (comme "Exemplar of the Einhyr")
          if (unit.profiles && unit.profiles.length > 0) {
            unit.profiles.forEach((profile: any) => {
              if (profile.typeName === 'Abilities' && profile.name && profile.characteristics) {
                const description = profile.characteristics.find((char: any) => char.name === 'Description')?.$text;
                if (description) {
                  // Filtrer les règles d'armée/faction et règles communes
                  const armyRules = [
                    'Ruthless Efficiency', 'Eye of the Ancestors', 'Oath of Moment',
                    'Combat Doctrines', 'Angels of Death', 'And They Shall Know No Fear',
                    'Bolter Discipline', 'Shock Assault', 'Chapter Tactic', 'Detachment Rule',
                    'Leader', 'Leaders', 'Feel No Pain', 'Deep Strike',
                    'Infiltrators', 'Scouts', 'Stealth', 'Lone Operative', 'Deadly Demise',
                    'Conversion', 'Damaged:'
                  ];
                  
                  // Ignorer si c'est une règle d'armée
                  if (armyRules.some(armyRule => profile.name?.includes(armyRule))) {
                    return;
                  }
                  
                  // Vérifier si la capacité est pertinente pour la phase actuelle
                  if (isAbilityRelevantForPhase(profile.name, description, currentPhase, activePlayer)) {
                    // Éviter les doublons - utiliser le nom de la capacité comme clé unique
                    const abilityKey = profile.name;
                    if (!seenAbilities.has(abilityKey)) {
                      seenAbilities.add(abilityKey);
                      
                      // Utiliser les informations de notre base de données si disponible
                      const abilityMapping = ABILITY_PHASE_MAPPING[profile.name];
                      let displayDescription = description;
                      let timing = '';
                      
                      if (abilityMapping) {
                        if (abilityMapping.timing) {
                          timing = `📅 ${abilityMapping.timing} | `;
                        }
                        if (abilityMapping.description) {
                          displayDescription = `${timing}${abilityMapping.description}\n\n📜 Description complète: ${description}`;
                        } else {
                          displayDescription = `${timing}${description}`;
                        }
                      }
                      
                      newSuggestions.push({
                        id: `ability-${unit.id}-${profile.name}`,
                        text: `✨ ${unit.name}: ${profile.name}`,
                        detail: displayDescription,
                        type: 'ability',
                        phase: currentPhase,
                        unit: unit.name,
                        timing: abilityMapping?.timing || 'Phase active'
                      });
                    }
                  }
                }
              }
            });
          }

          // Détecter les aptitudes dérivées (équipements qui confèrent des aptitudes)
          const detectDerivedAbilities = () => {
            // Fonction récursive pour chercher dans toutes les sélections
            const searchForTeleportCrest = (selections: any[]): boolean => {
              if (!selections) return false;
              
              return selections.some((sel: any) => {
                // Vérifier le nom de la sélection
                if (sel.name === 'Teleport crest') {
                  return true;
                }
                
                // Vérifier dans les profiles
                if (sel.profiles?.some((p: any) => p.name === 'Teleport crest')) {
                  return true;
                }
                
                // Chercher récursivement dans les sous-sélections
                if (sel.selections) {
                  return searchForTeleportCrest(sel.selections);
                }
                
                return false;
              });
            };
            
            // Chercher "Teleport crest" qui confère "Deep Strike"
            const hasTeleportCrest = searchForTeleportCrest(unit.selections || []);
            
            // Deep Strike s'affiche seulement en déploiement OU pendant VOTRE phase de mouvement (pas celle de l'adversaire)
            const canShowDeepStrike = (currentPhase === 'deployment') || 
                                    (currentPhase === 'movement' && activePlayer === 'player');
            

            
            if (hasTeleportCrest && canShowDeepStrike) {
              const abilityKey = 'Deep Strike';
              if (!seenAbilities.has(abilityKey)) {
                seenAbilities.add(abilityKey);
                
                const abilityMapping = ABILITY_PHASE_MAPPING['Deep Strike'];
                let displayDescription = 'Deep Strike capability granted by Teleport crest';
                let timing = '';
                
                if (abilityMapping) {
                  if (abilityMapping.timing) {
                    timing = `📅 ${abilityMapping.timing} | `;
                  }
                  displayDescription = `${timing}${abilityMapping.description}\n\n🎒 Granted by: Teleport crest`;
                }
                
                newSuggestions.push({
                  id: `ability-${unit.id}-deep-strike`,
                  text: `✨ ${unit.name}: Deep Strike`,
                  detail: displayDescription,
                  type: 'ability',
                  phase: currentPhase,
                  unit: unit.name,
                  timing: abilityMapping?.timing || 'Deployment/Reinforcements'
                });
              }
            }
          };
          
          // Appeler la détection des aptitudes dérivées
          detectDerivedAbilities();

          // Chercher les habilités dans les sélections de l'unité (exclure les règles d'armes)
          const findAbilities = (selections: any[]) => {
            if (!selections) return;
            
            selections.forEach((selection: any) => {
              
              // Ignorer les armes et leurs règles
              if (selection.profiles?.some((p: any) => p.typeName === 'Weapon')) {
                return; // Skip les armes
              }
              
              // Traitement spécial pour les upgrades/enhancements comme "Appraising Glare"
              if (selection.type === 'upgrade') {
                // Vérifier d'abord le nom de la sélection
                let enhancementName = selection.name;
                
                // Si pas trouvé, chercher dans les profiles de la sélection
                if (!enhancementName || !['Appraising Glare', 'Grim Demeanour', 'Ancestral Sentence', 'A Long List', 'Wayfarer\'s Grace', 'Bastion Shield', 'High Kâhl', 'Ironskein', 'Quake Multigenerator'].includes(enhancementName)) {
                  // Chercher tous les enhancements connus dans les profiles
                  const knownEnhancements = ['Appraising Glare', 'Grim Demeanour', 'Ancestral Sentence', 'A Long List', 'Wayfarer\'s Grace', 'Bastion Shield', 'High Kâhl', 'Ironskein', 'Quake Multigenerator'];
                  const profile = selection.profiles?.find((p: any) => 
                    p.typeName === 'Abilities' && knownEnhancements.includes(p.name)
                  );
                  if (profile) {
                    enhancementName = profile.name;
                  }
                }
                
                if (enhancementName) {
                  // Définir les enhancements et leurs phases
                  const enhancementPhases: { [key: string]: { phases: string[], description: string, requiresChampion?: boolean } } = {
                    'Appraising Glare': {
                      phases: ['command'],
                      description: 'Command phase: Select one enemy unit visible to bearer - that unit gains 1 Judgement token (max 2)',
                      requiresChampion: true
                    },
                    'Grim Demeanour': {
                      phases: ['morale'],
                      description: 'Can re-roll Battle-shock tests and ignore modifiers to Characteristics (except saves)'
                    },
                    'Ancestral Sentence': {
                      phases: ['shooting'],
                      description: 'Shooting phase: 1CP stratagem enhancement'
                    },
                    'A Long List': {
                      phases: ['shooting', 'fight'],
                      description: 'When bearer destroys enemy with Judgement tokens, select another visible enemy - it gains 1 Judgement token'
                    },
                    'Wayfarer\'s Grace': {
                      phases: ['endofturn'],
                      description: 'First time destroyed: roll D6 at end of phase, on 2+ set back up with full wounds'
                    },
                    'Bastion Shield': {
                      phases: ['shooting'],
                      description: 'Ranged attacks within 12" have AP worsened by 1'
                    },
                    'High Kâhl': {
                      phases: ['fight'],
                      description: 'If not fought this phase, on 4+ can fight before being removed'
                    },
                    'Ironskein': {
                      phases: ['command'],
                      description: 'Add 2 to bearer\'s Wounds characteristic (passive)'
                    },
                    'Quake Multigenerator': {
                      phases: ['shooting'],
                      description: 'After shooting: select hit enemy unit (not TITANIC) - until next turn it\'s suppressed (-1 to Hit)'
                    }
                  };
                  
                  const enhancement = enhancementPhases[enhancementName];
                  if (enhancement && enhancement.phases.includes(currentPhase)) {
                    // Les enhancements sont des capacités OFFENSIVES qui ne s'utilisent que pendant NOTRE tour
                    if (activePlayer === 'opponent') {
                      return; // Ne JAMAIS afficher les enhancements pendant le tour adverse
                    }
                    // Vérifier si l'enhancement nécessite un champion
                    if (enhancement.requiresChampion) {
                      // Vérifier si l'unité est un champion (contient "Champion" dans le nom ou les catégories)
                      const isChampion = unit.name.toLowerCase().includes('champion') || 
                                       unit.categories?.some((cat: any) => cat.name.toLowerCase().includes('champion'));
                      
                      if (!isChampion) {
                        return; // Ne pas afficher pour les non-champions
                      }
                    }
                    
                    // Éviter les doublons pour les enhancements aussi
                    const abilityKey = enhancementName;
                    if (!seenAbilities.has(abilityKey)) {
                      seenAbilities.add(abilityKey);
                      
                      // Utiliser la description du profile si disponible, sinon celle par défaut
                      let description = enhancement.description;
                      const profile = selection.profiles?.find((p: any) => 
                        p.typeName === 'Abilities' && p.name === enhancementName
                      );
                      if (profile && profile.characteristics) {
                        const descChar = profile.characteristics.find((c: any) => c.name === 'Description');
                        if (descChar && descChar.$text) {
                          description = descChar.$text;
                        }
                      }
                      
                      newSuggestions.push({
                        id: `ability-${unit.id}-${enhancementName}`,
                        text: `✨ ${unit.name}: ${enhancementName}`,
                        detail: description,
                        type: 'ability',
                        phase: currentPhase,
                        unit: unit.name
                      });
                    }
                  }
                }
              }
              
              if (selection.rules) {
                selection.rules.forEach((rule: any) => {
                  const abilityName = rule.name || 'Capacité';
                  
                  // Filtrer les règles d'armes communes et règles génériques
                  const weaponRules = [
                    'Sustained Hits', 'Lethal Hits', 'Anti-', 'Devastating Wounds',
                    'Blast', 'Hazardous', 'Heavy', 'Indirect', 'Ignores Cover',
                    'One Shot', 'Pistol', 'Precision', 'Rapid Fire', 'Torrent',
                    'Twin-linked', 'Assault', 'Melta', 'Lance', 'Psychic',
                    'Leader', 'Leaders', 'Feel No Pain',
                    'Infiltrators', 'Scouts', 'Stealth', 'Lone Operative', 'Deadly Demise',
                    'Conversion', 'Damaged:', 'Code Chivalric'
                  ];
                  
                  // Ignorer si c'est une règle d'arme
                  if (weaponRules.some(weaponRule => abilityName.includes(weaponRule))) {
                    return;
                  }
                  
                  const description = rule.description || 'Capacité spéciale';
                  
                  // Vérifier si la capacité est pertinente pour la phase actuelle
                  if (isAbilityRelevantForPhase(abilityName, description, currentPhase, activePlayer)) {
                    // Éviter les doublons - utiliser le nom de la capacité comme clé unique
                    const abilityKey = abilityName;
                    if (!seenAbilities.has(abilityKey)) {
                      seenAbilities.add(abilityKey);
                      
                      // Utiliser les informations de notre base de données si disponible
                      const abilityMapping = ABILITY_PHASE_MAPPING[abilityName];
                      let displayDescription = description;
                      let timing = '';
                      
                      if (abilityMapping) {
                        if (abilityMapping.timing) {
                          timing = `📅 ${abilityMapping.timing} | `;
                        }
                        if (abilityMapping.description) {
                          displayDescription = `${timing}${abilityMapping.description}\n\n📜 Description complète: ${description}`;
                        } else {
                          displayDescription = `${timing}${description}`;
                        }
                      }
                      
                      newSuggestions.push({
                        id: `ability-${unit.id}-${selection.name}-${abilityName}`,
                        text: `✨ ${unit.name}: ${abilityName}`,
                        detail: displayDescription,
                        type: 'ability',
                        phase: currentPhase,
                        unit: unit.name,
                        timing: abilityMapping?.timing || 'Phase active'
                      });
                    }
                  }
                });
              }
              
              // Traitement des profiles de type "Abilities" qui ne sont pas des enhancements
              if (selection.profiles) {
                selection.profiles.forEach((profile: any) => {
                  if (profile.typeName === 'Abilities' && profile.name && profile.characteristics) {
                    const description = profile.characteristics.find((char: any) => char.name === 'Description')?.$text;
                    if (description) {
                      // Filtrer les règles d'armée/faction et règles communes
                      const armyRules = [
                        'Ruthless Efficiency', 'Eye of the Ancestors', 'Oath of Moment',
                        'Combat Doctrines', 'Angels of Death', 'And They Shall Know No Fear',
                        'Bolter Discipline', 'Shock Assault', 'Chapter Tactic', 'Detachment Rule',
                        'Leader', 'Leaders', 'Feel No Pain',
                        'Infiltrators', 'Scouts', 'Stealth', 'Lone Operative', 'Deadly Demise',
                        'Conversion', 'Damaged:', 'Code Chivalric'
                      ];
                      
                      // Ignorer si c'est une règle d'armée
                      if (armyRules.some(armyRule => profile.name?.includes(armyRule))) {
                        return;
                      }
                      
                      // Vérifier si la capacité est pertinente pour la phase actuelle
                      if (isAbilityRelevantForPhase(profile.name, description, currentPhase, activePlayer)) {
                        // Éviter les doublons - utiliser le nom de la capacité comme clé unique
                        const abilityKey = profile.name;
                        if (!seenAbilities.has(abilityKey)) {
                          seenAbilities.add(abilityKey);
                          
                          // Utiliser les informations de notre base de données si disponible
                          const abilityMapping = ABILITY_PHASE_MAPPING[profile.name];
                          let displayDescription = description;
                          let timing = '';
                          
                          if (abilityMapping) {
                            if (abilityMapping.timing) {
                              timing = `📅 ${abilityMapping.timing} | `;
                            }
                            if (abilityMapping.description) {
                              displayDescription = `${timing}${abilityMapping.description}\n\n📜 Description complète: ${description}`;
                            } else {
                              displayDescription = `${timing}${description}`;
                            }
                          }
                          
                          newSuggestions.push({
                            id: `ability-${unit.id}-${selection.name}-${profile.name}`,
                            text: `✨ ${unit.name}: ${profile.name}`,
                            detail: displayDescription,
                            type: 'ability',
                            phase: currentPhase,
                            unit: unit.name,
                            timing: abilityMapping?.timing || 'Phase active'
                          });
                        }
                      }
                    }
                  }
                });
              }
              
              if (selection.selections) {
                findAbilities(selection.selections);
              }
            });
          };
          
          findAbilities(unit.selections);
        }
      });
    }

    // Ne plus générer de message ici - ce sera fait après le filtrage global

    // Suggestions de stratagèmes pour l'unité sélectionnée (SEULEMENT si unité sélectionnée)
    if (selectedUnit && armyData) {
      const unit = armyData.units.find((u: any) => u.id === selectedUnit);
      if (unit) {
        const applicableStratagems = getApplicableStratagems(unit, currentPhase, activePlayer);
        
        applicableStratagems.forEach(stratagem => {
          // Vérifier si on a assez de CP
          const canAfford = commandPoints >= stratagem.cost;
          
          newSuggestions.push({
            id: `stratagem-${stratagem.name}`,
            text: `🎯 ${stratagem.name} (${stratagem.cost}CP)`,
            detail: `${stratagem.timing} - ${(stratagem as any).effect || (stratagem as any).description}${canAfford ? '' : ' ⚠️ Pas assez de CP'}`,
            type: 'stratagem',
            phase: currentPhase,
            priority: canAfford ? 'high' : 'medium',
            unit: unit.name,
            cost: stratagem.cost,
            timing: stratagem.timing,
            frequency: stratagem.frequency,
            affordable: canAfford
          });
        });
      }
    }

    return newSuggestions;
  };

  useEffect(() => {
    const allSuggestions = generateSuggestions();
    
    // 🛡️ FILTRE GLOBAL FINAL - Nettoyer toutes les capacités qui ne devraient pas être là pendant le tour adverse
    const filteredSuggestions = allSuggestions.filter(suggestion => {
      if (activePlayer === 'opponent' && suggestion.type === 'ability') {
        const fullText = suggestion.text.toLowerCase();
        
        // Liste noire des capacités qui ne doivent JAMAIS s'afficher pendant le tour adverse
        const blockedAbilities = [
          'teleport crest', 'blistering advance', 'exemplar of the einhyr', 
          'mass driver accelerators', 'appraising glare', 'deep strike'
        ];
        
        // Vérifier si le texte contient une des capacités bloquées
        const isBlocked = blockedAbilities.some(blocked => fullText.includes(blocked));
        
        if (isBlocked) {
          return false;
        }
      }
      return true;
    });
    
    // 🌐 LOGIQUE GLOBALE UNIFIÉE - Générer un message cohérent si aucune suggestion finale
    let finalSuggestions = filteredSuggestions;
    
    if (finalSuggestions.length === 0 || finalSuggestions.every(s => s.type === 'phase')) {
      const currentPhaseName = phases.find(p => p.id === currentPhase)?.name;
      const playerText = activePlayer === 'player' ? 'Votre' : 'Tour Adverse';
      
      const message = selectedUnit 
        ? 'Aucune capacité d\'unité trouvée.'
        : 'Sélectionnez une unité pour voir les suggestions';
      
      finalSuggestions = [{
        id: 'no-abilities',
        text: `📋 ${playerText} - Phase ${currentPhaseName}`,
        detail: message,
        type: 'phase',
        phase: currentPhase
      }];
    }
    
    setSuggestions(finalSuggestions);
  }, [currentPhase, selectedUnit, armyData, commandPoints, activePlayer]);

  const nextPhase = () => {
    const currentIndex = phases.findIndex(p => p.id === currentPhase);
    if (currentIndex < phases.length - 1) {
      setCurrentPhase(phases[currentIndex + 1].id);
    } else {
      setCurrentPhase('command');
      if (activePlayer === 'player') {
        setActivePlayer('opponent');
        setCommandPoints(prev => prev + 1);
      } else {
        setActivePlayer('player');
        const nextTurn = currentTurn + 1;
        if (nextTurn > 5) {
          // Fin de partie après le tour 5
          setGameState('game-ended');
        } else {
          setCurrentTurn(nextTurn);
        }
        setCommandPoints(prev => prev + 1);
      }
    }
  };

  const updateUnitHealth = (unitId: string, newHealth: number) => {
    setUnitHealth(prev => ({
      ...prev,
      [unitId]: Math.max(0, newHealth)
    }));
  };

  // Fonction pour parser les keywords et les rendre cliquables
  const parseKeywords = (keywordsString: string) => {
    if (!keywordsString || keywordsString === '-') return [];
    
    // Séparer les keywords par virgule et nettoyer
    return keywordsString.split(',').map(keyword => keyword.trim());
  };

  // Fonction pour rendre les keywords cliquables
  const renderClickableKeywords = (keywordsString: string) => {
    const keywords = parseKeywords(keywordsString);
    
    if (keywords.length === 0) return <span className="text-gray-500">-</span>;
    
    return (
      <div className="flex flex-wrap gap-1">
        {keywords.map((keyword, index) => {
          const rule = KEYWORD_RULES[keyword as keyof typeof KEYWORD_RULES];
          const isClickable = !!rule;
          
          return (
            <span key={index}>
              {isClickable ? (
                <button
                  onClick={() => setSelectedKeyword(selectedKeyword === keyword ? null : keyword)}
                  className="text-blue-400 hover:text-blue-300 underline cursor-pointer text-xs"
                >
                  {keyword}
                </button>
              ) : (
                <span className="text-gray-300 text-xs">{keyword}</span>
              )}
              {index < keywords.length - 1 && <span className="text-gray-500 text-xs">, </span>}
            </span>
          );
        })}
      </div>
    );
  };

  // Phase de déploiement
  if (gameState === 'deployment') {
    const infiltratorsUnits = getInfiltratorsUnits();
    const deepStrikeUnits = getDeepStrikeUnits();
    
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-white min-h-screen">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-purple-500">Phase de Déploiement</h1>
          <p className="text-gray-300 mb-4">Déployez vos unités spéciales</p>
          <p className="text-sm text-gray-400">Premier joueur : {activePlayer === 'player' ? 'Vous' : 'Adversaire'}</p>
        </div>

        <div className="space-y-6 mb-8">
          {infiltratorsUnits.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-purple-500">
              <h3 className="text-xl font-bold text-purple-400 mb-4">Unités Infiltrators</h3>
              <div className="space-y-4">
                {infiltratorsUnits.map((unit: any, index: number) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-white">{unit.name}</h4>
                        <p className="text-sm text-gray-300">Déploiement : Partout à plus de 9" de la zone de déploiement ennemie</p>
                      </div>
                      <div className="text-purple-400 font-bold">{unit.points}pts</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-purple-900 rounded border border-purple-600">
                <h4 className="font-semibold text-purple-300 mb-2">🎯 Action requise :</h4>
                <p className="text-purple-100 text-sm">Déployez ces unités n'importe où sur le plateau à plus de 9" horizontalement de la zone de déploiement ennemie</p>
              </div>
            </div>
          )}

          {deepStrikeUnits.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-blue-500">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Unités Deep Strike</h3>
              <div className="space-y-4">
                {deepStrikeUnits.map((unit: any, index: number) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-white">{unit.name}</h4>
                        <p className="text-sm text-gray-300">Équipement : {unit.deepStrikeSource}</p>
                        <p className="text-sm text-gray-400">Option : Peut être déployé en réserve</p>
                      </div>
                      <div className="text-blue-400 font-bold">{unit.points}pts</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-blue-900 rounded border border-blue-600">
                <h4 className="font-semibold text-blue-300 mb-2">🎯 Choix :</h4>
                <p className="text-blue-100 text-sm">Ces unités peuvent être déployées normalement OU placées en réserve pour arriver plus tard via Deep Strike</p>
              </div>
            </div>
          )}

          {infiltratorsUnits.length === 0 && deepStrikeUnits.length === 0 && (
            <div className="text-center py-12">
              <Target className="mx-auto h-16 w-16 text-gray-500 mb-4" />
              <p className="text-gray-400 text-lg">Aucune unité spéciale dans votre armée</p>
              <p className="text-gray-500 text-sm">Déploiement standard uniquement</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <button onClick={startBattlePhase} className="bg-orange-600 hover:bg-orange-700 px-8 py-4 rounded-lg transition-colors text-lg font-semibold flex items-center justify-center mx-auto space-x-3">
            <Play className="h-6 w-6" />
            <span>Continuer vers le Début de Bataille</span>
          </button>
        </div>
      </div>
    );
  }

  // Phase de début de bataille
  if (gameState === 'battle-start') {
    const battleStartRules = getBattleStartRules();
    
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-white min-h-screen">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-orange-500">Début de Bataille</h1>
          <p className="text-gray-300 mb-4">Résolvez ces règles avant le premier tour</p>
          <p className="text-sm text-gray-400">Premier joueur : {activePlayer === 'player' ? 'Vous' : 'Adversaire'}</p>
        </div>

        {battleStartRules.length > 0 ? (
          <div className="space-y-6 mb-8">
            {battleStartRules.map((rule: any, index: number) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 border-l-4 border-orange-500">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-orange-400">{rule.name}</h3>
                      <button onClick={() => toggleRuleExpansion(index)} className="text-gray-400 hover:text-orange-400 transition-colors">
                        {expandedRules[index] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-400">Source: {rule.source}</p>
                  </div>
                  {/* Masquer la case verte pour "Code Chivalric" car la sélection d'Oath suffit */}
                  {rule.name !== 'Code Chivalric' && (
                    <CheckCircle 
                      className={`h-8 w-8 cursor-pointer transition-colors flex-shrink-0 ${
                        resolvedRules[index] 
                          ? 'text-green-500 hover:text-green-400' 
                          : 'text-gray-500 hover:text-gray-400'
                      }`}
                      onClick={() => setResolvedRules(prev => ({
                        ...prev,
                        [index]: !prev[index]
                      }))}
                    />
                  )}
                </div>
                
                {expandedRules[index] && (
                  <div className="bg-gray-700 rounded p-4 mb-4">
                    <p className="text-gray-200 leading-relaxed text-sm">{rule.description}</p>
                  </div>
                )}
                
                {rule.name === 'Eye of the Ancestors' && (
                  <div className="p-4 bg-blue-900 rounded border border-blue-600">
                    <h4 className="font-semibold text-blue-300 mb-2">🎯 Action requise :</h4>
                    <p className="text-blue-100 text-sm mb-3">Marquez 2 unités ennemies sur la table - elles commencent avec 2 Judgement tokens chacune</p>
                    <div className="text-xs text-blue-200">✓ Placez des marqueurs sur 2 unités ennemies différentes</div>
                  </div>
                )}
                
                {rule.name === 'Code Chivalric' && (
                  <div className="p-4 bg-indigo-900 rounded border border-indigo-600">
                    <h4 className="font-semibold text-indigo-300 mb-2">⚔️ Sélection d'Oath requise :</h4>
                    <div className="space-y-3">
                      <div 
                        className={`bg-indigo-800 rounded p-3 cursor-pointer border-2 transition-colors ${
                          selectedOath === 'Lay Low The Tyrant' 
                            ? 'border-green-400 bg-indigo-700' 
                            : 'border-transparent hover:border-indigo-400'
                        }`}
                        onClick={() => setSelectedOath('Lay Low The Tyrant')}
                      >
                        <h5 className="font-semibold text-indigo-200 mb-1">🛡️ Lay Low The Tyrant</h5>
                        <p className="text-indigo-100 text-sm mb-1">• Oath Ability: Re-roll one Hit roll et un Wound roll lors des attaques</p>
                        <p className="text-indigo-100 text-sm">• Deed: Détruire l'ennemi WARLORD</p>
                        {selectedOath === 'Lay Low The Tyrant' && (
                          <div className="text-green-400 text-sm mt-2">✅ Sélectionné</div>
                        )}
                      </div>
                      <div 
                        className={`bg-indigo-800 rounded p-3 cursor-pointer border-2 transition-colors ${
                          selectedOath === 'Reclaim the Realm' 
                            ? 'border-green-400 bg-indigo-700' 
                            : 'border-transparent hover:border-indigo-400'
                        }`}
                        onClick={() => setSelectedOath('Reclaim the Realm')}
                      >
                        <h5 className="font-semibold text-indigo-200 mb-1">🏰 Reclaim the Realm</h5>
                        <p className="text-indigo-100 text-sm mb-1">• Oath Ability: +1" Move et +1 aux rolls Advance/Charge</p>
                        <p className="text-indigo-100 text-sm">• Deed: Contrôler un objectif dans la zone de déploiement ennemie</p>
                        {selectedOath === 'Reclaim the Realm' && (
                          <div className="text-green-400 text-sm mt-2">✅ Sélectionné</div>
                        )}
                      </div>
                      <div className="text-xs text-indigo-200 mt-2">💎 Si le Deed est accompli : votre armée devient Honoured (+3CP)</div>
                      {selectedOath && (
                        <div className="text-green-400 text-sm mt-2">
                          🎯 Oath sélectionné : <strong>{selectedOath}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {rule.name === 'Ruthless Efficiency' && (
                  <div className="p-4 bg-yellow-900 rounded border border-yellow-600">
                    <h4 className="font-semibold text-yellow-300 mb-2">🎯 Action requise :</h4>
                    <p className="text-yellow-100 text-sm mb-3">Marquez 1 unité ennemie supplémentaire - elle commence avec 2 Judgement tokens</p>
                    <div className="text-xs text-yellow-200">✓ Total final: 3 unités ennemies marquées (2 + 1)</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-16 w-16 text-gray-500 mb-4" />
            <p className="text-gray-400 text-lg">Aucune règle "At the start of the battle" trouvée</p>
          </div>
        )}

        <div className="text-center">
          <button 
            onClick={startScoutsPhase} 
            disabled={
              battleStartRules.length > 0 && !battleStartRules.every((rule, index) => {
                // Pour "Code Chivalric", considérer comme résolu si un Oath est sélectionné
                if (rule.name === 'Code Chivalric') {
                  return selectedOath !== null;
                }
                // Pour les autres règles, utiliser resolvedRules[index]
                return resolvedRules[index];
              })
            }
            className={`px-8 py-4 rounded-lg transition-colors text-lg font-semibold flex items-center justify-center mx-auto space-x-3 ${
              battleStartRules.length === 0 || battleStartRules.every((rule, index) => {
                // Pour "Code Chivalric", considérer comme résolu si un Oath est sélectionné
                if (rule.name === 'Code Chivalric') {
                  return selectedOath !== null;
                }
                // Pour les autres règles, utiliser resolvedRules[index]
                return resolvedRules[index];
              })
                ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Play className="h-6 w-6" />
            <span>Continuer vers la Phase Scouts</span>
          </button>
        </div>
      </div>
    );
  }

  // Phase scouts
  if (gameState === 'scouts') {
    const scoutsUnits = getScoutsUnits();
    
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-white min-h-screen">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-green-500">Phase Scouts</h1>
          <p className="text-gray-300 mb-4">Mouvement pré-bataille de vos unités Scouts</p>
          <p className="text-sm text-gray-400">Avant le début du Tour 1</p>
        </div>

        {scoutsUnits.length > 0 ? (
          <div className="space-y-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-green-500">
              <h3 className="text-xl font-bold text-green-400 mb-4">Unités Scouts</h3>
              <div className="space-y-4">
                {scoutsUnits.map((unit: any, index: number) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="text-green-400 font-bold text-xl">{unit.scoutsDistance}"</div>
                        <div>
                          <h4 className="font-semibold text-white">{unit.name}</h4>
                          <p className="text-sm text-gray-300">Mouvement Scouts : {unit.scoutsDistance}" (doit finir à plus de 9" des ennemis)</p>
                        </div>
                      </div>
                      <CheckCircle 
                        className={`h-8 w-8 cursor-pointer transition-colors flex-shrink-0 ${
                          resolvedRules[`scouts-${index}`] 
                            ? 'text-green-500 hover:text-green-400' 
                            : 'text-gray-500 hover:text-gray-400'
                        }`}
                        onClick={() => setResolvedRules(prev => ({
                          ...prev,
                          [`scouts-${index}`]: !prev[`scouts-${index}`]
                        }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-green-900 rounded border border-green-600">
                <h4 className="font-semibold text-green-300 mb-2">🎯 Action requise :</h4>
                <p className="text-green-100 text-sm mb-2">Effectuez un mouvement Normal avec chaque unité Scouts (distance indiquée)</p>
                <div className="text-xs text-green-200">
                  ✓ Le mouvement doit finir à plus de 9" horizontalement de tous les modèles ennemis<br/>
                  ✓ Joueur commençant en premier déplace ses Scouts en premier
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="mx-auto h-16 w-16 text-gray-500 mb-4" />
            <p className="text-gray-400 text-lg">Aucune unité Scouts dans votre armée</p>
            <p className="text-gray-500 text-sm">Pas de mouvement pré-bataille</p>
          </div>
        )}

        <div className="text-center">
          <button 
            onClick={startFirstTurn} 
            disabled={scoutsUnits.length > 0 && !scoutsUnits.every((_: any, index: number) => resolvedRules[`scouts-${index}`])}
            className={`px-8 py-4 rounded-lg transition-colors text-lg font-semibold flex items-center justify-center mx-auto space-x-3 ${
              scoutsUnits.length === 0 || scoutsUnits.every((_: any, index: number) => resolvedRules[`scouts-${index}`])
                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Play className="h-6 w-6" />
            <span>Commencer le Tour 1</span>
          </button>
        </div>
      </div>
    );
  }

  // Écran de choix du premier joueur
  if (gameState === 'first-player') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white min-h-screen">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-red-500">Qui joue en premier ?</h1>
          <p className="text-gray-300 mb-8">Liste chargée : {armyData?.name} ({armyData?.totalPoints} pts)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => startGame('player')} className="bg-blue-600 hover:bg-blue-700 p-8 rounded-lg transition-colors border-2 border-blue-500">
            <div className="text-center">
              <Users className="mx-auto h-16 w-16 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Vous commencez</h3>
              <p className="text-blue-200">Votre armée joue le premier tour de bataille</p>
            </div>
          </button>

          <button onClick={() => startGame('opponent')} className="bg-red-600 hover:bg-red-700 p-8 rounded-lg transition-colors border-2 border-red-500">
            <div className="text-center">
              <Target className="mx-auto h-16 w-16 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Adversaire commence</h3>
              <p className="text-red-200">L'adversaire joue le premier tour de bataille</p>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center text-gray-400">
          <p className="text-sm">Cette information détermine qui joue lors du tour 1</p>
        </div>
      </div>
    );
  }

  // Écran de setup
  if (gameState === 'setup') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white min-h-screen">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-red-500">Assistant de Jeu Warhammer 40K</h1>
          <p className="text-gray-300 mb-8">Importez votre liste d'armée depuis NewRecruit.eu pour commencer</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 border-2 border-dashed border-gray-600">
          <div className="text-center">
            <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Importer votre liste</h3>
            <p className="text-gray-400 mb-4">Fichier JSON exporté depuis NewRecruit.eu</p>
            <label className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer transition-colors">
              <Upload className="mr-2 h-5 w-5" />
              Choisir un fichier
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Armées prédéfinies */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-center">Ou choisir une armée prédéfinie</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={() => loadPresetArmy('Knights')}
              className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg transition-colors text-center"
            >
              <div className="text-lg font-semibold mb-2">⚔️ Imperial Knights</div>
              <div className="text-sm text-gray-300">1000 pts - Knight Valiant + Armigers</div>
            </button>
            
            <button 
              onClick={() => loadPresetArmy('Paquhammer')}
              className="bg-green-600 hover:bg-green-700 p-4 rounded-lg transition-colors text-center"
            >
              <div className="text-lg font-semibold mb-2">🔨 Leagues of Votann</div>
              <div className="text-sm text-gray-300">Liste personnalisée</div>
            </button>
            
            <button 
              onClick={() => loadPresetArmy('Paquhammer Hekathon')}
              className="bg-purple-600 hover:bg-purple-700 p-4 rounded-lg transition-colors text-center"
            >
              <div className="text-lg font-semibold mb-2">🏰 Hekaton Land Fortress</div>
              <div className="text-sm text-gray-300">Liste avec véhicule principal</div>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400">
          <p className="mb-2">Format supporté : JSON de NewRecruit.eu</p>
          <p className="text-sm">L'assistant vous guidera phase par phase pendant votre partie</p>
        </div>
      </div>
    );
  }

  // Écran de fin de partie
  if (gameState === 'game-ended') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white min-h-screen">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 text-yellow-500">🏆 Fin de Partie</h1>
          <p className="text-2xl text-gray-300 mb-6">5 tours complétés !</p>
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Résumé de la partie</h2>
            <div className="grid grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Votre armée</h3>
                <p className="text-gray-300 mb-1">{armyData?.name}</p>
                <p className="text-yellow-500">{armyData?.totalPoints} points</p>
                <p className="text-sm text-gray-400 mt-2">
                  {armyData?.units?.filter((unit: any) => {
                    const maxWounds = unit.totalWounds || parseInt(unit.stats?.W) || 1;
                    const currentWounds = unitHealth[unit.id] !== undefined ? unitHealth[unit.id] : maxWounds;
                    return currentWounds > 0;
                  }).length || 0} / {armyData?.units?.length || 0} unités survivantes
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">Statistiques</h3>
                <p className="text-gray-300 mb-1">Tours joués : 5/5</p>
                <p className="text-gray-300 mb-1">Points de commandement : {commandPoints}</p>
                <p className="text-sm text-gray-400 mt-2">
                  {armyData?.units?.filter((unit: any) => {
                    const maxWounds = unit.totalWounds || parseInt(unit.stats?.W) || 1;
                    const currentWounds = unitHealth[unit.id] !== undefined ? unitHealth[unit.id] : maxWounds;
                    return currentWounds === 0;
                  }).length || 0} unités détruites
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-yellow-300 mb-3">🎯 Prochaines étapes</h3>
            <div className="text-left space-y-2">
              <p className="text-yellow-100">• Comptez vos points de victoire selon les objectifs de la mission</p>
              <p className="text-yellow-100">• Vérifiez les objectifs secondaires accomplis</p>
              <p className="text-yellow-100">• Déterminez le vainqueur en fonction des VP totaux</p>
            </div>
          </div>

          <div className="space-y-4">
                         <button 
               onClick={() => {
                 setGameState('setup');
                 setCurrentTurn(1);
                 setCurrentPhase('command');
                 setActivePlayer('player');
                 setCommandPoints(1);
                 setUnitHealth({});
                 setSelectedUnit(null);
                 setSuggestions([]);
                 setExpandedRules({});
                 setResolvedRules({});
                 setSelectedOath(null);
               }}
               className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg transition-colors text-lg font-semibold mx-4"
             >
               🔄 Nouvelle partie
             </button>
             
             <button 
               onClick={() => {
                 setGameState('playing');
                 setCurrentTurn(1);
                 setCurrentPhase('command');
                 setActivePlayer('player');
                 setCommandPoints(1);
                 // Remettre les PV au maximum pour toutes les unités
                 const healthState: Record<string, number> = {};
                 armyData?.units?.forEach((unit: any) => {
                   const maxWounds = unit.totalWounds || parseInt(unit.stats?.W) || 1;
                   healthState[unit.id] = maxWounds;
                 });
                 setUnitHealth(healthState);
                 setSelectedUnit(null);
                 setSuggestions([]);
                 setExpandedRules({});
                 setResolvedRules({});
                 setSelectedOath(null);
               }}
               className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-lg transition-colors text-lg font-semibold mx-4"
             >
               ⏮️ Recommencer avec la même armée
             </button>
          </div>
        </div>
      </div>
    );
  }

  // Interface de jeu principale
  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-900 text-white min-h-screen">
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-red-500">{armyData?.name}</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300">CP:</span>
            <button onClick={() => setCommandPoints(Math.max(0, commandPoints - 1))} className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm">-1</button>
            <span className="text-lg font-bold mx-2 text-blue-400">{commandPoints}</span>
            <button onClick={() => setCommandPoints(commandPoints + 1)} className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-sm">+1</button>
          </div>
          <span className="text-yellow-500">{armyData?.totalPoints} pts</span>
        </div>
      </div>

      {/* Section Loadout - Toujours visible */}
      <div className={`rounded-lg transition-colors ${
        selectedUnit && expandedRules.loadout ? 'bg-gray-800 p-4 mb-6' : 
        selectedUnit ? 'bg-gray-800 p-4 mb-4' : 'bg-gray-800 opacity-50 p-4 mb-4'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {selectedUnit && expandedRules.loadout && (() => {
              const selectedUnitData = armyData?.units?.find((u: any) => u.id === selectedUnit);
              const weapons = getUnitWeapons(selectedUnitData);
              return weapons.ranged.length > 0 ? (
                <button 
                  onClick={() => setExpandedRules(prev => ({ ...prev, ranged: !prev.ranged }))}
                  className="flex items-center text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <h4 className="text-sm font-semibold text-blue-400">Ranged Weapons</h4>
                  <span className="text-gray-400 hover:text-blue-400 transition-colors ml-2">
                    {expandedRules.ranged ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                </button>
              ) : null;
            })()}
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setExpandedRules(prev => ({ ...prev, loadout: !prev.loadout }))}
              disabled={!selectedUnit}
              className={`flex items-center space-x-2 transition-colors ${
                selectedUnit 
                  ? 'text-white hover:text-gray-300 cursor-pointer' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <h3 className={`text-lg font-semibold ${
                selectedUnit ? 'text-white' : 'text-gray-400'
              }`}>
                Loadout
              </h3>
              {selectedUnit && (
                <span className="text-sm text-gray-300">
                  {armyData?.units?.find((u: any) => u.id === selectedUnit)?.name}
                </span>
              )}
              {!selectedUnit && (
                <span className="text-sm font-normal text-gray-500">(sélectionnez une unité)</span>
              )}
              <span className={`transition-colors ${
                selectedUnit 
                  ? 'text-gray-400 hover:text-white' 
                  : 'text-gray-600'
              }`}>
                {expandedRules.loadout ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </span>
            </button>
          </div>
        </div>
        
        {selectedUnit && expandedRules.loadout && (
          <div>
            {(() => {
              const selectedUnitData = armyData?.units?.find((u: any) => u.id === selectedUnit);
              const weapons = getUnitWeapons(selectedUnitData);
              
              return (
                <>
                  {/* Armes à distance */}
                  {weapons.ranged.length > 0 && expandedRules.ranged && (
                    <div className="overflow-x-auto mb-2">
                      <table className="w-full text-xs table-fixed">
                                                    <thead>
                              <tr className="border-b border-gray-600">
                                <th className="text-left p-1 w-1/4">Weapon</th>
                                <th className="text-left p-1 w-16">Range</th>
                                <th className="text-left p-1 w-8">A</th>
                                <th className="text-left p-1 w-8">BS</th>
                                <th className="text-left p-1 w-8">S</th>
                                <th className="text-left p-1 w-8">AP</th>
                                <th className="text-left p-1 w-8">D</th>
                                <th className="text-left p-1 pl-4">Keywords</th>
                              </tr>
                            </thead>
                        <tbody>
                          {weapons.ranged.map((weapon: any, index: number) => (
                            <tr key={index} className="border-b border-gray-700">
                              <td className="p-1 font-semibold">{weapon.name}</td>
                              <td className="p-1">{weapon.range}</td>
                              <td className="p-1">{weapon.attacks}</td>
                              <td className="p-1">{weapon.ballisticSkill}</td>
                              <td className="p-1">{weapon.strength}</td>
                              <td className="p-1">{weapon.armourPenetration}</td>
                              <td className="p-1">{weapon.damage}</td>
                              <td className="p-1 pl-4">{renderClickableKeywords(weapon.keywords)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Armes de mêlée */}
                  {weapons.melee.length > 0 && (
                    <div>
                      <button 
                        onClick={() => setExpandedRules(prev => ({ ...prev, melee: !prev.melee }))}
                        className="flex items-center mb-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        <h4 className="text-sm font-semibold text-red-400">Melee Weapons</h4>
                        <span className="text-gray-400 hover:text-red-400 transition-colors ml-2">
                          {expandedRules.melee ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      </button>
                      {expandedRules.melee && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs table-fixed">
                            <thead>
                              <tr className="border-b border-gray-600">
                                <th className="text-left p-1 w-1/4">Weapon</th>
                                <th className="text-left p-1 w-16">Range</th>
                                <th className="text-left p-1 w-8">A</th>
                                <th className="text-left p-1 w-8">WS</th>
                                <th className="text-left p-1 w-8">S</th>
                                <th className="text-left p-1 w-8">AP</th>
                                <th className="text-left p-1 w-8">D</th>
                                <th className="text-left p-1 pl-4">Keywords</th>
                              </tr>
                            </thead>
                            <tbody>
                              {weapons.melee.map((weapon: any, index: number) => (
                                <tr key={index} className="border-b border-gray-700">
                                  <td className="p-1 font-semibold">{weapon.name}</td>
                                  <td className="p-1">{weapon.range}</td>
                                  <td className="p-1">{weapon.attacks}</td>
                                  <td className="p-1">{weapon.weaponSkill}</td>
                                  <td className="p-1">{weapon.strength}</td>
                                  <td className="p-1">{weapon.armourPenetration}</td>
                                  <td className="p-1">{weapon.damage}</td>
                                  <td className="p-1 pl-4">{renderClickableKeywords(weapon.keywords)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {weapons.ranged.length === 0 && weapons.melee.length === 0 && (
                    <div className="text-gray-400 text-center py-2">
                      Aucune arme trouvée pour cette unité
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Panneau de détails des règles */}
        {selectedKeyword && (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mt-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-lg font-bold text-white">{selectedKeyword}</h4>
              <button
                onClick={() => setSelectedKeyword(null)}
                className="text-gray-400 hover:text-gray-200 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-200 text-sm leading-relaxed mb-2">
                {KEYWORD_RULES[selectedKeyword as keyof typeof KEYWORD_RULES]?.description}
              </p>
              <p className="text-gray-400 text-xs">
                Page {KEYWORD_RULES[selectedKeyword as keyof typeof KEYWORD_RULES]?.page} du Codex
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {activePlayer === 'player' ? 'Votre tour' : 'Tour adverse'}
              </h3>
              <span className="text-green-500 font-semibold">Tour {currentTurn}/5</span>
            </div>
            <div className="space-y-2">
              {phases.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => setCurrentPhase(phase.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    currentPhase === phase.id ? `${phase.color} text-white` : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <phase.icon className="h-5 w-5" />
                  <span>{phase.name}</span>
                </button>
              ))}
            </div>
            <button onClick={nextPhase} className="w-full mt-4 bg-green-600 hover:bg-green-700 p-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Phase suivante</span>
            </button>
          </div>


        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Unités ({armyData?.units?.length || 0})</h3>
          <div className="space-y-2 h-96 overflow-y-auto">
            {armyData?.units?.map((unit: any) => {
              const maxWounds = unit.totalWounds || parseInt(unit.stats?.W) || 1;
              const currentWounds = unitHealth[unit.id] !== undefined ? unitHealth[unit.id] : maxWounds;
              const isSelected = selectedUnit === unit.id;
              
              // Calculer le nombre de modèles restants
              const getRemainingModels = () => {
                if (unit.modelCount <= 1 || !unit.modelBreakdown || unit.modelBreakdown.length === 0) {
                  return unit.modelCount;
                }
                
                let remainingWounds = currentWounds;
                let remainingModels = 0;
                
                // Parcourir les types de modèles (du plus important au moins important)
                // On suppose que les modèles avec le plus de PV sont les plus importants
                const sortedModels = [...unit.modelBreakdown].sort((a, b) => b.wounds - a.wounds);
                
                for (const modelType of sortedModels) {
                  const modelsOfThisType = Math.min(
                    modelType.count,
                    Math.ceil(remainingWounds / modelType.wounds)
                  );
                  remainingModels += modelsOfThisType;
                  remainingWounds -= modelsOfThisType * modelType.wounds;
                  
                  if (remainingWounds <= 0) break;
                }
                
                return Math.max(0, remainingModels);
              };
              
              // Affichage du nom avec compteur de modèles
              const getUnitNameDisplay = () => {
                if (unit.modelCount > 1) {
                  const remainingModels = getRemainingModels();
                  return `${unit.name} x${remainingModels}`;
                } else {
                  return unit.name;
                }
              };
              
                             // Affichage des PV (revient au format original)
               // const getHealthDisplay = () => {
               //   return `${currentWounds}/${maxWounds} PV`;
               // };
              
              return (
                <div
                  key={unit.id}
                  onClick={() => setSelectedUnit(isSelected ? null : unit.id)}
                  className={`p-3 rounded-lg transition-colors border cursor-pointer ${
                    currentWounds === 0 
                      ? 'bg-gray-800 border-gray-700 opacity-50' 
                      : isSelected 
                        ? 'bg-blue-900 border-blue-500' 
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{getUnitNameDisplay()}</h4>
                      <div className="text-sm text-gray-400">
                        {unit.stats && (
                          <span>M:{unit.stats.M} T:{unit.stats.T} SV:{unit.stats.SV} W:{unit.stats.W}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-yellow-500">{unit.points}pts</div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateUnitHealth(unit.id, currentWounds - 1);
                          }}
                          disabled={currentWounds === 0}
                          className={`px-2 py-1 rounded text-xs ${
                            currentWounds === 0 
                              ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          -
                        </button>
                        <span className={`text-sm font-bold mx-2 ${currentWounds === 0 ? 'text-red-400' : ''}`}>
                          {currentWounds}/{maxWounds}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateUnitHealth(unit.id, Math.min(maxWounds, currentWounds + 1));
                          }}
                          className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">
            {selectedUnit 
              ? `${armyData?.units?.find((u: any) => u.id === selectedUnit)?.name} - ${phases.find(p => p.id === currentPhase)?.name}`
              : `Suggestions - ${phases.find(p => p.id === currentPhase)?.name}`
            }
          </h3>
          <div className="space-y-3 h-96 overflow-y-auto">
            {suggestions.map((suggestion: any, index: number) => (
              <div key={index} className="bg-gray-700 rounded-lg p-3">
                {(suggestion.type === 'ability' || suggestion.type === 'stratagem' || suggestion.type === 'battle-shock') ? (
                  <button 
                    onClick={() => setExpandedRules(prev => ({
                      ...prev,
                      [`suggestion-${index}`]: !prev[`suggestion-${index}`]
                    }))}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`text-sm font-semibold mb-1 ${
                          suggestion.type === 'phase' ? 'text-blue-400' :
                          suggestion.type === 'ability' ? 'text-green-400' :
                          suggestion.type === 'equipment' ? 'text-yellow-400' :
                          suggestion.type === 'detachment' ? 'text-purple-400' :
                          suggestion.type === 'info' ? 'text-cyan-400' :
                          suggestion.type === 'help' ? 'text-orange-400' :
                          suggestion.type === 'stratagem' ? 'text-pink-400' :
                          suggestion.type === 'battle-shock' ? 'text-red-400' :
                          'text-gray-400'
                        }`}>
                          {suggestion.text}
                        </div>
                        {!expandedRules[`suggestion-${index}`] && (
                          <div className="text-xs text-gray-300">{suggestion.detail?.substring(0, 80)}...</div>
                        )}
                      </div>
                      <span className={`transition-colors ml-2 ${
                        suggestion.type === 'ability' ? 'text-gray-400 hover:text-green-400' :
                        suggestion.type === 'stratagem' ? 'text-gray-400 hover:text-pink-400' :
                        suggestion.type === 'battle-shock' ? 'text-gray-400 hover:text-red-400' :
                        'text-gray-400 hover:text-orange-400'
                      }`}>
                        {expandedRules[`suggestion-${index}`] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className={`text-sm font-semibold mb-1 ${
                        suggestion.type === 'phase' ? 'text-blue-400' :
                        suggestion.type === 'ability' ? 'text-green-400' :
                        suggestion.type === 'equipment' ? 'text-yellow-400' :
                        suggestion.type === 'detachment' ? 'text-purple-400' :
                        suggestion.type === 'info' ? 'text-cyan-400' :
                        suggestion.type === 'help' ? 'text-orange-400' :
                        suggestion.type === 'stratagem' ? 'text-pink-400' :
                        suggestion.type === 'battle-shock' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {suggestion.text}
                      </div>
                      {!expandedRules[`suggestion-${index}`] && (
                        <div className="text-xs text-gray-300">{suggestion.detail?.substring(0, 80)}...</div>
                      )}
                    </div>
                  </div>
                )}
                {expandedRules[`suggestion-${index}`] && (suggestion.type === 'ability' || suggestion.type === 'stratagem' || suggestion.type === 'battle-shock') && (
                  <div className={`mt-2 p-2 rounded text-xs text-gray-200 leading-relaxed ${
                    suggestion.type === 'ability' ? 'bg-gray-800' :
                    suggestion.type === 'stratagem' ? 'bg-pink-900 border border-pink-600' :
                    suggestion.type === 'battle-shock' ? 'bg-red-900 border border-red-600' :
                    'bg-gray-800'
                  }`}>
                    {suggestion.detail}
                    {suggestion.type === 'stratagem' && (
                      <div className="mt-2 text-pink-300">
                        <div><strong>Coût:</strong> {suggestion.cost}CP</div>
                        <div><strong>Fréquence:</strong> {suggestion.frequency === 'once_per_turn' ? 'Une fois par tour' : 'Une fois par bataille'}</div>
                        {!suggestion.affordable && <div className="text-red-400"><strong>⚠️ Pas assez de CP</strong></div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {/* Message géré maintenant par la logique globale unifiée */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Warhammer40kAssistant;