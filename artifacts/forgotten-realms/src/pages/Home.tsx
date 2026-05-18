import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  useGenerateCity,
  useGenerateDistrict,
  useGenerateNpc,
  useGenerateRumors,
  useGenerateAdventureHook,
} from "@workspace/api-client-react";
import type { City, District, Npc, Rumors, AdventureHook } from "@workspace/api-client-react";
import jsPDF from "jspdf";

// --- Schemas ---
const citySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(25, "Máximo de 25 caracteres"),
  size: z.string().default("Qualquer"),
  region: z.string().default("Qualquer"),
  culture: z.string().default("Qualquer"),
  alignment: z.string().default("Qualquer"),
});

const districtSchema = z.object({
  tipo: z.string().default("Qualquer"),
  estabelecimentos: z.coerce.number().min(1).max(10).default(3),
  bases: z.coerce.number().min(0).max(5).default(0),
});

// --- Constants ---
const SIZES = ["Qualquer", "Assentamento", "Vilarejo", "Cidade Pequena", "Cidade Média", "Cidade Grande", "Metrópole"];

const REGIONS = [
  "Qualquer",
  "Aguas Profundas",
  "Amn",
  "Anauroch",
  "Baldur's Gate",
  "Calimshan",
  "Chessenta",
  "Cormyr",
  "Costa da Espada",
  "Icewind Dale",
  "Luskan",
  "Mar da Lua",
  "Neverwinter",
  "Sembia",
  "Terras dos Vales",
  "Thay",
  "Vale do Vento Gélido",
  "Waterdeep",
];

const CULTURES = ["Qualquer", "Cosmopolita", "Humana (Faéruniana)", "Élfica", "Anã", "Halfling", "Gnômica", "Tiefling", "Draconiana", "Mista", "Exótica Oriental"];

const ALIGNMENTS = [
  "Qualquer",
  "Majoritariamente Boa",
  "Leal e Bom",
  "Neutro e Bom",
  "Caótico e Bom",
  "Leal e Neutro",
  "Neutro",
  "Caótico e Neutro",
  "Leal e Mau",
  "Neutro e Mau",
  "Caótico e Mau",
  "Majoritariamente Má",
];

const DISTRICT_TYPES = [
  "Qualquer",
  "Artesanal",
  "Boêmio e Entretenimento",
  "Comercial",
  "Criminoso",
  "Gueto e Pobres",
  "Mágico e Arcano",
  "Militar",
  "Nobre",
  "Portuário",
  "Residencial",
  "Subterrâneo / Esgotos",
  "Templos e Religioso",
];

// --- Stat Block ---
function StatBlock({ stat }: { stat: Npc["estatisticas"] }) {
  if (!stat) return null;
  const attrs = [
    { label: "FOR", val: stat.atributos?.for },
    { label: "DES", val: stat.atributos?.des },
    { label: "CON", val: stat.atributos?.con },
    { label: "INT", val: stat.atributos?.int },
    { label: "SAB", val: stat.atributos?.sab },
    { label: "CAR", val: stat.atributos?.car },
  ];
  return (
    <div className="mt-3 border border-primary/30 rounded bg-primary/5 p-3 space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs border-b border-primary/20 pb-2 mb-2">
        {stat.nivel && (
          <span><span className="text-primary font-bold">Nível:</span> {stat.nivel}</span>
        )}
        <span><span className="text-primary font-bold">Bônus Prof.:</span> {stat.bonusProficiencia}</span>
        <span><span className="text-primary font-bold">CA:</span> {stat.classeArmadura}</span>
        <span><span className="text-primary font-bold">PV:</span> {stat.pontosDeSaude}</span>
      </div>
      <div className="grid grid-cols-6 gap-1 text-center">
        {attrs.map(({ label, val }) => (
          <div key={label} className="flex flex-col items-center bg-muted rounded px-1 py-1.5">
            <span className="text-primary font-bold text-[10px] uppercase leading-none">{label}</span>
            <span className="text-foreground font-bold text-sm mt-1">{val}</span>
          </div>
        ))}
      </div>
      {stat.pericias && stat.pericias.length > 0 && (
        <div className="text-xs pt-1">
          <span className="text-primary font-bold">Perícias: </span>
          <span className="text-foreground/80">{stat.pericias.join(" · ")}</span>
        </div>
      )}
    </div>
  );
}

// --- NPC Card Component ---
function NpcCard({ npc, idx }: { npc: Npc; idx: number }) {
  return (
    <Card key={idx} className="bg-card border-border/60">
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <h4 className="font-serif text-lg text-primary font-bold">{npc.nome}</h4>
          <span className="text-xs text-muted-foreground">{npc.raca} · {npc.classe}</span>
        </div>
        <p className="text-sm text-foreground/80">{npc.descricao}</p>
        <div className="text-xs space-y-1 mt-2 p-2 bg-muted rounded border border-border/50">
          <p><span className="text-primary font-bold">Papel:</span> {npc.papel}</p>
          <p><span className="text-destructive font-bold">Segredo:</span> {npc.segredo}</p>
        </div>
        <StatBlock stat={npc.estatisticas} />
      </CardContent>
    </Card>
  );
}

// --- Section Heading ---
function SectionHeading({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "destructive" }) {
  return (
    <h3 className={`font-bold uppercase tracking-widest text-xs mb-1 ${variant === "destructive" ? "text-destructive" : "text-primary"}`}>
      {children}
    </h3>
  );
}

export default function Home() {
  const { toast } = useToast();

  const [city, setCity] = useState<City | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [rumorsList, setRumorsList] = useState<Rumors[]>([]);
  const [hooks, setHooks] = useState<AdventureHook[]>([]);

  const generateCity = useGenerateCity();
  const generateDistrict = useGenerateDistrict();
  const generateNpc = useGenerateNpc();
  const generateRumors = useGenerateRumors();
  const generateAdventureHook = useGenerateAdventureHook();

  const cityForm = useForm<z.infer<typeof citySchema>>({
    resolver: zodResolver(citySchema),
    defaultValues: { name: "", size: "Qualquer", region: "Qualquer", culture: "Qualquer", alignment: "Qualquer" },
  });

  const districtForm = useForm<z.infer<typeof districtSchema>>({
    resolver: zodResolver(districtSchema),
    defaultValues: { tipo: "Qualquer", estabelecimentos: 3, bases: 0 },
  });

  const onCitySubmit = (values: z.infer<typeof citySchema>) => {
    generateCity.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setCity(data);
          setDistricts([]);
          setNpcs([]);
          setRumorsList([]);
          setHooks([]);
          toast({ title: "Cidade gerada com sucesso!" });
        },
        onError: () => toast({ title: "Erro ao gerar cidade", variant: "destructive" }),
      }
    );
  };

  const getCityContext = () => {
    if (!city) return "";
    return `${city.nome} (${city.alcunha}). Resumo: ${city.resumo}`;
  };

  const onDistrictSubmit = (values: z.infer<typeof districtSchema>) => {
    if (!city) return;
    generateDistrict.mutate(
      {
        data: {
          tipo: values.tipo,
          estabelecimentos: values.estabelecimentos,
          bases: values.bases,
          cityContext: getCityContext(),
        },
      },
      {
        onSuccess: (data) => {
          setDistricts((prev) => [...prev, data]);
          toast({ title: "Distrito gerado com sucesso!" });
        },
        onError: () => toast({ title: "Erro ao gerar distrito", variant: "destructive" }),
      }
    );
  };

  const handleGenerateNpc = () => {
    if (!city) return;
    generateNpc.mutate(
      { data: { cityContext: getCityContext() } },
      {
        onSuccess: (data) => {
          setNpcs((prev) => [...prev, data]);
          toast({ title: "NPC gerado com sucesso!" });
        },
        onError: () => toast({ title: "Erro ao gerar NPC", variant: "destructive" }),
      }
    );
  };

  const handleGenerateRumors = () => {
    if (!city) return;
    generateRumors.mutate(
      { data: { cityContext: getCityContext() } },
      {
        onSuccess: (data) => {
          setRumorsList((prev) => [...prev, data]);
          toast({ title: "Rumores gerados com sucesso!" });
        },
        onError: () => toast({ title: "Erro ao gerar rumores", variant: "destructive" }),
      }
    );
  };

  const handleGenerateHook = () => {
    if (!city) return;
    const districtsContext = districts.map((d) => `${d.nome} (${d.tipo})`).join(", ");
    generateAdventureHook.mutate(
      { data: { cityContext: getCityContext(), districtsContext } },
      {
        onSuccess: (data) => {
          setHooks((prev) => [...prev, data]);
          toast({ title: "Gancho gerado com sucesso!" });
        },
        onError: () => toast({ title: "Erro ao gerar gancho", variant: "destructive" }),
      }
    );
  };

  const buildTextContent = () => {
    let content = "";
    if (city) {
      content += `=== CIDADE: ${city.nome} ===\n`;
      content += `Alcunha: ${city.alcunha}\n`;
      content += `Resumo: ${city.resumo}\n\n`;
      content += `População: ${city.populacao}\n`;
      content += `Geografia: ${city.geografia}\n`;
      content += `Economia: ${city.economia}\n`;
      content += `Governo: ${city.governo}\n`;
      content += `Cultura Local: ${city.culturaLocal}\n`;
      content += `Marcos Famosos: ${city.marcasFamosos}\n`;
      content += `Problemas: ${city.problemas}\n\n`;
      if (city.npcs?.length) {
        content += `NPCs da Cidade:\n`;
        city.npcs.forEach((n: Npc) => {
          content += `- ${n.nome} (${n.raca} ${n.classe}): ${n.descricao}. Papel: ${n.papel}. Segredo: ${n.segredo}\n`;
        });
        content += "\n";
      }
    }
    if (districts.length) {
      content += `=== DISTRITOS ===\n`;
      districts.forEach((d) => {
        content += `\n--- ${d.nome} (${d.tipo}) ---\n`;
        content += `Atmosfera: ${d.atmosfera}\n`;
        content += `Descrição: ${d.descricao}\n`;
        content += `População: ${d.populacao}\n`;
        content += `Função: ${d.funcao}\n`;
        if (d.estabelecimentos?.length) content += `Estabelecimentos: ${d.estabelecimentos.join(" | ")}\n`;
        if (d.bases?.length) content += `Bases: ${d.bases.join(" | ")}\n`;
        content += `Problemas: ${d.problemasLocais}\n`;
        if (d.npcs?.length) {
          d.npcs.forEach((n: Npc) => {
            content += `  NPC: ${n.nome} (${n.raca} ${n.classe}) — ${n.descricao} Papel: ${n.papel}. Segredo: ${n.segredo}\n`;
          });
        }
      });
      content += "\n";
    }
    if (npcs.length) {
      content += `=== NPCs EXTRAS ===\n`;
      npcs.forEach((n: Npc) => {
        content += `- ${n.nome} (${n.raca} ${n.classe}): ${n.descricao}. Papel: ${n.papel}. Segredo: ${n.segredo}\n`;
      });
      content += "\n";
    }
    if (rumorsList.length) {
      content += `=== RUMORES ===\n`;
      rumorsList.forEach((r) => {
        r.rumores?.forEach((rumor: string) => { content += `- ${rumor}\n`; });
      });
      content += "\n";
    }
    if (hooks.length) {
      content += `=== GANCHOS DE AVENTURA ===\n`;
      hooks.forEach((h) => {
        content += `\nTítulo: ${h.titulo}\nDescrição: ${h.descricao}\nComplicação: ${h.complicacao}\nRecompensa: ${h.recompensa}\n`;
      });
    }
    return content;
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(buildTextContent()).then(() => {
      toast({ title: "Conteúdo copiado para a área de transferência!" });
    });
  };

  const handleExportPdf = () => {
    if (!city) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const usableW = pageW - margin * 2;
    let y = margin;

    const DARK_RED = [120, 20, 20] as [number, number, number];
    const BLACK = [20, 15, 12] as [number, number, number];
    const GRAY = [90, 75, 65] as [number, number, number];
    const PARCHMENT_LIGHT = [245, 232, 200] as [number, number, number];
    const RULE_COLOR = [160, 100, 80] as [number, number, number];

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const drawRule = () => {
      doc.setDrawColor(...RULE_COLOR);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    };

    const addTitle = (text: string, size = 18) => {
      ensureSpace(12);
      doc.setFont("times", "bold");
      doc.setFontSize(size);
      doc.setTextColor(...DARK_RED);
      doc.text(text, margin, y);
      y += size * 0.5;
    };

    const addSubtitle = (text: string) => {
      ensureSpace(8);
      doc.setFont("times", "italic");
      doc.setFontSize(11);
      doc.setTextColor(...GRAY);
      doc.text(text, margin, y);
      y += 7;
    };

    const addSectionLabel = (label: string) => {
      ensureSpace(8);
      doc.setFont("times", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...DARK_RED);
      doc.text(label.toUpperCase(), margin, y);
      y += 5;
    };

    const addBody = (text: string, indent = 0) => {
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      const lines = doc.splitTextToSize(text, usableW - indent);
      lines.forEach((line: string) => {
        ensureSpace(5);
        doc.text(line, margin + indent, y);
        y += 4.8;
      });
    };

    const addBullet = (text: string) => {
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      const lines = doc.splitTextToSize(text, usableW - 6);
      ensureSpace(5);
      doc.text("•", margin + 1, y);
      doc.text(lines[0], margin + 6, y);
      y += 4.8;
      for (let i = 1; i < lines.length; i++) {
        ensureSpace(5);
        doc.text(lines[i], margin + 6, y);
        y += 4.8;
      }
    };

    const gap = (n = 3) => { y += n; };

    const addNpcBlock = (npc: Npc) => {
      ensureSpace(14);
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK_RED);
      doc.text(`${npc.nome}  `, margin, y);
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      doc.text(`${npc.raca} · ${npc.classe}`, margin + doc.getTextWidth(`${npc.nome}  `), y);
      y += 5;
      addBody(npc.descricao, 4);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      ensureSpace(5);
      doc.text(`Papel: ${npc.papel}`, margin + 4, y);
      y += 4.5;
      ensureSpace(5);
      doc.text(`Segredo: ${npc.segredo}`, margin + 4, y);
      y += 5;
      const st = npc.estatisticas;
      if (st) {
        ensureSpace(10);
        doc.setFont("times", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...DARK_RED);
        const statParts: string[] = [];
        if (st.nivel) statParts.push(`Nível ${st.nivel}`);
        statParts.push(`Prof. ${st.bonusProficiencia}`);
        statParts.push(`CA ${st.classeArmadura}`);
        statParts.push(`PV ${st.pontosDeSaude}`);
        doc.text(statParts.join("  ·  "), margin + 4, y);
        y += 4.5;
        if (st.atributos) {
          const attrLine = [
            `FOR ${st.atributos.for}`, `DES ${st.atributos.des}`, `CON ${st.atributos.con}`,
            `INT ${st.atributos.int}`, `SAB ${st.atributos.sab}`, `CAR ${st.atributos.car}`,
          ].join("   ");
          doc.setTextColor(...BLACK);
          ensureSpace(5);
          doc.text(attrLine, margin + 4, y);
          y += 4.5;
        }
        if (st.pericias?.length) {
          doc.setTextColor(...GRAY);
          ensureSpace(5);
          const perLine = `Perícias: ${st.pericias.join(" · ")}`;
          const wrapped = doc.splitTextToSize(perLine, usableW - 8);
          wrapped.forEach((line: string) => {
            ensureSpace(5);
            doc.text(line, margin + 4, y);
            y += 4.2;
          });
        }
      }
      y += 4;
    };

    // ── Cover / Header ──
    doc.setFillColor(...PARCHMENT_LIGHT);
    doc.rect(margin, y, usableW, 22, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...DARK_RED);
    doc.text("Tomo das Cidades Esquecidas", pageW / 2, y + 10, { align: "center" });
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text("Forgotten Realms — D&D 2024", pageW / 2, y + 17, { align: "center" });
    y += 26;
    drawRule();
    gap(2);

    // ── City ──
    addTitle(`${city.nome}`, 20);
    addSubtitle(city.alcunha);
    drawRule();
    addBody(city.resumo);
    gap();

    const cityFields: [string, string][] = [
      ["População", city.populacao],
      ["Geografia", city.geografia],
      ["Economia", city.economia],
      ["Governo", city.governo],
      ["Marcos Famosos", city.marcasFamosos],
      ["Cultura Local", city.culturaLocal],
      ["Problemas", city.problemas],
    ];
    for (const [label, value] of cityFields) {
      addSectionLabel(label);
      addBody(value);
      gap(2);
    }

    if (city.npcs?.length) {
      gap();
      drawRule();
      addSectionLabel("NPCs Importantes");
      gap(1);
      city.npcs.forEach((npc) => { addNpcBlock(npc); });
    }

    // ── Districts ──
    districts.forEach((d, i) => {
      ensureSpace(16);
      gap(4);
      drawRule();
      addTitle(`Distrito: ${d.nome}`, 15);
      addSubtitle(`${d.tipo} · ${d.atmosfera}`);
      addBody(d.descricao);
      gap(2);

      const dFields: [string, string][] = [
        ["População", d.populacao],
        ["Função", d.funcao],
        ["Problemas Locais", d.problemasLocais],
      ];
      for (const [label, value] of dFields) {
        addSectionLabel(label);
        addBody(value);
        gap(2);
      }

      if (d.estabelecimentos?.length) {
        addSectionLabel("Estabelecimentos");
        d.estabelecimentos.forEach((e) => addBullet(e));
        gap(2);
      }
      if (d.bases?.length) {
        addSectionLabel("Bases / Locais Secretos");
        d.bases.forEach((b) => addBullet(b));
        gap(2);
      }
      if (d.npcs?.length) {
        addSectionLabel("NPCs do Distrito");
        gap(1);
        d.npcs.forEach((npc) => { addNpcBlock(npc); });
      }
      void i;
    });

    // ── Extra NPCs ──
    if (npcs.length) {
      gap(4); drawRule();
      addTitle("NPCs Notáveis Extras", 14);
      npcs.forEach((npc) => { addNpcBlock(npc); });
    }

    // ── Rumors ──
    if (rumorsList.length) {
      gap(4); drawRule();
      addTitle("Rumores", 14);
      rumorsList.forEach((rSet) => {
        rSet.rumores?.forEach((r) => addBullet(r));
      });
    }

    // ── Adventure Hooks ──
    if (hooks.length) {
      gap(4); drawRule();
      addTitle("Ganchos de Aventura", 14);
      hooks.forEach((h) => {
        ensureSpace(20);
        gap(3);
        addTitle(h.titulo, 12);
        addBody(h.descricao);
        gap(1);
        addSectionLabel("Complicação");
        addBody(h.complicacao);
        gap(1);
        addSectionLabel("Recompensa");
        addBody(h.recompensa);
        gap(2);
      });
    }

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("times", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
    }

    const filename = city.nome.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").trim().replace(/\s+/g, "_");
    doc.save(`${filename}_Forgotten_Realms.pdf`);
    toast({ title: "PDF exportado com sucesso!" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto space-y-12">
      {/* HEADER */}
      <header className="text-center space-y-3 py-8 border-b-2 border-primary/40">
        <h1 className="text-5xl font-serif text-primary tracking-tight font-bold">Tomo das Cidades Esquecidas</h1>
        <p className="text-muted-foreground text-lg italic">
          Forje metrópoles, planeje distritos e crie intrigas para suas campanhas em Faerûn.
        </p>
      </header>

      {/* ZONA 1 — Criar Cidade */}
      <Card className="border-primary/30 shadow-md bg-card">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-2xl text-primary font-serif font-bold">Forjar Nova Cidade</CardTitle>
          <CardDescription className="text-muted-foreground">
            Defina as características principais para gerar um verbete enciclopédico de sua cidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={cityForm.handleSubmit(onCitySubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground font-semibold">Nome da Cidade</Label>
                <div className="relative">
                  <Input
                    id="name"
                    data-testid="input-city-name"
                    {...cityForm.register("name")}
                    placeholder="Ex: Águas Profundas"
                    maxLength={25}
                    className="bg-muted border-border pr-14"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                    {cityForm.watch("name").length}/25
                  </span>
                </div>
                {cityForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{cityForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Tamanho</Label>
                <Select onValueChange={(v) => cityForm.setValue("size", v)} defaultValue="Qualquer">
                  <SelectTrigger data-testid="select-size" className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Região de Faerûn</Label>
                <Select onValueChange={(v) => cityForm.setValue("region", v)} defaultValue="Qualquer">
                  <SelectTrigger data-testid="select-region" className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Cultura Predominante</Label>
                <Select onValueChange={(v) => cityForm.setValue("culture", v)} defaultValue="Qualquer">
                  <SelectTrigger data-testid="select-culture" className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CULTURES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Tendência Geral</Label>
                <Select onValueChange={(v) => cityForm.setValue("alignment", v)} defaultValue="Qualquer">
                  <SelectTrigger data-testid="select-alignment" className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALIGNMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="button-criar-cidade"
              disabled={generateCity.isPending}
              className="w-full text-lg font-serif font-bold bg-primary text-primary-foreground hover:bg-primary/85"
            >
              {generateCity.isPending ? "Forjando a cidade..." : "Criar Cidade"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* LOADING CITY */}
      {generateCity.isPending && (
        <Card className="border-dashed border-primary/30 p-8 space-y-4 bg-card">
          <Skeleton className="h-10 w-1/3 bg-muted" />
          <Skeleton className="h-4 w-1/4 bg-muted" />
          <Separator className="bg-border" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 bg-muted" />
            <Skeleton className="h-24 bg-muted" />
          </div>
        </Card>
      )}

      {/* WELCOME STATE */}
      {!city && !generateCity.isPending && (
        <div className="py-20 text-center space-y-3">
          <p className="text-3xl font-serif text-primary font-bold">O pergaminho está em branco.</p>
          <p className="text-muted-foreground">Comece forjando uma cidade no formulário acima para desvendar seus mistérios.</p>
        </div>
      )}

      {/* ZONA 2 — Resultado da Cidade */}
      {city && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="bg-card border-primary/30 shadow-md">
            <CardHeader className="border-b border-border/50 pb-6">
              <CardTitle className="text-4xl text-primary font-serif font-bold">{city.nome}</CardTitle>
              <CardDescription className="text-xl italic text-muted-foreground">{city.alcunha}</CardDescription>
              <p className="pt-4 text-base leading-relaxed text-foreground">{city.resumo}</p>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                ["População", city.populacao, "primary"],
                ["Geografia", city.geografia, "primary"],
                ["Economia", city.economia, "primary"],
                ["Governo", city.governo, "primary"],
                ["Cultura Local", city.culturaLocal, "primary"],
                ["Marcos Famosos", city.marcasFamosos, "primary"],
              ].map(([label, value, variant]) => (
                <div key={label} className="space-y-1">
                  <SectionHeading variant={variant as "primary"}>{label}</SectionHeading>
                  <p className="text-sm text-foreground/80 leading-relaxed">{value}</p>
                </div>
              ))}
              <div className="space-y-1 md:col-span-2">
                <SectionHeading variant="destructive">Problemas</SectionHeading>
                <p className="text-sm text-foreground/80 leading-relaxed">{city.problemas}</p>
              </div>
            </CardContent>

            {city.npcs?.length > 0 && (
              <div className="p-6 bg-muted/40 border-t border-border/40">
                <SectionHeading>NPCs Importantes</SectionHeading>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  {city.npcs.map((npc: Npc, idx: number) => <NpcCard key={idx} npc={npc} idx={idx} />)}
                </div>
              </div>
            )}
          </Card>

          <Separator className="bg-primary/30 h-0.5" />

          {/* Formulário Criar Distrito */}
          <Card className="border-primary/30 shadow-md bg-card">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-2xl text-primary font-serif font-bold">Expansão da cidade — Criar Distrito</CardTitle>
              <CardDescription>Acrescente um distrito ao mapa da cidade. Cada novo distrito é adicionado abaixo sem apagar os anteriores.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={districtForm.handleSubmit(onDistrictSubmit)} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="space-y-2 flex-1 w-full">
                  <Label className="text-foreground font-semibold">Tipo de Distrito</Label>
                  <Select onValueChange={(v) => districtForm.setValue("tipo", v)} defaultValue="Qualquer">
                    <SelectTrigger data-testid="select-district-type" className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRICT_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 w-full md:w-36">
                  <Label className="text-foreground font-semibold">Estabelecimentos</Label>
                  <Input data-testid="input-estabelecimentos" type="number" min={1} max={10} {...districtForm.register("estabelecimentos")} className="bg-muted border-border" />
                </div>
                <div className="space-y-2 w-full md:w-28">
                  <Label className="text-foreground font-semibold">Bases</Label>
                  <Input data-testid="input-bases" type="number" min={0} max={5} {...districtForm.register("bases")} className="bg-muted border-border" />
                </div>
                <Button
                  type="submit"
                  data-testid="button-criar-distrito"
                  disabled={generateDistrict.isPending}
                  className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/85 font-semibold"
                >
                  {generateDistrict.isPending ? "Gerando..." : "Criar Distrito"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* LOADING DISTRICT */}
          {generateDistrict.isPending && (
            <Card className="border-dashed border-primary/30 p-6 space-y-3 bg-card">
              <Skeleton className="h-6 w-1/4 bg-muted" />
              <Skeleton className="h-4 w-full bg-muted" />
              <Skeleton className="h-4 w-3/4 bg-muted" />
            </Card>
          )}

          {/* ZONA 3 — Distritos Gerados */}
          <div className="space-y-6">
            {districts.map((district, idx) => (
              <Card key={idx} data-testid={`card-district-${idx}`} className="bg-card border-primary/25 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                <CardHeader className="border-b border-border/40 pb-4">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                    <div>
                      <CardTitle className="text-2xl text-primary font-serif font-bold">{district.nome}</CardTitle>
                      <CardDescription className="text-base italic text-muted-foreground">{district.tipo}</CardDescription>
                    </div>
                    <span className="text-xs uppercase tracking-wider px-3 py-1 bg-muted rounded border border-border self-start">
                      {district.atmosfera}
                    </span>
                  </div>
                  <p className="pt-2 text-sm leading-relaxed text-foreground/80">{district.descricao}</p>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">
                  <div className="space-y-1">
                    <SectionHeading>População</SectionHeading>
                    <p className="text-sm text-foreground/80">{district.populacao}</p>
                  </div>
                  <div className="space-y-1">
                    <SectionHeading>Função</SectionHeading>
                    <p className="text-sm text-foreground/80">{district.funcao}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <SectionHeading variant="destructive">Problemas Locais</SectionHeading>
                    <p className="text-sm text-foreground/80">{district.problemasLocais}</p>
                  </div>
                  {district.estabelecimentos?.length > 0 && (
                    <div className="space-y-1">
                      <SectionHeading>Estabelecimentos</SectionHeading>
                      <ul className="text-sm text-foreground/80 space-y-1">
                        {district.estabelecimentos.map((e: string, i: number) => (
                          <li key={i} className="flex gap-2"><span className="text-primary">·</span>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {district.bases?.length > 0 && (
                    <div className="space-y-1">
                      <SectionHeading>Bases / Locais Secretos</SectionHeading>
                      <ul className="text-sm text-foreground/80 space-y-1">
                        {district.bases.map((b: string, i: number) => (
                          <li key={i} className="flex gap-2"><span className="text-destructive">·</span>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
                {district.npcs?.length > 0 && (
                  <div className="p-6 bg-muted/40 border-t border-border/40">
                    <SectionHeading>NPCs do Distrito</SectionHeading>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {district.npcs.map((npc: Npc, nidx: number) => <NpcCard key={nidx} npc={npc} idx={nidx} />)}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <Separator className="bg-primary/20" />

          {/* ZONA 4 — Botões de Ação */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sticky bottom-5 z-10 bg-background/90 backdrop-blur-sm p-4 rounded-lg border border-primary/25 shadow-xl">
            <Button
              variant="outline"
              data-testid="button-gerar-npc"
              onClick={handleGenerateNpc}
              disabled={generateNpc.isPending}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {generateNpc.isPending ? "Gerando..." : "Gerar NPC"}
            </Button>
            <Button
              variant="outline"
              data-testid="button-criar-rumores"
              onClick={handleGenerateRumors}
              disabled={generateRumors.isPending}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {generateRumors.isPending ? "Gerando..." : "Criar Rumores"}
            </Button>
            <Button
              variant="outline"
              data-testid="button-criar-gancho"
              onClick={handleGenerateHook}
              disabled={generateAdventureHook.isPending}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {generateAdventureHook.isPending ? "Gerando..." : "Criar Gancho"}
            </Button>
            <Button
              variant="outline"
              data-testid="button-copiar-tudo"
              onClick={handleCopyAll}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Copiar Tudo
            </Button>
            <Button
              data-testid="button-exportar-pdf"
              onClick={handleExportPdf}
              className="bg-primary text-primary-foreground hover:bg-primary/85 font-semibold col-span-2 md:col-span-1"
            >
              Exportar PDF
            </Button>
          </div>

          {/* Resultados Acumulados */}
          <div className="space-y-6 pb-24">
            {generateNpc.isPending && <Skeleton className="h-28 w-full bg-muted" />}
            {npcs.map((npc, idx) => (
              <Card key={`npc-${idx}`} data-testid={`card-npc-extra-${idx}`} className="bg-card border-primary/25 animate-in fade-in">
                <CardContent className="p-6 space-y-2">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-serif text-2xl text-primary font-bold">{npc.nome}</h4>
                      <span className="text-sm text-muted-foreground">{npc.raca} · {npc.classe}</span>
                    </div>
                    <span className="text-xs uppercase bg-muted px-2 py-1 rounded border border-border">NPC Extra</span>
                  </div>
                  <p className="text-base text-foreground/85">{npc.descricao}</p>
                  <div className="text-sm space-y-2 mt-3 p-3 bg-muted/50 rounded border border-border/50">
                    <p><span className="text-primary font-bold">Papel:</span> {npc.papel}</p>
                    <p><span className="text-destructive font-bold">Segredo:</span> {npc.segredo}</p>
                  </div>
                  <StatBlock stat={npc.estatisticas} />
                </CardContent>
              </Card>
            ))}

            {generateRumors.isPending && <Skeleton className="h-28 w-full bg-muted" />}
            {rumorsList.map((rSet, idx) => (
              <Card key={`rumor-${idx}`} data-testid={`card-rumores-${idx}`} className="bg-card border-primary/25 animate-in fade-in">
                <CardHeader className="border-b border-border/40 pb-3">
                  <CardTitle className="text-xl text-primary font-serif font-bold">Rumores Locais</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2 text-foreground/80">
                    {rSet.rumores?.map((r: string, i: number) => (
                      <li key={i} className="flex gap-2 leading-relaxed text-sm">
                        <span className="text-primary mt-0.5">·</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}

            {generateAdventureHook.isPending && <Skeleton className="h-36 w-full bg-muted" />}
            {hooks.map((h, idx) => (
              <Card key={`hook-${idx}`} data-testid={`card-gancho-${idx}`} className="bg-card border-primary/25 animate-in fade-in">
                <CardHeader className="border-b border-border/40 pb-3">
                  <p className="uppercase tracking-widest text-xs font-bold text-destructive mb-1">Gancho de Aventura</p>
                  <CardTitle className="text-2xl text-primary font-serif font-bold">{h.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <p className="text-foreground leading-relaxed text-sm">{h.descricao}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-destructive/10 border border-destructive/25 rounded">
                      <h4 className="text-destructive font-bold text-xs mb-2 uppercase tracking-widest">Complicação</h4>
                      <p className="text-sm text-foreground/85">{h.complicacao}</p>
                    </div>
                    <div className="p-4 bg-primary/10 border border-primary/25 rounded">
                      <h4 className="text-primary font-bold text-xs mb-2 uppercase tracking-widest">Recompensa</h4>
                      <p className="text-sm text-foreground/85">{h.recompensa}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
