import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type QrProps = { url: string; size?: number; logoSrc?: string };

export function QrWithLogo({ url, size = 300, logoSrc }: QrProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, { width: size, margin: 1, errorCorrectionLevel: "H" }).catch((err) => console.error(err));
  }, [url, size]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <canvas ref={canvasRef} width={size} height={size} />
      {logoSrc && (
        <img
          src={logoSrc}
          alt="logo"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: size * 0.18,
            height: size * 0.18,
            objectFit: "contain",
            borderRadius: 8,
            background: "white",
          }}
        />
      )}
    </div>
  );
}

export default function QrCodePage() {
  const [url, setUrl] = useState<string>("https://bcomandas.app/");
  const [size, setSize] = useState<number>(300);
  const [logo, setLogo] = useState<string>("/favicon.ico");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pUrl = params.get("url");
    const pSize = params.get("size");
    const pLogo = params.get("logo");
    if (pUrl) setUrl(pUrl);
    if (pSize) setSize(Math.max(128, Math.min(1024, Number(pSize) || 300)));
    if (pLogo) setLogo(pLogo);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">QR Code</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">URL</label>
            <input className="mt-1 w-full border rounded p-2" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Tamanho (px)</label>
            <input type="number" min={128} max={1024} className="mt-1 w-full border rounded p-2" value={size} onChange={(e) => setSize(Math.max(128, Math.min(1024, Number(e.target.value) || 300)))} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Logo (URL opcional)</label>
            <input className="mt-1 w-full border rounded p-2" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="/logo.png" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Upload de logo</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") setLogo(reader.result);
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 border rounded"
              onClick={async () => {
                // Renderiza em um canvas offscreen e compõe a logo para download
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                await QRCode.toCanvas(canvas, url, { width: size, margin: 1, errorCorrectionLevel: "H" });
                if (logo) {
                  try {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      const img = new Image();
                      img.crossOrigin = "anonymous";
                      img.onload = () => {
                        const logoSize = Math.floor(size * 0.18);
                        const x = Math.floor((size - logoSize) / 2);
                        const y = Math.floor((size - logoSize) / 2);
                        // Fundo branco para contraste
                        ctx.fillStyle = "#ffffff";
                        const pad = Math.max(4, Math.floor(logoSize * 0.1));
                        ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2);
                        ctx.drawImage(img, x, y, logoSize, logoSize);
                        const a = document.createElement("a");
                        a.href = canvas.toDataURL("image/png");
                        a.download = "qrcode.png";
                        a.click();
                      };
                      img.onerror = () => {
                        // Se a logo remota bloquear CORS, baixa sem a logo
                        const a = document.createElement("a");
                        a.href = canvas.toDataURL("image/png");
                        a.download = "qrcode.png";
                        a.click();
                      };
                      img.src = logo;
                    }
                  } catch {
                    const a = document.createElement("a");
                    a.href = canvas.toDataURL("image/png");
                    a.download = "qrcode.png";
                    a.click();
                  }
                } else {
                  const a = document.createElement("a");
                  a.href = canvas.toDataURL("image/png");
                  a.download = "qrcode.png";
                  a.click();
                }
              }}
            >
              Baixar PNG
            </button>
            <button className="px-3 py-2 border rounded" onClick={() => setLogo("")}>Remover logo</button>
          </div>
          <div className="text-xs text-muted-foreground">
            Dica: use query params, ex.: <code>?url=https://meu.app/&size=320&logo=/logo.png</code>
          </div>
        </div>
        <div className="md:col-span-2 flex items-center justify-center">
          <QrWithLogo url={url} size={size} logoSrc={logo || undefined} />
        </div>
      </div>
    </div>
  );
}


