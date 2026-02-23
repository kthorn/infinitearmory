# Prompt Tracking & JSON Download Implementation Plan

**Status:** Refined

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Surface model/prompt metadata on weapon detail pages, add a JSON download button, and enable "regenerate with different model" flow for easy comparison.

**Architecture:** All data already exists in the DB (`userPrompt`, `textModel`, `imageModel`, `options`). We add UI components to display this metadata, a client-side download function, and a "remix" button that pre-fills the creation form with the same prompt but allows changing models.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS, TypeScript, Vitest

---

### Task 1: Show Model Info on Weapon Detail Page

Add a full-width metadata bar below the 2-column grid in `WeaponCard` that shows the text model, image model, and art style used.

**Files:**
- Modify: `src/components/weapon-card.tsx` (after the grid's closing `</div>`)
- Modify: `src/lib/models.ts` (add label lookup helper)

**Step 1: Add model label lookup to `src/lib/models.ts`**

Add this function after `getAllImageModels()` (after line 65):

```typescript
export function getModelLabel(modelId: string): string {
  for (const models of Object.values(TEXT_MODELS)) {
    const found = models.find((m) => m.id === modelId)
    if (found) return found.label
  }
  for (const models of Object.values(IMAGE_MODELS)) {
    const found = models.find((m) => m.id === modelId)
    if (found) return found.label
  }
  return modelId
}
```

**Step 2: Add metadata bar to `WeaponCard`**

Import `getModelLabel` from `@/lib/models` and `STYLE_DISPLAY` from `@/lib/schemas`.

After the closing `</div>` of the 2-column grid (the `div` with `grid grid-cols-1 lg:grid-cols-2`), add a full-width metadata bar:

```tsx
{/* Generation metadata */}
<div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
  {weapon.textModel && (
    <span title="Text model">
      <span className="text-slate-500">Text:</span> {getModelLabel(weapon.textModel)}
    </span>
  )}
  {weapon.imageModel && (
    <span title="Image model">
      <span className="text-slate-500">Image:</span> {getModelLabel(weapon.imageModel)}
    </span>
  )}
  {typeof weapon.options?.style === 'string' && (
    <span title="Art style">
      <span className="text-slate-500">Style:</span> {STYLE_DISPLAY[weapon.options.style as keyof typeof STYLE_DISPLAY] ?? weapon.options.style}
    </span>
  )}
</div>
```

**Step 3: Run the dev server and verify visually**

Run: `npm run dev`
Navigate to a completed weapon's detail page. Confirm the metadata bar appears as a full-width bar below the image/content grid, showing the text model, image model, and art style.

**Step 4: Commit**

```bash
git add src/lib/models.ts src/components/weapon-card.tsx
git commit -m "feat: show text/image model and style on weapon detail page"
```

---

### Task 2: Add Download JSON Button

Add a button to the weapon detail `CardFooter` that downloads the weapon's generation data as a `.json` file.

**Files:**
- Modify: `src/components/weapon-card.tsx:152-191` (CardFooter area)

**Step 1: Add download handler function**

Inside the `WeaponCard` component (after the `handleDelete` function, around line 63), add:

```typescript
function handleDownloadJson() {
  const data = {
    id: weapon.id,
    createdAt: weapon.createdAt,
    userPrompt: weapon.userPrompt,
    options: weapon.options,
    textModel: weapon.textModel,
    imageModel: weapon.imageModel,
    weaponSpec: weapon.weaponSpec,
    descriptionMd: weapon.descriptionMd,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = (weapon.weaponSpec?.name ?? weapon.id).replace(/[^a-zA-Z0-9_-]/g, '_')
  a.download = `${safeName}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
```

**Step 2: Add download button to CardFooter**

In the `CardFooter` section, after the "Reroll Stats" button block (after line 174) and before the `onDelete` block, add:

```tsx
<Button
  variant="secondary"
  size="sm"
  onClick={handleDownloadJson}
>
  Download JSON
</Button>
```

**Step 3: Verify manually**

Run: `npm run dev`
Navigate to a completed weapon. Click "Download JSON". Confirm a `.json` file downloads with the weapon name as filename and contains the expected fields.

**Step 4: Commit**

```bash
git add src/components/weapon-card.tsx
git commit -m "feat: add download JSON button to weapon detail page"
```

---

### Task 3: Add "Remix" Button (Regenerate with Different Model)

Add a button that navigates to the creation form pre-filled with the same prompt and options, so users can generate the same concept with different model selections.

**Files:**
- Modify: `src/components/weapon-card.tsx:152-191` (CardFooter area)
- Modify: `src/components/weapon-form.tsx:39-50` (read URL params for pre-fill)

**Step 1: Update `WeaponForm` to read all options from URL params**

The form already reads `prompt` from search params (line 45). Extend it to also read `category`, `style`, `rarity`, `textModel`, and `imageModel`. Import `categorySchema` from `@/lib/schemas` (add to existing import), and `getAllTextModels`, `getAllImageModels` from `@/lib/models` (add to existing import). Replace lines 45-50 with:

```typescript
const [prompt, setPrompt] = useState(searchParams.get('prompt') ?? '')

// Validate category param against schema to avoid runtime crash in CATEGORY_STYLES lookup
const categoryParam = searchParams.get('category')
const validCategory = categoryParam && categorySchema.safeParse(categoryParam).success
  ? (categoryParam as Category)
  : 'fantasy_weapon'
const [category, setCategory] = useState<Category>(validCategory)

const initialStyle = searchParams.get('style') as Style | null
const [style, setStyle] = useState<Style>(
  initialStyle && CATEGORY_STYLES[category]?.includes(initialStyle)
    ? initialStyle
    : CATEGORY_DEFAULT_STYLE[category] ?? 'fantasy_art'
)
const [rarity, setRarity] = useState(searchParams.get('rarity') ?? '')

// Validate model params against known model IDs
const validTextModelIds = getAllTextModels().map((m) => m.id)
const validImageModelIds = getAllImageModels().map((m) => m.id)
const textModelParam = searchParams.get('textModel')
const imageModelParam = searchParams.get('imageModel')
const [textModel, setTextModel] = useState(
  textModelParam && validTextModelIds.includes(textModelParam) ? textModelParam : getDefaultTextModel()
)
const [imageModel, setImageModel] = useState(
  imageModelParam && validImageModelIds.includes(imageModelParam) ? imageModelParam : getDefaultImageModel()
)
```

Note: `CATEGORY_STYLES` is already imported (line 11). `CATEGORY_DEFAULT_STYLE` is also imported (line 13). `Style` type is imported (line 15). Add `categorySchema` to the `@/lib/schemas` import, and add `getAllTextModels`, `getAllImageModels` to the `@/lib/models` import.

**Step 2: Add remix handler and button to `WeaponCard`**

Import `useRouter` from `next/navigation` at the top of weapon-card.tsx. Add the router hook inside the component:

```typescript
const router = useRouter()
```

Add remix handler after `handleDownloadJson`:

```typescript
function handleRemix() {
  const params = new URLSearchParams()
  params.set('prompt', weapon.userPrompt)
  if (weapon.options?.category) params.set('category', String(weapon.options.category))
  if (weapon.options?.style) params.set('style', String(weapon.options.style))
  if (weapon.options?.rarity) params.set('rarity', String(weapon.options.rarity))
  // Use top-level model fields (canonical, set by orchestrator) over options (user input)
  const textModelId = weapon.textModel ?? (weapon.options?.textModel ? String(weapon.options.textModel) : null)
  const imageModelId = weapon.imageModel ?? (weapon.options?.imageModel ? String(weapon.options.imageModel) : null)
  if (textModelId) params.set('textModel', textModelId)
  if (imageModelId) params.set('imageModel', imageModelId)
  router.push(`/?${params.toString()}`)
}
```

Add the Remix button in `CardFooter`, after the Download JSON button:

```tsx
<Button
  variant="secondary"
  size="sm"
  onClick={handleRemix}
>
  Remix
</Button>
```

**Step 3: Verify manually**

Run: `npm run dev`
1. Navigate to a completed weapon detail page
2. Click "Remix"
3. Confirm you're taken to the home page with the form pre-filled with the original prompt, category, style, and model selections
4. Change the text model to a different one
5. Submit and confirm a new weapon is generated with the new model

**Step 4: Commit**

```bash
git add src/components/weapon-card.tsx src/components/weapon-form.tsx
git commit -m "feat: add remix button to regenerate weapon with different models"
```

---

### Task 4: Show User Prompt on Weapon Detail Page

The prompt is currently only shown truncated in the gallery. Show it prominently on the detail page.

**Files:**
- Modify: `src/components/weapon-card.tsx` (add prompt display in metadata area)

**Step 1: Add user prompt display**

In the metadata bar added in Task 1 (the `div` with `bg-slate-800/50`), add the user prompt below the model info. Change the metadata bar to a vertical layout:

```tsx
{/* Generation metadata */}
<div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700 space-y-1">
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
    {weapon.textModel && (
      <span title="Text model">
        <span className="text-slate-500">Text:</span> {getModelLabel(weapon.textModel)}
      </span>
    )}
    {weapon.imageModel && (
      <span title="Image model">
        <span className="text-slate-500">Image:</span> {getModelLabel(weapon.imageModel)}
      </span>
    )}
    {typeof weapon.options?.style === 'string' && (
      <span title="Art style">
        <span className="text-slate-500">Style:</span> {STYLE_DISPLAY[weapon.options.style as keyof typeof STYLE_DISPLAY] ?? weapon.options.style}
      </span>
    )}
  </div>
  <p className="text-xs text-slate-500 italic">&ldquo;{weapon.userPrompt}&rdquo;</p>
</div>
```

**Step 2: Verify manually**

Run: `npm run dev`
Navigate to a weapon detail page. Confirm the user's original prompt appears in italics below the model metadata.

**Step 3: Commit**

```bash
git add src/components/weapon-card.tsx
git commit -m "feat: show user prompt on weapon detail page"
```

---

### Task 5: Type-check and Lint

**Step 1: Run type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 3: Fix any issues found**

If type errors or lint issues arise, fix them before committing.

**Step 4: Run existing tests**

Run: `npx vitest run`
Expected: All tests pass (these are backend tests; our changes are UI-only but we should confirm nothing broke)

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type/lint issues from prompt tracking features"
```

(Skip this step if no fixes were needed.)
