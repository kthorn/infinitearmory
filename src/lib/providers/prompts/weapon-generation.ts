import { WEAPON_SPEC_SCHEMA_DESCRIPTION } from '@/lib/schemas'
import type { GenerationOptions } from '@/lib/schemas'

export function buildWeaponPrompt(userPrompt: string, options: GenerationOptions): string {
  const rulesetInstructions = getRulesetInstructions(options.ruleset)
  const rarityInstruction = options.rarity
    ? `The weapon should be of ${options.rarity.replace('_', ' ')} rarity.`
    : 'Choose an appropriate rarity based on the concept.'

  return `You are a fantasy game designer creating a magical weapon for a tabletop RPG.

USER'S CONCEPT:
${userPrompt}

REQUIREMENTS:
- ${rulesetInstructions}
- ${rarityInstruction}
- Create a balanced, interesting weapon that fits the concept
- Include evocative flavor text that tells a story
- Effects should be mechanically clear and balanced for the rarity

OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "weaponSpec": ${WEAPON_SPEC_SCHEMA_DESCRIPTION},
  "descriptionMd": "Markdown formatted flavor text (2-4 paragraphs). Include the weapon's history, appearance, and any legends associated with it. Use headers and formatting for readability."
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- All string values must be properly escaped
- The rulesText should be complete and self-contained
- Tags should be lowercase, single words or short phrases`
}

function getRulesetInstructions(ruleset: string): string {
  switch (ruleset) {
    case 'dnd5e':
      return 'Use D&D 5th Edition rules. Damage dice, properties, and bonuses should match 5e conventions. Reference PHB/DMG item formats.'
    case 'pathfinder2e':
      return 'Use Pathfinder 2e rules. Include appropriate traits, damage dice, and activation requirements per PF2e conventions.'
    case 'generic':
    default:
      return 'Use generic fantasy RPG conventions. Keep mechanics simple and adaptable to various systems.'
  }
}

export function buildRepairPrompt(invalidJson: string, error: string): string {
  return `The following JSON is invalid and needs to be fixed:

\`\`\`json
${invalidJson}
\`\`\`

ERROR: ${error}

Please fix the JSON and return ONLY the corrected JSON object. Ensure:
1. All strings are properly escaped
2. All required fields are present
3. The structure matches the expected schema exactly
4. No trailing commas
5. No comments

Return ONLY the fixed JSON, nothing else.`
}

/**
 * Strip markdown code fences from LLM output.
 * Some models wrap JSON in ```json ... ``` blocks.
 */
export function stripCodeFences(text: string): string {
  let content = text.trim()
  if (content.startsWith('```json')) {
    content = content.slice(7)
  } else if (content.startsWith('```')) {
    content = content.slice(3)
  }
  if (content.endsWith('```')) {
    content = content.slice(0, -3)
  }
  return content.trim()
}
