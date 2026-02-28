import { useState, useCallback, useRef, useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────
   HSE-specific dictionary for predictive text & auto-correction
   ───────────────────────────────────────────────────────────── */

// Common HSE words/phrases for next-word prediction (grouped by context)
const HSE_DICTIONARY: string[] = [
  // Incident / Accident
  'incident', 'accident', 'near miss', 'near-miss', 'fatality', 'first aid',
  'lost time injury', 'medical treatment', 'restricted work', 'recordable',
  'property damage', 'environmental release', 'spill', 'leak', 'exposure',
  'collapse', 'entrapment', 'struck by', 'caught in', 'fall from height',
  'slip trip fall', 'electrocution', 'burn', 'chemical burn', 'heat stress',
  'cold stress', 'drowning', 'suffocation', 'asphyxiation',

  // Hazard types
  'hazard', 'hazardous', 'biological hazard', 'chemical hazard',
  'physical hazard', 'ergonomic hazard', 'psychosocial hazard',
  'radiation hazard', 'mechanical hazard', 'electrical hazard',
  'fire hazard', 'explosion hazard', 'confined space',
  'working at height', 'excavation', 'hot work', 'lifting operation',
  'manual handling', 'noise exposure', 'vibration exposure',

  // Safety equipment / PPE
  'personal protective equipment', 'PPE', 'hard hat', 'helmet',
  'safety glasses', 'safety goggles', 'face shield', 'ear plugs',
  'ear muffs', 'hearing protection', 'respirator', 'dust mask',
  'N95 mask', 'full face respirator', 'SCBA', 'safety harness',
  'fall arrest', 'lanyard', 'safety boots', 'steel toe boots',
  'high visibility vest', 'hi-vis vest', 'reflective vest',
  'chemical suit', 'fire resistant clothing', 'welding shield',
  'safety gloves', 'nitrile gloves', 'leather gloves', 'rubber gloves',
  'life jacket', 'safety net', 'barricade', 'guardrail',

  // Observations
  'observation', 'unsafe act', 'unsafe condition', 'safe behavior',
  'at-risk behavior', 'positive observation', 'negative observation',
  'behavioral observation', 'housekeeping', 'good practice',
  'non-compliance', 'violation', 'deviation', 'deficiency',

  // Risk assessment
  'risk assessment', 'risk analysis', 'risk evaluation', 'risk matrix',
  'job hazard analysis', 'JHA', 'job safety analysis', 'JSA',
  'hazard identification', 'HIRA', 'task risk assessment', 'TRA',
  'HAZOP', 'bow tie analysis', 'fault tree analysis',
  'likelihood', 'consequence', 'severity', 'probability',
  'risk rating', 'high risk', 'medium risk', 'low risk', 'critical risk',
  'residual risk', 'inherent risk', 'risk control', 'risk mitigation',
  'hierarchy of controls', 'elimination', 'substitution',
  'engineering controls', 'administrative controls',

  // Permits
  'permit to work', 'PTW', 'hot work permit', 'cold work permit',
  'confined space entry', 'excavation permit', 'electrical isolation',
  'lockout tagout', 'LOTO', 'energy isolation', 'work at height permit',
  'lifting permit', 'radiography permit', 'demolition permit',

  // Investigation
  'investigation', 'root cause', 'root cause analysis', 'RCA',
  'contributing factor', 'immediate cause', 'underlying cause',
  'corrective action', 'preventive action', 'CAPA',
  'lessons learned', 'witness statement', 'evidence collection',
  'timeline analysis', 'fishbone diagram', 'Ishikawa',
  '5 whys', 'five whys', 'barrier analysis',

  // Inspection / Audit
  'inspection', 'audit', 'compliance audit', 'safety audit',
  'workplace inspection', 'equipment inspection', 'vehicle inspection',
  'crane inspection', 'scaffold inspection', 'fire extinguisher inspection',
  'non-conformance', 'corrective action required', 'observation noted',
  'finding', 'recommendation', 'improvement opportunity',

  // Environmental
  'environmental', 'environmental impact', 'air quality', 'water quality',
  'soil contamination', 'waste management', 'hazardous waste',
  'waste disposal', 'recycling', 'emissions', 'greenhouse gas',
  'noise pollution', 'dust control', 'erosion control',
  'stormwater management', 'containment', 'secondary containment',
  'bund wall', 'spill kit', 'spill response', 'cleanup',

  // Emergency
  'emergency', 'emergency response', 'emergency evacuation',
  'muster point', 'assembly point', 'emergency drill',
  'fire drill', 'fire alarm', 'fire suppression',
  'first responder', 'paramedic', 'ambulance', 'hospital',
  'emergency contact', 'emergency plan', 'crisis management',
  'business continuity', 'disaster recovery',

  // Training
  'training', 'competency', 'certification', 'qualification',
  'induction', 'orientation', 'toolbox talk', 'safety briefing',
  'safety meeting', 'safety stand-down', 'refresher training',
  'competency assessment', 'skill verification',

  // Documentation
  'procedure', 'policy', 'standard', 'guideline', 'regulation',
  'safe work method statement', 'SWMS', 'standard operating procedure', 'SOP',
  'material safety data sheet', 'MSDS', 'safety data sheet', 'SDS',
  'work instruction', 'method statement', 'risk register',

  // Locations / Areas
  'construction site', 'workshop', 'warehouse', 'office',
  'storage area', 'loading bay', 'parking area', 'rooftop',
  'basement', 'control room', 'laboratory', 'plant room',
  'scaffolding', 'platform', 'ladder', 'stairway',
  'walkway', 'corridor', 'entrance', 'exit',

  // Actions / Status
  'completed', 'in progress', 'pending', 'overdue', 'cancelled',
  'approved', 'rejected', 'under review', 'assigned', 'escalated',
  'implemented', 'verified', 'closed', 'open', 'resolved',

  // Contractor / Worker
  'contractor', 'subcontractor', 'supervisor', 'foreman',
  'safety officer', 'HSE manager', 'site manager', 'project manager',
  'worker', 'employee', 'visitor', 'operator', 'technician',
  'electrician', 'plumber', 'welder', 'rigger', 'scaffolder',
  'crane operator', 'driver', 'laborer',

  // Body parts (for injury reporting)
  'head', 'face', 'eye', 'ear', 'neck', 'shoulder', 'arm',
  'elbow', 'wrist', 'hand', 'finger', 'chest', 'back',
  'abdomen', 'hip', 'leg', 'knee', 'ankle', 'foot', 'toe',

  // Common verbs / phrases in reports
  'reported', 'observed', 'identified', 'discovered', 'noticed',
  'investigated', 'reviewed', 'assessed', 'inspected', 'monitored',
  'implemented', 'installed', 'removed', 'replaced', 'repaired',
  'damaged', 'broken', 'malfunctioning', 'defective', 'worn out',
  'missing', 'inadequate', 'insufficient', 'excessive', 'unauthorized',
];

// Common misspellings → corrections (HSE-domain focused)
const AUTO_CORRECTIONS: Record<string, string> = {
  // HSE terms
  'incidnet': 'incident', 'incdient': 'incident', 'indcident': 'incident',
  'incedent': 'incident', 'incidant': 'incident', 'inicdent': 'incident',
  'accidnet': 'accident', 'acident': 'accident', 'accidant': 'accident',
  'accdient': 'accident', 'acciddent': 'accident',
  'obdervation': 'observation', 'observaton': 'observation', 'observartion': 'observation',
  'obsevation': 'observation', 'obervation': 'observation', 'observaion': 'observation',
  'hazzard': 'hazard', 'hazrad': 'hazard', 'hzard': 'hazard', 'hazaard': 'hazard',
  'hazzardous': 'hazardous', 'hazardus': 'hazardous', 'hazradous': 'hazardous',
  'safty': 'safety', 'saftey': 'safety', 'safetey': 'safety', 'saefty': 'safety',
  'emergancy': 'emergency', 'emeregncy': 'emergency', 'emergnecy': 'emergency',
  'emegency': 'emergency', 'emmergency': 'emergency',
  'inspction': 'inspection', 'inpsection': 'inspection', 'insepction': 'inspection',
  'inspeciton': 'inspection', 'inspecton': 'inspection',
  'enviornmental': 'environmental', 'envirnomental': 'environmental',
  'enviromental': 'environmental', 'environmetal': 'environmental',
  'assesment': 'assessment', 'assessement': 'assessment', 'assesement': 'assessment',
  'asessment': 'assessment', 'assessmnet': 'assessment',
  'complinace': 'compliance', 'complience': 'compliance', 'complaince': 'compliance',
  'compliane': 'compliance', 'compiance': 'compliance',
  'equpiment': 'equipment', 'equipement': 'equipment', 'euqipment': 'equipment',
  'equipmnet': 'equipment', 'eqipment': 'equipment',
  'contrcator': 'contractor', 'contarctor': 'contractor', 'contractr': 'contractor',
  'contactor': 'contractor', 'contracter': 'contractor',
  'proceedure': 'procedure', 'procedrue': 'procedure', 'procudure': 'procedure',
  'proceduer': 'procedure', 'prcedure': 'procedure',
  'investigaton': 'investigation', 'investiagtion': 'investigation',
  'investigaiton': 'investigation', 'investgation': 'investigation',
  'corrctive': 'corrective', 'corective': 'corrective', 'correctve': 'corrective',
  'preventve': 'preventive', 'preventative': 'preventive', 'prevetive': 'preventive',
  'traning': 'training', 'trianing': 'training', 'trainig': 'training',
  'certificaton': 'certification', 'certifcation': 'certification',
  'regulaton': 'regulation', 'regulaion': 'regulation', 'regluation': 'regulation',
  'scaffolidng': 'scaffolding', 'scaffoldig': 'scaffolding', 'sacffolding': 'scaffolding',
  'excavaton': 'excavation', 'excvation': 'excavation', 'exavation': 'excavation',
  'permt': 'permit', 'pemrit': 'permit', 'perimt': 'permit',
  'eletrical': 'electrical', 'elctrical': 'electrical', 'electricl': 'electrical',
  'mechancial': 'mechanical', 'mechancal': 'mechanical', 'mechanial': 'mechanical',
  'resposne': 'response', 'reponse': 'response', 'respnose': 'response',
  'locaton': 'location', 'loaction': 'location', 'locaiton': 'location',
  'descripion': 'description', 'descrption': 'description', 'descripton': 'description',
  'reccomend': 'recommend', 'recomend': 'recommend', 'recommed': 'recommend',
  'recomendation': 'recommendation', 'reccomendation': 'recommendation',
  'maintenace': 'maintenance', 'maintanance': 'maintenance', 'maintnance': 'maintenance',
  'elevaton': 'elevation', 'elevaion': 'elevation',
  'protcetive': 'protective', 'protecitve': 'protective', 'protetive': 'protective',
  'resporator': 'respirator', 'repirator': 'respirator', 'respiartor': 'respirator',
  'harnes': 'harness', 'harnss': 'harness', 'hraness': 'harness',
  'guardrials': 'guardrails', 'gaurdrial': 'guardrail', 'guardrail': 'guardrail',
  'baricade': 'barricade', 'barrcade': 'barricade', 'barriade': 'barricade',
  'supervior': 'supervisor', 'supevisor': 'supervisor', 'superviser': 'supervisor',
  'laboror': 'laborer', 'labourer': 'laborer',

  // Common English misspellings
  'teh': 'the', 'adn': 'and', 'taht': 'that', 'thier': 'their',
  'recieve': 'receive', 'occured': 'occurred',
  'seperate': 'separate', 'definately': 'definitely', 'neccessary': 'necessary',
  'occassion': 'occasion', 'accomodate': 'accommodate', 'acheive': 'achieve',
  'beleive': 'believe', 'calender': 'calendar', 'commited': 'committed',
  'immedietly': 'immediately', 'immediatly': 'immediately', 'immediatley': 'immediately',
  'occurence': 'occurrence', 'occurance': 'occurrence',
  'reffer': 'refer', 'refered': 'referred', 'untill': 'until',
  'wether': 'whether', 'wich': 'which', 'wiht': 'with',
  'becuase': 'because', 'becasue': 'because', 'beacuse': 'because',
  'requirments': 'requirements', 'reqirements': 'requirements',
  'managment': 'management', 'mangement': 'management', 'managemnt': 'management',
  'appropirate': 'appropriate', 'approriate': 'appropriate', 'appopriate': 'appropriate',
  'documnet': 'document', 'docuemnt': 'document', 'doument': 'document',
  'reportd': 'reported', 'reorted': 'reported',
};

/* ─────────────────────────────────────────────────────────────
   Fuzzy matching helpers
   ───────────────────────────────────────────────────────────── */

/** Simple Levenshtein distance for short strings */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Get the current word being typed (from cursor position backwards) */
function getCurrentWord(text: string, cursorPos: number): { word: string; start: number; end: number } {
  let start = cursorPos;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  let end = cursorPos;
  // word ends at cursor
  return { word: text.slice(start, end), start, end };
}

/* ─────────────────────────────────────────────────────────────
   useAutoComplete hook
   ───────────────────────────────────────────────────────────── */

export interface Suggestion {
  text: string;
  type: 'word' | 'correction';
}

interface UseAutoCompleteOptions {
  /** Maximum suggestions shown (default 5) */
  maxSuggestions?: number;
  /** Minimum characters before suggestions appear (default 2) */
  minChars?: number;
  /** Enable auto-correction on space (default true) */
  autoCorrect?: boolean;
}

export function useAutoComplete(options: UseAutoCompleteOptions = {}) {
  const { maxSuggestions = 5, minChars = 2, autoCorrect = true } = options;

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const currentWordRef = useRef({ word: '', start: 0, end: 0 });

  /** Compute suggestions for the current word fragment */
  const computeSuggestions = useCallback(
    (text: string, cursorPos: number) => {
      const info = getCurrentWord(text, cursorPos);
      currentWordRef.current = info;
      const fragment = info.word.toLowerCase();

      if (fragment.length < minChars) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const results: Suggestion[] = [];

      // 1. Exact-prefix matches from dictionary
      const prefixMatches = HSE_DICTIONARY
        .filter(w => w.toLowerCase().startsWith(fragment) && w.toLowerCase() !== fragment)
        .slice(0, maxSuggestions);
      prefixMatches.forEach(w => results.push({ text: w, type: 'word' }));

      // 2. If not enough, fuzzy matches (Levenshtein ≤ 2)
      if (results.length < maxSuggestions && fragment.length >= 3) {
        const remaining = maxSuggestions - results.length;
        const fuzzy = HSE_DICTIONARY
          .filter(w => {
            if (w.toLowerCase().startsWith(fragment)) return false; // already included
            // Only check single words for fuzzy (multi-word phrases checked by first word)
            const first = w.split(' ')[0].toLowerCase();
            return levenshtein(fragment, first) <= 2 && levenshtein(fragment, first) > 0;
          })
          .slice(0, remaining);
        fuzzy.forEach(w => results.push({ text: w, type: 'word' }));
      }

      // 3. Check auto-correction dictionary
      const correction = AUTO_CORRECTIONS[fragment];
      if (correction && !results.some(r => r.text.toLowerCase() === correction)) {
        results.unshift({ text: correction, type: 'correction' });
        if (results.length > maxSuggestions) results.pop();
      }

      setSuggestions(results);
      setSelectedIndex(-1);
      setShowSuggestions(results.length > 0);
    },
    [maxSuggestions, minChars],
  );

  /** Apply a suggestion: replace the current word fragment */
  const applySuggestion = useCallback(
    (
      suggestion: Suggestion,
      text: string,
      setText: (v: string) => void,
      inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    ) => {
      const { start, end } = currentWordRef.current;
      const before = text.slice(0, start);
      const after = text.slice(end);
      const newText = before + suggestion.text + ' ' + after;
      setText(newText);
      setShowSuggestions(false);
      setSuggestions([]);

      // Move cursor after the inserted word
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const pos = start + suggestion.text.length + 1;
          inputRef.current.setSelectionRange(pos, pos);
          inputRef.current.focus();
        }
      });
    },
    [],
  );

  /** Auto-correct on space: transparently fix misspelled words */
  const autoCorrectOnSpace = useCallback(
    (text: string, cursorPos: number): string | null => {
      if (!autoCorrect) return null;
      // Find the word that just ended (before the space)
      let end = cursorPos - 1; // before the space
      let start = end;
      while (start > 0 && !/\s/.test(text[start - 1])) start--;
      const word = text.slice(start, end + 1).toLowerCase(); // +1 because end is inclusive-ish
      // Actually let's recalculate: text[cursorPos-1] is the space, word is before it
      // Nah, let me do it properly:
      const beforeSpace = text.slice(0, cursorPos); // includes the space
      const match = beforeSpace.match(/(\S+)\s$/);
      if (!match) return null;
      const typed = match[1].toLowerCase();
      const fix = AUTO_CORRECTIONS[typed];
      if (!fix) return null;

      // Preserve original casing of first letter
      const corrected = match[1][0] === match[1][0].toUpperCase()
        ? fix.charAt(0).toUpperCase() + fix.slice(1)
        : fix;

      const wordStart = cursorPos - 1 - match[1].length;
      return text.slice(0, wordStart) + corrected + text.slice(cursorPos - 1);
    },
    [autoCorrect],
  );

  /** Handle keyboard navigation in suggestions */
  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      text: string,
      setText: (v: string) => void,
      inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    ) => {
      if (!showSuggestions || suggestions.length === 0) return false;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % suggestions.length);
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length);
        return true;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          applySuggestion(suggestions[selectedIndex], text, setText, inputRef);
          return true;
        }
        // If Tab with no selection, accept top suggestion
        if (e.key === 'Tab' && suggestions.length > 0) {
          e.preventDefault();
          applySuggestion(suggestions[0], text, setText, inputRef);
          return true;
        }
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return true;
      }
      return false;
    },
    [showSuggestions, suggestions, selectedIndex, applySuggestion],
  );

  const dismiss = useCallback(() => {
    setShowSuggestions(false);
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    selectedIndex,
    showSuggestions,
    computeSuggestions,
    applySuggestion,
    autoCorrectOnSpace,
    handleKeyDown,
    dismiss,
  };
}
