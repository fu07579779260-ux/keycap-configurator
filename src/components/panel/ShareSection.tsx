import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadBlob } from '@/export/download'
import { designFileName } from '@/export/filename'
import { useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { useDesign } from '@/model/design-context'
import { buildShareUrl, parseDesignFile, toDesignFile } from '@/model/serialize'
import { savedDesigns } from '@/persistence/saved-designs'
import { PanelSection } from './controls'

export function ShareSection() {
  const t = useT()
  const { config, load, reset } = useDesign()
  const fileInput = useId()
  const [name, setName] = useState('')
  const [message, setMessage] = useState<{ key: StringKey; tone: 'ok' | 'warn' } | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)

  // A link or QR code describes the design at the time it was made; drop it after any change
  useEffect(() => {
    setLink(null)
    setQr(null)
  }, [config])

  const say = (key: StringKey, tone: 'ok' | 'warn' = 'ok') => setMessage({ key, tone })

  const save = () => {
    if (savedDesigns.add(name, config)) {
      setName('')
      say('share.saved')
    } else {
      say('share.savedFull', 'warn')
    }
  }

  const downloadDesign = () =>
    downloadBlob(new Blob([toDesignFile(config)], { type: 'application/json' }), designFileName(config, 'json'))

  const openFile = async (file: File | undefined) => {
    if (!file) return
    const result = parseDesignFile(await file.text())
    if (result.ok) {
      load(result.config)
      say('share.opened')
    } else {
      say(`share.error.${result.error}`, 'warn')
    }
  }

  const makeLink = async () => {
    const { url, droppedUpload } = buildShareUrl(config, window.location.href)
    setLink(url)
    try {
      await navigator.clipboard.writeText(url)
      say(droppedUpload ? 'share.copiedNoUpload' : 'share.copied', droppedUpload ? 'warn' : 'ok')
    } catch {
      // Clipboard blocked: the link is shown below to copy by hand
      say(droppedUpload ? 'share.linkNoUpload' : 'share.linkShown', droppedUpload ? 'warn' : 'ok')
    }
    return url
  }

  const showQr = async () => {
    const url = link ?? (await makeLink())
    const QRCode = await import('qrcode')
    setQr(await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#111111', light: '#fafaf7' } }))
  }

  return (
    <PanelSection title={t('section.share')}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <input
          aria-label={t('share.name')}
          placeholder={t('share.name')}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 border border-ink bg-card px-2 py-1.5 text-sm"
        />
        <Button type="submit" size="sm" className="h-auto">
          {t('share.save')}
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="border-ink" onClick={downloadDesign}>
          {t('share.downloadFile')}
        </Button>
        <label
          htmlFor={fileInput}
          className="inline-flex cursor-pointer items-center justify-center border border-ink px-3 text-sm font-medium hover:bg-secondary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal"
        >
          {t('share.openFile')}
          <input
            id={fileInput}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              void openFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        <Button variant="outline" className="border-ink" onClick={() => void makeLink()}>
          {t('share.copyLink')}
        </Button>
        <Button variant="outline" className="border-ink" onClick={() => void showQr()}>
          {t('share.qr')}
        </Button>
      </div>

      {link && (
        <input
          readOnly
          aria-label={t('share.link')}
          value={link}
          onFocus={(e) => e.target.select()}
          className="w-full border border-rule bg-card px-2 py-1 font-mono text-xs"
        />
      )}
      {qr && <img src={qr} alt={t('share.qrAlt')} className="mx-auto size-48 border border-ink" />}

      <p role="status" className={message?.tone === 'warn' ? 'text-xs text-signal' : 'text-xs text-graphite'}>
        {message ? t(message.key) : t('share.hint')}
      </p>

      <button
        type="button"
        onClick={() => {
          reset()
          say('share.resetDone')
        }}
        className="text-xs text-graphite underline underline-offset-2 hover:text-ink"
      >
        {t('share.reset')}
      </button>
    </PanelSection>
  )
}
