import { Button } from '@/components/ui/button'
import { href } from '@/lib/router'
import { PagePlaceholder } from './placeholder'

export function HomePage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Keycap Configurator</h1>
      <p className="mt-2 text-muted-foreground">
        Select a form → adjust parameters → preview → 3D print → install and test.
      </p>
      <Button asChild className="mt-6">
        <a href={href('/configure')}>Start designing</a>
      </Button>
    </section>
  )
}

export function ConfigurePage() {
  return <PagePlaceholder title="Configurator" summary="Wizard and expert modes with a live 3D preview." />
}

export function ComparePage() {
  return <PagePlaceholder title="Compare" summary="Several keycaps side by side; export them as a set." />
}

export function FingerFitPage() {
  return <PagePlaceholder title="Finger fit" summary="Measure a fingertip from a photo or 3D scan and get a recommended shape." />
}

export function PresetsPage() {
  return <PagePlaceholder title="Preset library" summary="Built-in examples and your saved designs." />
}

export function SettingsPage() {
  return <PagePlaceholder title="Settings" summary="Language, accessibility, voice feedback, printer presets and local data." />
}
