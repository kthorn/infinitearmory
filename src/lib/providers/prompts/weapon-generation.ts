import {
  FANTASY_WEAPON_SCHEMA_DESCRIPTION,
  SCIFI_HANDHELD_SCHEMA_DESCRIPTION,
  TURRET_SCHEMA_DESCRIPTION,
  MECH_SCHEMA_DESCRIPTION,
} from '@/lib/schemas'
import type { GenerationOptions } from '@/lib/schemas'

export function buildWeaponPrompt(userPrompt: string, options: GenerationOptions): string {
  const category = options.category ?? 'fantasy_weapon'

  switch (category) {
    case 'fantasy_weapon':
      return buildFantasyWeaponPrompt(userPrompt, options)
    case 'scifi_handheld':
      return buildSciFiHandheldPrompt(userPrompt, options)
    case 'scifi_turret':
      return buildTurretPrompt(userPrompt, options)
    case 'mech':
      return buildMechPrompt(userPrompt, options)
  }
}

function buildFantasyWeaponPrompt(userPrompt: string, options: GenerationOptions): string {
  const rarityInstruction = getRarityInstruction(options)

  return `You are a fantasy game designer creating a magical weapon for a tabletop RPG.

USER'S CONCEPT:
${userPrompt}

REQUIREMENTS:
- Use D&D 5th Edition rules. Damage dice, properties, and bonuses should match 5e conventions. Reference PHB/DMG item formats.
- ${rarityInstruction}
- Create a balanced, interesting weapon that fits the concept
- Include evocative flavor text that tells a story
- Effects should be mechanically clear and balanced for the rarity

OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "weaponSpec": ${FANTASY_WEAPON_SCHEMA_DESCRIPTION},
  "descriptionMd": "Markdown formatted flavor text (2-4 paragraphs). Include the weapon's history, appearance, and any legends associated with it. Use headers and formatting for readability."
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- All string values must be properly escaped
- The rulesText should be complete and self-contained
- Tags should be lowercase, single words or short phrases
- Keep the ENTIRE response under 4000 characters to ensure valid JSON output
- Be concise: limit effects to 3-5, keep descriptions to 2-3 short paragraphs, and keep rulesText brief
- Avoid redundancy between effects and rulesText — rulesText should summarize, not repeat every detail verbatim`
}

function buildSciFiHandheldPrompt(userPrompt: string, options: GenerationOptions): string {
  const rarityInstruction = getRarityInstruction(options)

  return `You are a sci-fi weapon designer creating a handheld weapon for a tabletop RPG set in a futuristic universe.

USER'S CONCEPT:
${userPrompt}

REQUIREMENTS:
- Use generic sci-fi RPG conventions. Damage dice follow standard RPG formats (XdY). Stats should feel balanced for a futuristic setting.
- ${rarityInstruction}
- Create a weapon that feels technologically plausible and interesting
- Include lore about its manufacturer, technology, or history
- Effects should reference sci-fi mechanics (ammo, energy, overcharge, etc.)
- Damage types should be sci-fi appropriate: plasma, laser, kinetic, explosive, emp, ion (or standard types like fire if fitting)

OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "weaponSpec": ${SCIFI_HANDHELD_SCHEMA_DESCRIPTION},
  "descriptionMd": "Markdown formatted flavor text (2-4 paragraphs). Include the weapon's manufacturer, tech specs, and any notable history. Use headers and formatting for readability."
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- All string values must be properly escaped
- The rulesText should be complete and self-contained
- Tags should be lowercase, single words or short phrases
- Keep the ENTIRE response under 4000 characters to ensure valid JSON output
- Be concise: limit effects to 3-5, keep descriptions to 2-3 short paragraphs, and keep rulesText brief`
}

function buildTurretPrompt(userPrompt: string, options: GenerationOptions): string {
  const rarityInstruction = getRarityInstruction(options)

  return `You are a sci-fi defense systems engineer designing a turret or emplaced weapon for a tabletop RPG.

USER'S CONCEPT:
${userPrompt}

REQUIREMENTS:
- Use generic sci-fi RPG conventions. Damage dice follow standard RPG formats (XdY). Stats should feel balanced for a futuristic setting.
- ${rarityInstruction}
- Focus on deployment context: where is this turret mounted, what does it defend, how is it operated
- Include details about power requirements, crew needs, and setup/teardown
- Effects should reference tactical mechanics (area denial, suppression, tracking, etc.)

OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "weaponSpec": ${TURRET_SCHEMA_DESCRIPTION},
  "descriptionMd": "Markdown formatted flavor text (2-4 paragraphs). Include deployment context, tactical role, and any notable engagements. Use headers and formatting for readability."
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- All string values must be properly escaped
- The rulesText should be complete and self-contained
- Tags should be lowercase, single words or short phrases
- Keep the ENTIRE response under 4000 characters to ensure valid JSON output
- Be concise: limit effects to 3-5, keep descriptions to 2-3 short paragraphs, and keep rulesText brief`
}

function buildMechPrompt(userPrompt: string, options: GenerationOptions): string {
  const rarityInstruction = getRarityInstruction(options)

  return `You are a BattleTech-inspired mech designer creating a combat mech for a tabletop RPG.

USER'S CONCEPT:
${userPrompt}

REQUIREMENTS:
- Use BattleTech-inspired rules. Tonnage determines mech class (light: 20-35, medium: 40-55, heavy: 60-75, assault: 80-100).
- ${rarityInstruction}
- Design a balanced mech with appropriate weapon loadout for its class
- Heat management is critical: total heat generated by weapons should not exceed heatCapacity
- Include 1-6 weapon systems with appropriate locations (left arm, right arm, left torso, right torso, center torso, head)
- The "damage" field in the base spec should match the first weaponSystems entry's damage
- Special systems add flavor (ECM Suite, Targeting Computer, Jump Jets, CASE, etc.)

OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "weaponSpec": ${MECH_SCHEMA_DESCRIPTION},
  "descriptionMd": "Markdown formatted flavor text (2-4 paragraphs). Include the mech's design history, combat role, and any notable battles. Use headers and formatting for readability."
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- All string values must be properly escaped
- The rulesText should be complete and self-contained
- Tags should be lowercase, single words or short phrases
- Keep the ENTIRE response under 5000 characters to ensure valid JSON output
- Be concise: limit effects to 3-5, keep descriptions to 2-3 short paragraphs, and keep rulesText brief`
}

function getRarityInstruction(options: GenerationOptions): string {
  return options.rarity
    ? `The item should be of ${options.rarity.replace('_', ' ')} rarity.`
    : 'Choose an appropriate rarity based on the concept.'
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
