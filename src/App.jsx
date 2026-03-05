import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

const RED = "#C8102E";
const DARK_RED = "#9B0D22";
const LIGHT_RED = "#F8E8EB";

const SYSTEM_PROMPT = `Você é um analista de dados especializado no setor farmacêutico brasileiro.

Sua função é analisar imagens contendo relatórios de vendas de uma farmácia e gerar automaticamente um relatório de metas de vendas estruturado.

CONTEXTO
A empresa é a REDE INOVA DROGARIAS, uma rede com mais de 600 farmácias.
Todos os meses precisamos calcular metas de vendas para cada farmácia utilizando o histórico recente de vendas apresentado nas imagens enviadas.

ETAPA 1 — EXTRAÇÃO DOS DADOS
Analise cuidadosamente as imagens e extraia:
- vendas totais dos últimos meses
- vendas por categoria (se existir)
- vendas por colaborador (se existir)
Priorize sempre: último mês, penúltimo mês, antepenúltimo mês.
Se algum valor estiver ilegível, indique como "dado não identificado".

ETAPA 2 — CÁLCULO DA META DA FARMÁCIA
1) Somar as vendas dos últimos 3 meses
2) Calcular a média dos 3 meses
3) Comparar a média com o valor do último mês
REGRA:
- Se média > último mês → aplicar crescimento de +4%
- Se média < último mês → aplicar crescimento de +5% sobre o último mês

ETAPA 3 — AJUSTE POR SAZONALIDADE
Considere o comportamento do varejo farmacêutico brasileiro.
Se o mês analisado tiver sazonalidade forte, aplique ajuste adicional de +1% a +3%.

ETAPA 4 — DISTRIBUIÇÃO POR CATEGORIA
Se houver vendas por categoria nas imagens, utilize os percentuais históricos.
Categorias: Ético, Genérico, Similar, Perfumaria, MIP, Outros.

ETAPA 5 — META POR COLABORADOR (CONDICIONAL)
Se existir venda por colaborador nas imagens:
1) calcular participação percentual de cada colaborador
2) aplicar esse percentual sobre a meta total

ETAPA 6 — RELATÓRIO FINAL
Retorne APENAS um JSON válido, sem texto antes ou depois, sem markdown, sem blocos de código, com a seguinte estrutura exata:
{
  "farmacia": "nome da farmácia",
  "resumo": "texto explicando o cálculo realizado",
  "historico": [
    {"mes": "nome do mês/ano", "venda": valor_numerico}
  ],
  "calculo": {
    "soma3meses": valor_numerico,
    "media3meses": valor_numerico,
    "ultimoMes": valor_numerico,
    "regra": "texto explicando qual regra foi aplicada (média > ou < último mês)",
    "percentualBase": valor_numerico,
    "ajusteSazonalidade": valor_numerico,
    "percentualFinal": valor_numerico,
    "metaFinal": valor_numerico
  },
  "categorias": [
    {"nome": "Ético", "percentual": valor_numerico, "meta": valor_numerico},
    {"nome": "Genérico", "percentual": valor_numerico, "meta": valor_numerico},
    {"nome": "Similar", "percentual": valor_numerico, "meta": valor_numerico},
    {"nome": "Perfumaria", "percentual": valor_numerico, "meta": valor_numerico},
    {"nome": "MIP", "percentual": valor_numerico, "meta": valor_numerico},
    {"nome": "Outros", "percentual": valor_numerico, "meta": valor_numerico}
  ],
  "colaboradores": [
    {"nome": "nome do colaborador", "percentual": valor_numerico, "meta": valor_numerico}
  ]
}
O campo "colaboradores" deve ser um array vazio [] se não houver dados de colaboradores.
IMPORTANTE: Retorne SOMENTE o JSON, sem qualquer outro texto.`;

const INOVA_LOGO_B64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAH6A/QDASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAcIBQYDBAkCAf/EAFoQAAEDAgIECAYMCwYEBQQDAAABAgMEBQYRBwgSIRMiMUFRYXGBFBUWgpHSGDJCUlNWkpSVoaKxFyMzNFVyc7PB0dM2Q2J1k6MkY7LCJSY1ZGVEdMPhg4Wk/8QAHAEBAAICAwEAAAAAAAAAAAAAAAUGBAcCAwgB/8QARBEBAAECAwMHCQQJAwQDAAAAAAECAwQFERIhMQYTQVFhcYEHFBUiMpGhscFSYtHhFhcjM0JTkrLCJHLSNEOC8SWi4v/aAAwDAQACEQMRAD8AuWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADiq6mno6WWqq544IImq+SSRyNaxqcqqq8iFedKGnqpllltmCU4GFM2uuMjM3v/AGbV9qnWu/qQ6L+IosRrXKXyjI8Zm13Yw9O6OMzwjvn6cU9X2/WWxU/D3m60dBGqcVZ5kYruxF3r3GhXPTro9o3qyGtra7Lnp6V2XpfslT7jXVtyq31lwq56uokXN8s0ive7tVd51yJuZrcmfUjRsrB+TnB0UxOJuVVT2aRH1n4wtL7IjBP6NxB83i/qj2RGCf0biD5vF/VKtA6vSV/sSP6A5R1Vf1LS+yIwT+jcQfN4v6o9kRgn9G4g+bxf1SrQHpK/2H6A5R1Vf1LS+yIwT+jcQfN4v6o9kRgn9G4g+bxf1SrbUVzka1FVVXJETnMlT4dxBUfkLFc5c/eUkjvuQ+xmOInh8nCvkNktv29Y76lkvZEYJ/RuIPm8X9UeyIwT+jcQfN4v6pWOut9fQu2a2hqaVc8sponM+9DrHycyvx/6cqeQeTVRrTFU/wDktL7IjBP6NxB83i/qj2RGCf0biD5vF/VKtAekr/Y+/oDlHVV/UtL7IjBP6NxB83i/qj2RGCf0biD5vF/VKtAekr/YfoDlHVV/UtL7IjBP6NxB83i/qn1HrDYKkkaxLbf83KiJnTxf1SrBy0f53D+0b94jMr/Y+VcgsoiOFX9T0BABYmjgAAAAAAAHSvt2t1itNRdrtVx0lDTtR00z88mIqoicnWqIab+GfRh8b6L/AE5PVNI1z8QeAYAoLBG/KW61e09OmKLJy/bWP0FRAL5fhn0YfG+i/wBOT1Tmg0v6M5lyZjG2J+u5zPvRCjdgw5iDECzJYrJcrpwGzw3glM+Xg9rPLa2UXLPJcs+hTgvNnu1lqUpbxa623TqmaR1UDonKnTk5EUD0OsWJsOX7NLJfrZcnImatpapkjkTrRFzQyx5o0801POyenlkhlYu0x7HK1zV6UVOQtjqsaVrnih0+EsSVDqq4U0HDUlW9ePNGiojmvXncmaKi8qpnnvTNQn1VREVVVEROVVNAXTPowRVTywot3+CT1Ts6dMQeTWii/wByY/YndTLTQKi7+El4iKnWm1tdxQQC+X4Z9GHxvov9OT1R+GfRh8b6L/Tk9UoaiKq5IiqvUfXByfBu9AF8Pwz6MPjfRf6cnqmYwnj/AAfiu4SUGHb5BcKmKJZnxxsemyxFRM1VURU3qeee/ByfBu9BAWq1KcPLS4bvOJJ41bJW1DaWFXJv2I0zcqdSufliB9gvrKXwt9luTafZ2+FWlejNnpzyyyy6zHAelJ8+GsSwRvzhtFI1jkz5JZNta5yLy7sjWd0zTPWBCAAAAAAAAHJTwy1M8cEEbpZZHIxjGpmrnKuSIidOZ9JmIjWX1R01RWVUVLSQSTzyuRkcUbVc57l5ERE5VJ70d6vyyww3DGdVJErkR3i+nciKnU+T+DfSb3oQ0ZU2CrWlwuMcc1+qWfjX7lSnav92xfvVOXsQksm8Jl1MRtXePU1Hyk5c3blycPl9WlMcaume7qjt4z2MNh7CmGsPsa2zWOgolamXCRwpwi9r14y96mZAJWKYpjSIa5u3rl6rbuVTM9czrL4miimidFNGySNyZOa9qKi9qKaDjLQ9gnEcb3ttrbVVrvSooUSPf1s9qvoz6yQQca7dFyNKo1d+Ex+Jwde3h65pnsn/NVMdJmjHEOBpVnqmNrLW5+zHWwpxc15EenKxe3d0Kpo5f8AuFHS3Cimoq6njqKaZislikbtNe1eVFQqTp00cOwPemVVubI+x1rl4BzlzWF/KsTl+tFXlTpVFUg8bgeajbo4fJt7kpyw9JVRhcVuu9E9FX4T8JRsACMX0OWj/O4f2jfvOI5aP87h/aN+8+xxfKvZl6AgAuLy0AAAAYrGF3ZYMK3S8yZZUdK+VqL7pyJxU71yTvPkzFMay52rdV2uKKeMzpHiqPp4vfj3SjeJ2P2oaWTwOLoRI+KuXUrtpe80Y+ppHzSvllcr5HuVznLyqq8qnyVG5XNdU1T0vTWCwtOEw9uxTwpiI90AAODJC3+rhZPE2i2hlezZmuL3VknY7cz7DWr3lTLFbprveqG1UyfjqyoZAzdzuciJ95fO3UkNBb6ehpm7EFPE2KNvQ1qIiJ6EJbKretdVfU1v5RsdsYa1hYn2p1nujh8Z+DnK+a3t7/wDRMORv99WzN9LI/wD8hYMphpzvfj7Sheahj9qGnl8Eh6EbHxVy6lcjl7zMzK5s2dOtV+QWB84zSLsxutxM+M7o+evg0gAFdbwAAAAAF2tDtx8aaL8PVe1tKlEyFy9Kx/i1+tpthEeqncfC9GstE53Goa6SNE6GuRr0+tzvQS1K9kUbpJHI1jEVznLyIicqlrw1e3apq7Hm/PcN5tmV+1HRVOndM6x8FW9a29+H4+p7RG/OO10qI5OiSTjO+zwZD5lsZXh9/wAV3S9PVf8AjKp8rUXmaq8VO5Mk7jElav3OcuVVdbf2TYLzHAWsP000xr38Z+OoADpST7hikmmZDExXySORrGpyqqrkiF78I2iOw4Xtlmjyyo6WOFVT3Tkam0veua95UjQJZPHulK0RPZtQ0j1rJepI97ft7Cd5csm8qt6U1V+DU3lHx21es4SJ4RNU+O6PlPvdK+3Oks1mrLtXSbFNSQumkXnyRM8k615ERO0qzjXFVdiS31cFgW3RV1JNFHVOrYXvdEx7crVbnk5F5c0TCZGiJjSSYotZ40fSIXgX+J/eCFv+uf+oADf8F6FMb4otcF+olp7XapmJLFJVPc10jF3o5GNaiou9M9pycvJkgGiM6gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcqNRXOVERN6qvMCJtZrGD8P4NZZqKVWV13V0aq1d7IEy21784b2K7oOu9di1RNc9DOyzAXMwxVGGt8ap90dM+Eb0U6e9J02K7nJY7PO5lhpn5KrVy8Lei+3X/Ci+1Tv6MooAKrdu1Xapqqei8uy6xl2Hpw9iNKY+M9c9sgAOtmgAAAH3Twy1E8cEEbpZZHIxjGpmrnKuSIidOZ9JmIjWX1R01RWVUVLSQSTzyuRkcUbVc57l5ERE5VJ70d6vyyww3DGdVJErkR3i+nciKnU+T+DfSb3oQ0ZU2CrWlwuMcc1+qWfjX7lSnav92xfvVOXsQksm8Jl1MRtXePU1Hyk5c3blycPl9WlMcaume7qjt4z2MNh7CmGsPsa2zWOgolamXCRwpwi9r14y96mZAJWKYpjSIa5u3rl6rbuVTM9czrL4miimidFNGySNyZOa9qKi9qKaDjLQ9gnEcb3ttrbVVrvSooUSPf1s9qvoz6yQQca7dFyNKo1d+Ex+Jwde3h65pnsn/NVMdJmjHEOBpVnqmNrLW5+zHWwpxc15EenKxe3d0Kpo5f8AuFHS3Cimoq6njqKaZislikbtNe1eVFQqTp00cOwPemVVubI+x1rl4BzlzWF/KsTl+tFXlTpVFUg8bgeajbo4fJt7kpyw9JVRhcVuu9E9FX4T8JRsACMX0OWj/O4f2jfvOI5aP87h/aN+8+xxfKvZl6AgAuLy0AAAAArLre3vbrrLh2N+6KN1XM3rcuwz0Ij/AEkBm4aZr34/0mXuua/ahZULTw792xHxEVOpdk17zTyq4u5zl6qqnovk5gfMcss2ZjfprPfO+fnoAAx02E/6oVk2qm9YjkZuY1tFC7rXjv+6P0kAFzNAtk8RaLbRE9mzNVxrWS7t6rJxm5+Zsp3Ehltvbva9Sl8vMd5tlU24nfcmI8OM/LTxb0R/rCXvxJosuisfszVyNoot/LwntvsI8kArnreXvhLnZsOxv3QxOq5kRedy7LO9Ea75RMYy5zdmqWreS2B89zWzbmN0TtT3U7/AI8PFAoAKu9DAB+sY572sY1XOcuTURN6qBbnVnt3gOieimVuy6tnmqFTzthPqYhHGt9Q8HiSx3PL8vRvgz/Zv2v/AMhPuDrS2xYUtVnblnR0kcLlTncjU2l71zUivW5oOGwXarijc1pq/g16mvY7P62NLDibWmE2eqIaRyHMYu8puf13V1Ve6ddPorGACvN3CKqKiouSpyKd2+3OrvV5rLtXPa6qq5nTSq1Mk2nLmuScyHSB91nTRxmimaoq03x9f/UAAPjkFtNWKyeKtGUVbIzZmuc76lc039iO1Xs9h/nFfMf1FfCr+z5NQAAJ5t8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//2Q==";

function InovaLogo({ height = 52 }) {
  return (
    <img
      src={`data:image/jpeg;base64,${INOVA_LOGO_B64}`}
      alt="Rede Inova Drogarias"
      style={{ height, width: "auto", objectFit: "contain" }}
    />
  );
}

function UploadZone({ label, image, onUpload, onRemove }) {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) onUpload(file);
  }, [onUpload]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !image && inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? RED : image ? RED : "#ddd"}`,
        borderRadius: 12,
        background: drag ? LIGHT_RED : image ? "#fff" : "#fafafa",
        minHeight: 160,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: image ? "default" : "pointer",
        transition: "all 0.2s",
        position: "relative",
        overflow: "hidden",
        padding: 12,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files[0]; if (f) onUpload(f); }}
      />
      {image ? (
        <>
          <img
            src={image.preview}
            alt={label}
            style={{ maxWidth: "100%", maxHeight: 140, borderRadius: 8, objectFit: "contain" }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{
              position: "absolute", top: 6, right: 6,
              background: RED, color: "#fff", border: "none",
              borderRadius: "50%", width: 24, height: 24,
              cursor: "pointer", fontSize: 13, fontWeight: "bold",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
          <span style={{ fontSize: 11, color: "#888", marginTop: 6 }}>{image.name}</span>
        </>
      ) : (
        <>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: LIGHT_RED, display: "flex",
            alignItems: "center", justifyContent: "center", marginBottom: 10,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p style={{ color: "#555", fontSize: 13, fontWeight: 600, margin: 0 }}>{label}</p>
          <p style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>Arraste ou clique para selecionar</p>
        </>
      )}
    </div>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{
      background: color || LIGHT_RED, color: color ? "#fff" : RED,
      borderRadius: 6, padding: "2px 10px", fontSize: 11,
      fontWeight: 700, display: "inline-block",
    }}>{children}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      padding: "22px 24px", ...style
    }}>{children}</div>
  );
}

function SectionTitle({ children, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      {icon && <div style={{
        width: 36, height: 36, background: LIGHT_RED,
        borderRadius: 9, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 18,
      }}>{icon}</div>}
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.3px" }}>{children}</h3>
    </div>
  );
}

function fmt(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "—";
  return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}
function fmtPct(val) {
  if (val == null || isNaN(Number(val))) return "—";
  return Number(val).toFixed(1) + "%";
}

function MetaReport({ data }) {
  const cat = data.categorias || [];
  const col = data.colaboradores || [];
  const hist = data.historico || [];
  const calc = data.calculo || {};

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    // Aba 1
    const ws1Data = [
      ["FARMÁCIA", data.farmacia],
      ["META TOTAL", calc.metaFinal],
      ...cat.map(c => [`META ${c.nome.toUpperCase()}`, c.meta]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    ws1["!cols"] = [{ wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, "META FARMÁCIA");

    // Aba 2
    if (col.length > 0) {
      const ws2Data = [
        ["FARMÁCIA", "COLABORADOR", "% PARTICIPAÇÃO", "META"],
        ...col.map(c => [data.farmacia, c.nome, c.percentual / 100, c.meta]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      ws2["!cols"] = [{ wch: 20 }, { wch: 24 }, { wch: 16 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws2, "META COLABORADORES");
    }

    // Aba 3
    const ws3Data = [
      ["MÊS", "VENDA TOTAL"],
      ...hist.map(h => [h.mes, h.venda]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
    ws3["!cols"] = [{ wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws3, "HISTÓRICO");

    XLSX.writeFile(wb, `Metas_${data.farmacia.replace(/\s+/g, "_")}.xlsx`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header resultado */}
      <div style={{
        background: `linear-gradient(135deg, ${RED} 0%, ${DARK_RED} 100%)`,
        borderRadius: 14, padding: "24px 28px", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.7, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Meta Calculada</p>
          <h2 style={{ margin: "4px 0 0", fontSize: 38, fontWeight: 900, letterSpacing: "-1px" }}>
            {fmt(calc.metaFinal)}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 16, opacity: 0.85 }}>{data.farmacia}</p>
        </div>
        <button
          onClick={exportExcel}
          style={{
            background: "#fff", color: RED, border: "none",
            borderRadius: 10, padding: "12px 22px", fontWeight: 800,
            fontSize: 13, cursor: "pointer", display: "flex",
            alignItems: "center", gap: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            whiteSpace: "nowrap",
          }}
        >
          <span>📊</span> Exportar Excel
        </button>
      </div>

      {/* Resumo */}
      <Card>
        <SectionTitle icon="📋">Resumo Analítico</SectionTitle>
        <p style={{ margin: 0, color: "#444", lineHeight: 1.7, fontSize: 16 }}>{data.resumo}</p>
      </Card>

      {/* Histórico + Cálculo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SectionTitle icon="📅">Histórico de Vendas</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#666", borderRadius: "6px 0 0 6px" }}>Mês</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, color: "#666", borderRadius: "0 6px 6px 0" }}>Venda Total</th>
              </tr>
            </thead>
            <tbody>
              {hist.map((h, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 12px", fontSize: 15, fontWeight: 600 }}>{h.mes}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 15, color: RED, fontWeight: 700 }}>{fmt(h.venda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <SectionTitle icon="🧮">Cálculo da Meta</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Soma 3 meses", fmt(calc.soma3meses)],
              ["Média 3 meses", fmt(calc.media3meses)],
              ["Último mês", fmt(calc.ultimoMes)],
              ["Regra aplicada", calc.regra],
              ["Crescimento base", fmtPct(calc.percentualBase)],
              ["Ajuste sazonalidade", calc.ajusteSazonalidade > 0 ? `+${fmtPct(calc.ajusteSazonalidade)}` : "Nenhum"],
              ["Crescimento final", fmtPct(calc.percentualFinal)],
            ].map(([label, value], i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", gap: 8,
                padding: "8px 12px",
                background: i % 2 === 0 ? "#fafafa" : "#fff",
                borderRadius: 8,
              }}>
                <span style={{ fontSize: 14, color: "#666" }}>{label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#222", textAlign: "right", maxWidth: "55%" }}>{value}</span>
              </div>
            ))}
            <div style={{
              background: LIGHT_RED, borderRadius: 10,
              padding: "12px 14px", display: "flex",
              justifyContent: "space-between", alignItems: "center", marginTop: 4,
            }}>
              <span style={{ fontWeight: 800, color: RED, fontSize: 15 }}>META FINAL</span>
              <span style={{ fontWeight: 900, color: RED, fontSize: 20 }}>{fmt(calc.metaFinal)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Categorias */}
      {cat.length > 0 && (
        <Card>
          <SectionTitle icon="🏷️">Metas por Categoria</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {cat.map((c, i) => (
              <div key={i} style={{
                border: `1.5px solid ${LIGHT_RED}`, borderRadius: 12,
                padding: "14px 16px", textAlign: "center",
              }}>
                <p style={{ margin: 0, fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{c.nome}</p>
                <p style={{ margin: "6px 0 4px", fontSize: 20, fontWeight: 900, color: RED }}>{fmt(c.meta)}</p>
                <Badge>{fmtPct(c.percentual)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Colaboradores */}
      {col.length > 0 && (
        <Card>
          <SectionTitle icon="👥">Metas por Colaborador</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                {["Colaborador", "Participação", "Meta"].map((h, i) => (
                  <th key={i} style={{
                    padding: "8px 14px", fontSize: 12, color: "#666",
                    textAlign: i === 0 ? "left" : "right",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {col.map((c, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "11px 14px", fontSize: 15, fontWeight: 600 }}>{c.nome}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right" }}>
                    <Badge>{fmtPct(c.percentual)}</Badge>
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 800, color: RED, fontSize: 17 }}>{fmt(c.meta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default function App() {
  const [farmacia, setFarmacia] = useState("");
  const [img1, setImg1] = useState(null);
  const [img2, setImg2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [rawText, setRawText] = useState("");

  async function toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  function handleUpload(slot, file) {
    const preview = URL.createObjectURL(file);
    const data = { file, preview, name: file.name, type: file.type };
    if (slot === 1) setImg1(data);
    else setImg2(data);
  }

  async function analyze() {
    if (!farmacia.trim()) { setError("Informe o nome da farmácia."); return; }
    if (!img1) { setError("Envie pelo menos a Imagem 1."); return; }
    setError("");
    setResult(null);
    setRawText("");
    setLoading(true);

    try {
      const content = [];

      const b1 = await toBase64(img1.file);
      content.push({ type: "image", source: { type: "base64", media_type: img1.type, data: b1 } });

      if (img2) {
        const b2 = await toBase64(img2.file);
        content.push({ type: "image", source: { type: "base64", media_type: img2.type, data: b2 } });
      }

      content.push({
        type: "text",
        text: `Nome da Farmácia: ${farmacia}\n\nAnalise as imagens acima e gere o relatório de metas conforme as instruções. Retorne APENAS o JSON válido, sem texto adicional.`,
      });

      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content }],
        }),
      });

      const data = await resp.json();

      // Captura erros retornados pela API
      if (data.error) {
        throw new Error(`API: ${data.error.type} — ${data.error.message}`);
      }

      const text = data.content?.map(b => b.text || "").join("").trim();
      setRawText(text);

      if (!text) throw new Error("A API retornou resposta vazia.");

      const clean = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch (jsonErr) {
        throw new Error(`Falha ao interpretar JSON da resposta. Trecho recebido: ${clean.substring(0, 200)}`);
      }
      setResult(parsed);
    } catch (e) {
      setError(`Erro: ${e.message}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f2f3f5",
      fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "#fff",
        borderBottom: `3px solid ${RED}`,
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 72,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <InovaLogo height={52} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: LIGHT_RED, borderRadius: 20,
            padding: "5px 14px", display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: RED, letterSpacing: 0.5 }}>
              SISTEMA DE METAS
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px" }}>
        {/* Input Section */}
        {!result && (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 22 }}>
              <h2 style={{ margin: 0, fontSize: 25, fontWeight: 900, color: "#1a1a1a" }}>
                Gerador de Metas de Vendas
              </h2>
              <p style={{ margin: "6px 0 0", color: "#888", fontSize: 16 }}>
                Envie os relatórios de vendas para calcular automaticamente as metas do próximo período.
              </p>
            </div>

            {/* Farmacia Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 16, fontWeight: 700, color: "#333", display: "block", marginBottom: 6 }}>
                Nome da Farmácia *
              </label>
              <input
                value={farmacia}
                onChange={e => setFarmacia(e.target.value)}
                placeholder="Ex: Inova Centro – SP 047"
                style={{
                  width: "100%", padding: "12px 16px",
                  border: `1.5px solid ${farmacia ? RED : "#ddd"}`,
                  borderRadius: 10, fontSize: 16, outline: "none",
                  transition: "border-color 0.2s", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                onFocus={e => e.target.style.borderColor = RED}
                onBlur={e => e.target.style.borderColor = farmacia ? RED : "#ddd"}
              />
            </div>

            {/* Uploads */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 16, fontWeight: 700, color: "#333", display: "block", marginBottom: 8 }}>
                  Relatório de Vendas *
                </label>
                <UploadZone
                  label="Imagem 1 — Relatório Principal"
                  image={img1}
                  onUpload={(f) => handleUpload(1, f)}
                  onRemove={() => setImg1(null)}
                />
              </div>
              <div>
                <label style={{ fontSize: 16, fontWeight: 700, color: "#333", display: "block", marginBottom: 8 }}>
                  Relatório Complementar
                  <span style={{ fontSize: 13, color: "#aaa", fontWeight: 400, marginLeft: 6 }}>opcional</span>
                </label>
                <UploadZone
                  label="Imagem 2 — Dados Complementares"
                  image={img2}
                  onUpload={(f) => handleUpload(2, f)}
                  onRemove={() => setImg2(null)}
                />
              </div>
            </div>

            {error && (
              <div style={{
                background: "#fff5f5", border: `1px solid #fcc`,
                borderRadius: 8, padding: "10px 14px",
                color: RED, fontSize: 15, fontWeight: 600, marginBottom: 16,
              }}>⚠️ {error}</div>
            )}

            <button
              onClick={analyze}
              disabled={loading}
              style={{
                width: "100%", padding: "15px",
                background: loading ? "#ccc" : `linear-gradient(135deg, ${RED} 0%, ${DARK_RED} 100%)`,
                color: "#fff", border: "none", borderRadius: 12,
                fontSize: 17, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "opacity 0.2s", letterSpacing: 0.3,
              }}
            >
              {loading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Analisando relatórios com IA...
                </>
              ) : (
                <>🎯 Calcular Metas de Vendas</>
              )}
            </button>
          </Card>
        )}

        {/* Result */}
        {result && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 25, fontWeight: 900, color: "#1a1a1a" }}>
                  Relatório Gerado com Sucesso ✅
                </h2>
                <p style={{ margin: "4px 0 0", color: "#888", fontSize: 15 }}>
                  {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => { setResult(null); setRawText(""); }}
                style={{
                  background: "#fff", border: `1.5px solid ${RED}`,
                  borderRadius: 10, padding: "9px 18px",
                  color: RED, fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                ← Nova Análise
              </button>
            </div>
            <MetaReport data={result} />
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#888" }}>
            <div style={{ fontSize: 14, marginTop: 12 }}>
              Processando imagens e calculando metas...
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
