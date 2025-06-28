import React, { useState, useEffect } from 'react';
import { Upload, Play, Users, Target, Zap, Shield, Sword, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';

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
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({});
  const [resolvedRules, setResolvedRules] = useState<Record<string, boolean>>({});

  const phases = [
    { id: 'command', name: 'Commandement', icon: Users, color: 'bg-blue-500' },
    { id: 'movement', name: 'Mouvement', icon: Target, color: 'bg-green-500' },
    { id: 'shooting', name: 'Tir', icon: Zap, color: 'bg-red-500' },
    { id: 'charge', name: 'Charge', icon: Sword, color: 'bg-orange-500' },
    { id: 'fight', name: 'Combat', icon: Shield, color: 'bg-purple-500' },
    { id: 'morale', name: 'Moral', icon: AlertCircle, color: 'bg-gray-500' }
  ];

  // Base de données des stratagèmes Leagues of Votann
  const LEAGUES_STRATAGEMS = [
    {
      name: "Newfound Nemesis",
      cost: 1,
      phase: "any",
      timing: "When unit reduced Below Half-strength",
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
      name: "Seismic Shock",
      cost: 1,
      phase: "shooting",
      timing: "When shooting with blast weapons",
      description: "Use this Stratagem when a LEAGUES OF VOTANN unit from your army shoots with a weapon that has the [BLAST] ability. Until the end of the phase, improve the Armour Penetration characteristic of that weapon by 1.",
      keywords: ["LEAGUES OF VOTANN", "BLAST"],
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
    {
      name: "Grudge-hunters",
      cost: 1,
      phase: "charge",
      timing: "When declaring a charge",
      description: "Use this Stratagem when a LEAGUES OF VOTANN unit from your army declares a charge. If any of the targets of that charge have one or more Judgement tokens, you can re-roll the charge roll.",
      keywords: ["LEAGUES OF VOTANN"],
      unitTypes: ["any"],
      frequency: "once_per_turn"
    }
  ];

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
        factionRules: roster.rules || []
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
    
    armyData.units?.forEach((unit: any) => {
      unit.rules?.forEach((rule: any) => {
        if (rule.name === 'Eye of the Ancestors' && !seenRules.has(rule.name)) {
          battleStartRules.push({
            source: 'Faction: Leagues of Votann',
            name: rule.name,
            description: rule.description,
            priority: 1
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
          priority: 2
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
  const getApplicableStratagems = (unit: any, phase: string, activePlayer: string) => {
    if (!unit) return [];
    
    return LEAGUES_STRATAGEMS.filter(stratagem => {
      // Filtrer par phase (permettre "any" ou phase exacte)
      if (stratagem.phase !== phase && stratagem.phase !== "any") return false;
      
      // Vérifier si le stratagème s'applique au type d'unité
      if (stratagem.unitTypes.includes("any")) return true;
      
      // Vérifier les mots-clés de l'unité
      const unitKeywords = unit.categories?.map((cat: any) => cat.name.toLowerCase()) || [];
      
      if (stratagem.unitTypes.includes("exo-armour")) {
        return unitKeywords.includes("exo-armour");
      }
      
      // Par défaut, applicable à toutes les unités Leagues of Votann
      return unitKeywords.includes("faction: leagues of votann");
    });
  };

  // Fonction pour générer les suggestions intelligentes
  const generateSuggestions = () => {
    const newSuggestions: any[] = [];

    // Suggestions générales pour la phase
    if (currentPhase === 'command') {
      newSuggestions.push({
        id: 'command-phase-start',
        text: '📋 Début de phase de commandement',
        detail: 'Gagnez 1 CP, activez les capacités de commandement',
        type: 'phase',
        phase: 'command'
      });
    }

    if (currentPhase === 'movement') {
      newSuggestions.push({
        id: 'movement-phase',
        text: '🏃 Phase de mouvement',
        detail: 'Déplacez vos unités selon leur valeur de Mouvement',
        type: 'phase',
        phase: 'movement'
      });
    }

    if (currentPhase === 'shooting') {
      newSuggestions.push({
        id: 'shooting-phase',
        text: '🎯 Phase de tir',
        detail: 'Sélectionnez les cibles et effectuez vos attaques à distance',
        type: 'phase',
        phase: 'shooting'
      });
    }

    if (currentPhase === 'charge') {
      newSuggestions.push({
        id: 'charge-phase',
        text: '⚡ Phase de charge',
        detail: 'Déclarez et résolvez les charges',
        type: 'phase',
        phase: 'charge'
      });
    }

    if (currentPhase === 'fight') {
      newSuggestions.push({
        id: 'fight-phase',
        text: '⚔️ Phase de combat',
        detail: 'Résolvez les combats au corps à corps',
        type: 'phase',
        phase: 'fight'
      });
    }

    // Suggestions d'habilités pour l'unité sélectionnée
    if (selectedUnit && armyData) {
      const unit = armyData.units.find((u: any) => u.id === selectedUnit);
      if (unit) {
        // Ajouter les habilités de l'unité
        if (unit.rules && unit.rules.length > 0) {
          unit.rules.forEach((rule: any) => {
            newSuggestions.push({
              id: `ability-${unit.id}-${rule.name}`,
              text: `✨ ${unit.name}: ${rule.name}`,
              detail: rule.description || 'Capacité spéciale de l\'unité',
              type: 'ability',
              phase: currentPhase,
              unit: unit.name
            });
          });
        }

        // Chercher les habilités dans les sélections de l'unité
        const findAbilities = (selections: any[]) => {
          if (!selections) return;
          
          selections.forEach((selection: any) => {
            if (selection.rules) {
              selection.rules.forEach((rule: any) => {
                const abilityName = rule.name || 'Capacité';
                const description = rule.description || 'Capacité spéciale';
                
                newSuggestions.push({
                  id: `ability-${unit.id}-${selection.name}-${abilityName}`,
                  text: `✨ ${unit.name}: ${abilityName}`,
                  detail: description,
                  type: 'ability',
                  phase: currentPhase,
                  unit: unit.name
                });
              });
            }
            
            if (selection.selections) {
              findAbilities(selection.selections);
            }
          });
        };
        
        findAbilities(unit.selections);

        // Suggestions de stratagèmes pour l'unité sélectionnée
        const applicableStratagems = getApplicableStratagems(unit, currentPhase, activePlayer);
        
        applicableStratagems.forEach(stratagem => {
          // Vérifier si on a assez de CP
          const canAfford = commandPoints >= stratagem.cost;
          
          newSuggestions.push({
            id: `stratagem-${stratagem.name}`,
            text: `🎯 ${stratagem.name} (${stratagem.cost}CP)`,
            detail: `${stratagem.timing} - ${stratagem.description}${canAfford ? '' : ' ⚠️ Pas assez de CP'}`,
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
    setSuggestions(generateSuggestions());
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
            disabled={battleStartRules.length > 0 && !battleStartRules.every((_, index) => resolvedRules[index])}
            className={`px-8 py-4 rounded-lg transition-colors text-lg font-semibold flex items-center justify-center mx-auto space-x-3 ${
              battleStartRules.length === 0 || battleStartRules.every((_, index) => resolvedRules[index])
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
          <div className="flex items-center space-x-4">
            <span className="text-yellow-500">{armyData?.totalPoints} pts</span>
          </div>
        </div>
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

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Points de Commandement</h3>
            <div className="flex items-center space-x-2">
              <button onClick={() => setCommandPoints(Math.max(0, commandPoints - 1))} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded">-1</button>
              <span className="text-xl font-bold mx-4">{commandPoints}</span>
              <button onClick={() => setCommandPoints(commandPoints + 1)} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded">+1</button>
            </div>
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
              const getHealthDisplay = () => {
                return `${currentWounds}/${maxWounds} PV`;
              };
              
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
                      'text-gray-400'
                    }`}>
                      {suggestion.text}
                    </div>
                    {!expandedRules[`suggestion-${index}`] && (
                      <div className="text-xs text-gray-300">{suggestion.detail?.substring(0, 80)}...</div>
                    )}
                  </div>
                  {(suggestion.type === 'ability' || suggestion.type === 'stratagem') && (
                    <button 
                      onClick={() => setExpandedRules(prev => ({
                        ...prev,
                        [`suggestion-${index}`]: !prev[`suggestion-${index}`]
                      }))}
                      className={`transition-colors ml-2 ${
                        suggestion.type === 'ability' ? 'text-gray-400 hover:text-green-400' :
                        'text-gray-400 hover:text-pink-400'
                      }`}
                    >
                      {expandedRules[`suggestion-${index}`] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {expandedRules[`suggestion-${index}`] && (suggestion.type === 'ability' || suggestion.type === 'stratagem') && (
                  <div className={`mt-2 p-2 rounded text-xs text-gray-200 leading-relaxed ${
                    suggestion.type === 'ability' ? 'bg-gray-800' : 'bg-pink-900 border border-pink-600'
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
            
            {suggestions.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>Sélectionnez une unité pour voir les suggestions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Warhammer40kAssistant;