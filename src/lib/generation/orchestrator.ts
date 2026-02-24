import { db } from '@/lib/db'
import { getTextProvider, getImageProvider, buildImagePrompt, buildWeaponRefinementPrompt } from '@/lib/providers'
import { safeResolveImageProvider } from '@/lib/models'
import { uploadImage } from '@/lib/storage'
import { generationOptionsSchema, weaponSpecSchema, styleSchema } from '@/lib/schemas'
import { WEAPON_STATUS } from '@/types'
import { withRetry, isTransientError } from './retry'
import type { GenerationOptions } from '@/lib/schemas'

const PROMPT_VERSION = 'v1'

export interface GenerateWeaponParams {
  weaponId: string
  userPrompt: string
  options: GenerationOptions
}

/**
 * Run the full weapon generation pipeline
 * Updates database status at each step
 */
export async function generateWeapon({ weaponId, userPrompt, options }: GenerateWeaponParams): Promise<void> {
  try {
    // Step 1: Generate text (description + stats)
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_TEXT)

    const textProvider = getTextProvider(options.textModel)
    const textResult = await withRetry(
      () => textProvider.generateWeapon(userPrompt, options),
      {
        maxAttempts: 2,
        delayMs: 2000,
        shouldRetry: isTransientError,
      }
    )

    // Save text results
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        weaponSpec: JSON.stringify(textResult.weaponSpec),
        descriptionMd: textResult.descriptionMd,
        textModel: textResult.model,
        promptVersion: PROMPT_VERSION,
      },
    })

    // Step 2: Generate image
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_IMAGE)

    const imageProvider = getImageProvider(options.imageModel)
    const imagePrompt = buildImagePrompt(textResult.weaponSpec, options.style, userPrompt)

    const imageResult = await withRetry(
      () => imageProvider.generateImage(imagePrompt),
      {
        maxAttempts: 2,
        delayMs: 3000,
        shouldRetry: isTransientError,
      }
    )

    // Upload image to storage (propagate mimeType from provider)
    const { url: imageUrl } = await uploadImage({
      weaponId,
      imageData: imageResult.imageData,
      mimeType: imageResult.mimeType,
    })

    // Save image results and mark done
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        imageUrl,
        imagePrompt,
        imageModel: imageResult.model,
        status: WEAPON_STATUS.DONE,
      },
    })

    // Create version snapshot
    await createVersionAndActivate(weaponId)
  } catch (error) {
    // Delete failed weapon so it doesn't appear in the collection
    await db.weapon.delete({ where: { id: weaponId } }).catch(() => {
      // Ignore if already deleted
    })

    // Re-throw for logging
    throw error
  }
}

/**
 * Regenerate just the image for an existing weapon
 */
export async function regenerateImage(weaponId: string, style?: string, guidance?: string): Promise<void> {
  const weapon = await db.weapon.findUnique({ where: { id: weaponId } })
  if (!weapon) {
    throw new Error(`Weapon not found: ${weaponId}`)
  }
  if (!weapon.weaponSpec) {
    throw new Error(`Weapon has no spec: ${weaponId}`)
  }

  // Validate inputs before mutating status (prevents marking weapon as error on bad input)
  // Normalize legacy records that lack the `category` discriminator
  const rawSpec = JSON.parse(weapon.weaponSpec)
  if (rawSpec && !rawSpec.category) rawSpec.category = 'fantasy_weapon'
  const weaponSpec = weaponSpecSchema.parse(rawSpec)

  const rawOptions = JSON.parse(weapon.options)
  if (rawOptions && !rawOptions.category) rawOptions.category = 'fantasy_weapon'
  if (rawOptions?.ruleset === 'pathfinder2e' || rawOptions?.ruleset === 'generic') rawOptions.ruleset = 'dnd5e'
  const options = generationOptionsSchema.parse(rawOptions)
  const imageStyle = style ? styleSchema.parse(style) : options.style ?? 'fantasy_art'

  // Ensure pre-versioning weapons get a baseline version before modification
  await ensureBaselineVersion(weaponId)

  try {
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_IMAGE)

    const { model: imageModelId } = safeResolveImageProvider(options.imageModel)
    const imageProvider = getImageProvider(imageModelId)
    const previousImagePrompt = guidance?.trim() ? weapon.imagePrompt : undefined
    const imagePrompt = buildImagePrompt(weaponSpec, imageStyle, weapon.userPrompt, guidance, previousImagePrompt ?? undefined)

    const imageResult = await withRetry(
      () => imageProvider.generateImage(imagePrompt),
      {
        maxAttempts: 2,
        delayMs: 3000,
        shouldRetry: isTransientError,
      }
    )

    const { url: imageUrl } = await uploadImage({
      weaponId,
      imageData: imageResult.imageData,
      mimeType: imageResult.mimeType,
    })

    await db.weapon.update({
      where: { id: weaponId },
      data: {
        imageUrl,
        imagePrompt,
        imageModel: imageResult.model,
        status: WEAPON_STATUS.DONE,
      },
    })

    // Create version snapshot
    const version = await createVersionAndActivate(weaponId)
    if (guidance?.trim() && version) {
      await db.weaponVersion.update({
        where: { id: version.id },
        data: {
          refinementPrompt: guidance.trim(),
          refinementType: 'image',
        },
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        status: WEAPON_STATUS.ERROR,
        errorMessage,
      },
    })
    throw error
  }
}

/**
 * Reroll stats and regenerate everything
 */
export async function rerollWeapon(weaponId: string, guidance?: string): Promise<void> {
  const weapon = await db.weapon.findUnique({ where: { id: weaponId } })
  if (!weapon) {
    throw new Error(`Weapon not found: ${weaponId}`)
  }

  try {
    const rawOptions = JSON.parse(weapon.options)
    if (rawOptions && !rawOptions.category) rawOptions.category = 'fantasy_weapon'
    if (rawOptions?.ruleset === 'pathfinder2e' || rawOptions?.ruleset === 'generic') rawOptions.ruleset = 'dnd5e'
    const options = generationOptionsSchema.parse(rawOptions)

    // Ensure pre-versioning weapons get a baseline version before modification
    await ensureBaselineVersion(weaponId)

    if (guidance?.trim()) {
      // Refinement flow: use current spec + guidance to generate modified stats
      await refineWeaponStats(weaponId, weapon, options, guidance.trim())
      return
    }

    // Clear existing results (including model metadata to prevent stale data)
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        weaponSpec: null,
        descriptionMd: null,
        imageUrl: null,
        imagePrompt: null,
        textModel: null,
        imageModel: null,
        errorMessage: null,
        status: WEAPON_STATUS.QUEUED,
      },
    })

    // Run full pipeline
    await generateWeapon({
      weaponId,
      userPrompt: weapon.userPrompt,
      options,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        status: WEAPON_STATUS.ERROR,
        errorMessage,
      },
    })
    throw error
  }
}

/**
 * Refine weapon stats using guidance, preserving image.
 */
async function refineWeaponStats(
  weaponId: string,
  weapon: { userPrompt: string; weaponSpec: string | null; descriptionMd: string | null },
  options: GenerationOptions,
  guidance: string
): Promise<void> {
  if (!weapon.weaponSpec) {
    throw new Error(`Weapon has no spec to refine: ${weaponId}`)
  }

  await updateStatus(weaponId, WEAPON_STATUS.GENERATING_TEXT)

  const rawSpec = JSON.parse(weapon.weaponSpec)
  if (rawSpec && !rawSpec.category) rawSpec.category = 'fantasy_weapon'
  const category = rawSpec.category ?? 'fantasy_weapon'

  const textProvider = getTextProvider(options.textModel)
  const refinementPrompt = buildWeaponRefinementPrompt({
    userPrompt: weapon.userPrompt,
    currentSpec: weapon.weaponSpec,
    currentDescription: weapon.descriptionMd ?? '',
    guidance,
    category,
  })

  // Use generateRaw to avoid double-wrapping with buildWeaponPrompt
  const textResult = await withRetry(
    () => textProvider.generateRaw(refinementPrompt, options),
    {
      maxAttempts: 2,
      delayMs: 2000,
      shouldRetry: isTransientError,
    }
  )

  // Save refined text results, preserve existing image
  await db.weapon.update({
    where: { id: weaponId },
    data: {
      weaponSpec: JSON.stringify(textResult.weaponSpec),
      descriptionMd: textResult.descriptionMd,
      textModel: textResult.model,
      promptVersion: PROMPT_VERSION,
      status: WEAPON_STATUS.DONE,
    },
  })

  // Create version snapshot with refinement metadata
  const version = await createVersionAndActivate(weaponId)
  if (version) {
    await db.weaponVersion.update({
      where: { id: version.id },
      data: {
        refinementPrompt: guidance,
        refinementType: 'stats',
      },
    })
  }
}

/**
 * Create a new version snapshot and set it as active on the weapon.
 */
/**
 * Ensure a baseline version exists for weapons created before the versioning system.
 * Call this BEFORE modifying the weapon so the original state is preserved.
 */
async function ensureBaselineVersion(weaponId: string): Promise<void> {
  const versionCount = await db.weaponVersion.count({ where: { weaponId } })
  if (versionCount > 0) return

  const weapon = await db.weapon.findUnique({ where: { id: weaponId } })
  if (!weapon || !weapon.weaponSpec) return

  const version = await db.weaponVersion.create({
    data: {
      weaponId,
      versionNumber: 1,
      descriptionMd: weapon.descriptionMd,
      weaponSpec: weapon.weaponSpec,
      imageUrl: weapon.imageUrl,
      imagePrompt: weapon.imagePrompt,
      textModel: weapon.textModel,
      imageModel: weapon.imageModel,
    },
  })

  await db.weapon.update({
    where: { id: weaponId },
    data: { activeVersionId: version.id },
  })
}

async function createVersionAndActivate(weaponId: string): Promise<{ id: string } | null> {
  const weapon = await db.weapon.findUnique({ where: { id: weaponId } })
  if (!weapon) return null

  // Determine next version number
  const lastVersion = await db.weaponVersion.findFirst({
    where: { weaponId },
    orderBy: { versionNumber: 'desc' },
  })
  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1

  const version = await db.weaponVersion.create({
    data: {
      weaponId,
      versionNumber,
      descriptionMd: weapon.descriptionMd,
      weaponSpec: weapon.weaponSpec,
      imageUrl: weapon.imageUrl,
      imagePrompt: weapon.imagePrompt,
      textModel: weapon.textModel,
      imageModel: weapon.imageModel,
    },
  })

  await db.weapon.update({
    where: { id: weaponId },
    data: { activeVersionId: version.id },
  })

  return version
}

async function updateStatus(weaponId: string, status: (typeof WEAPON_STATUS)[keyof typeof WEAPON_STATUS]): Promise<void> {
  await db.weapon.update({
    where: { id: weaponId },
    data: { status, errorMessage: null },
  })
}
