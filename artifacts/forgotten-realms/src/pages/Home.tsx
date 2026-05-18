import React, { useState } from "react";
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
import type { City, District, Npc, Rumors, AdventureHook } from "@workspace/api-client-react/src/generated/api.schemas";

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
const SIZES = ["Qualquer", "Vilarejo", "Cidade Pequena", "Cidade Média", "Cidade Grande", "Metrópole"];
const REGIONS = ["Qualquer", "Costa da Espada", "Vale do Vento Uivante", "Cormyr", "Sembia", "Thay", "Amn", "Calimshan", "Chessenta", "Aguas Profundas", "Baldur's Gate", "Neverwinter", "Waterdeep", "Luskan", "Icewind Dale", "Anauroch"];
const CULTURES = ["Qualquer", "Humana (Faéruniana)", "Élfica", "Anã", "Halfling", "Gnômica", "Tiefling", "Draconiana", "Mista", "Exótica Oriental"];
const ALIGNMENTS = ["Qualquer", "Leal e Bom", "Neutro e Bom", "Caótico e Bom", "Leal e Neutro", "Neutro", "Caótico e Neutro", "Leal e Mau", "Neutro e Mau", "Caótico e Mau"];
const DISTRICT_TYPES = ["Qualquer", "Mercantil", "Nobre", "Portuário", "Militar", "Templos e Religioso", "Mágico e Arcano", "Artesanal", "Boêmio e Entretenimento", "Gueto e Pobres", "Subterrâneo / Esgotos", "Residencial", "Criminoso"];

export default function Home() {
  const { toast } = useToast();

  // State
  const [city, setCity] = useState<City | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [rumorsList, setRumorsList] = useState<Rumors[]>([]);
  const [hooks, setHooks] = useState<AdventureHook[]>([]);

  // Mutations
  const generateCity = useGenerateCity();
  const generateDistrict = useGenerateDistrict();
  const generateNpc = useGenerateNpc();
  const generateRumors = useGenerateRumors();
  const generateAdventureHook = useGenerateAdventureHook();

  // Forms
  const cityForm = useForm<z.infer<typeof citySchema>>({
    resolver: zodResolver(citySchema),
    defaultValues: { name: "", size: "Qualquer", region: "Qualquer", culture: "Qualquer", alignment: "Qualquer" },
  });

  const districtForm = useForm<z.infer<typeof districtSchema>>({
    resolver: zodResolver(districtSchema),
    defaultValues: { tipo: "Qualquer", estabelecimentos: 3, bases: 0 },
  });

  // Handlers
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

  const handleCopyAll = () => {
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

      if (city.npcs && city.npcs.length > 0) {
        content += `NPCs da Cidade:\n`;
        city.npcs.forEach((n) => {
          content += `- ${n.nome} (${n.raca} ${n.classe}): ${n.descricao}. Papel: ${n.papel}. Segredo: ${n.segredo}\n`;
        });
        content += "\n";
      }
    }

    if (districts.length > 0) {
      content += `=== DISTRITOS ===\n`;
      districts.forEach((d) => {
        content += `\n- ${d.nome} (${d.tipo})\n`;
        content += `Atmosfera: ${d.atmosfera}\n`;
        content += `Descrição: ${d.descricao}\n`;
        content += `População: ${d.populacao}\n`;
        content += `Função: ${d.funcao}\n`;
        if (d.estabelecimentos?.length) content += `Estabelecimentos: ${d.estabelecimentos.join(", ")}\n`;
        if (d.bases?.length) content += `Bases: ${d.bases.join(", ")}\n`;
        content += `Problemas: ${d.problemasLocais}\n`;
      });
      content += "\n";
    }

    if (npcs.length > 0) {
      content += `=== NPCs EXTRAS ===\n`;
      npcs.forEach((n) => {
        content += `- ${n.nome} (${n.raca} ${n.classe}): ${n.descricao}. Papel: ${n.papel}. Segredo: ${n.segredo}\n`;
      });
      content += "\n";
    }

    if (rumorsList.length > 0) {
      content += `=== RUMORES ===\n`;
      rumorsList.forEach((r) => {
        if (r.rumores) {
          r.rumores.forEach((rumor) => {
            content += `- ${rumor}\n`;
          });
        }
      });
      content += "\n";
    }

    if (hooks.length > 0) {
      content += `=== GANCHOS DE AVENTURA ===\n`;
      hooks.forEach((h) => {
        content += `\nTítulo: ${h.titulo}\n`;
        content += `Descrição: ${h.descricao}\n`;
        content += `Complicação: ${h.complicacao}\n`;
        content += `Recompensa: ${h.recompensa}\n`;
      });
      content += "\n";
    }

    navigator.clipboard.writeText(content).then(() => {
      toast({ title: "Conteúdo copiado para a área de transferência!" });
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto space-y-12">
      {/* HEADER */}
      <header className="text-center space-y-4 py-8 border-b border-border/50">
        <h1 className="text-5xl font-serif text-primary tracking-tight">Tomo das Cidades Esquecidas</h1>
        <p className="text-muted-foreground text-lg italic">
          Forje metrópoles, planeje distritos e crie intrigas para suas campanhas em Faerûn.
        </p>
      </header>

      {/* ZONA 1 — Criar Cidade */}
      <Card className="border-primary/20 shadow-lg shadow-black/50">
        <CardHeader>
          <CardTitle className="text-2xl text-primary font-serif">Forjar Nova Cidade</CardTitle>
          <CardDescription className="text-muted-foreground">
            Defina as características principais para gerar um verbete enciclopédico de sua cidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={cityForm.handleSubmit(onCitySubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Cidade</Label>
                <div className="relative">
                  <Input
                    id="name"
                    {...cityForm.register("name")}
                    placeholder="Ex: Águas Profundas"
                    className="bg-muted border-border/50"
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
                <Label>Tamanho</Label>
                <Select onValueChange={(v) => cityForm.setValue("size", v)} defaultValue={cityForm.getValues("size")}>
                  <SelectTrigger className="bg-muted border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Região de Faerûn</Label>
                <Select onValueChange={(v) => cityForm.setValue("region", v)} defaultValue={cityForm.getValues("region")}>
                  <SelectTrigger className="bg-muted border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cultura Predominante</Label>
                <Select onValueChange={(v) => cityForm.setValue("culture", v)} defaultValue={cityForm.getValues("culture")}>
                  <SelectTrigger className="bg-muted border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CULTURES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tendência Geral</Label>
                <Select onValueChange={(v) => cityForm.setValue("alignment", v)} defaultValue={cityForm.getValues("alignment")}>
                  <SelectTrigger className="bg-muted border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALIGNMENTS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={generateCity.isPending} className="w-full text-lg font-serif">
              {generateCity.isPending ? "Forjando..." : "Criar Cidade"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* LOADING STATE FOR CITY */}
      {generateCity.isPending && (
        <Card className="border-dashed border-primary/30 p-8 space-y-4">
          <Skeleton className="h-10 w-1/3 bg-muted" />
          <Skeleton className="h-4 w-1/4 bg-muted" />
          <Separator className="bg-border/50" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 bg-muted" />
            <Skeleton className="h-24 bg-muted" />
          </div>
        </Card>
      )}

      {/* WELCOME STATE */}
      {!city && !generateCity.isPending && (
        <div className="py-20 text-center space-y-4 opacity-50">
          <p className="text-2xl font-serif text-primary">O pergaminho está em branco.</p>
          <p>Comece forjando uma cidade no topo para desvendar seus mistérios.</p>
        </div>
      )}

      {/* ZONA 2 — Resultado da Cidade */}
      {city && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardHeader className="border-b border-border/30 pb-6">
              <CardTitle className="text-4xl text-primary font-serif">{city.nome}</CardTitle>
              <CardDescription className="text-xl italic text-muted-foreground">{city.alcunha}</CardDescription>
              <p className="pt-4 text-lg leading-relaxed">{city.resumo}</p>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <h3 className="text-primary font-bold uppercase tracking-wider text-sm">População</h3>
                <p className="text-muted-foreground">{city.populacao}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-primary font-bold uppercase tracking-wider text-sm">Geografia</h3>
                <p className="text-muted-foreground">{city.geografia}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-primary font-bold uppercase tracking-wider text-sm">Economia</h3>
                <p className="text-muted-foreground">{city.economia}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-primary font-bold uppercase tracking-wider text-sm">Governo</h3>
                <p className="text-muted-foreground">{city.governo}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-primary font-bold uppercase tracking-wider text-sm">Cultura Local</h3>
                <p className="text-muted-foreground">{city.culturaLocal}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-primary font-bold uppercase tracking-wider text-sm">Marcos Famosos</h3>
                <p className="text-muted-foreground">{city.marcasFamosos}</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <h3 className="text-destructive font-bold uppercase tracking-wider text-sm">Problemas Locais</h3>
                <p className="text-muted-foreground">{city.problemas}</p>
              </div>
            </CardContent>

            {city.npcs && city.npcs.length > 0 && (
              <div className="p-6 bg-black/20 border-t border-border/30">
                <h3 className="text-primary font-bold uppercase tracking-wider text-sm mb-4">NPCs Importantes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {city.npcs.map((npc, idx) => (
                    <Card key={idx} className="bg-card border-border/50">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-serif text-lg text-primary">{npc.nome}</h4>
                          <span className="text-xs text-muted-foreground">{npc.raca} • {npc.classe}</span>
                        </div>
                        <p className="text-sm">{npc.descricao}</p>
                        <div className="text-xs space-y-1 mt-2 p-2 bg-muted/50 rounded border border-border/30">
                          <p><span className="text-primary">Papel:</span> {npc.papel}</p>
                          <p><span className="text-destructive">Segredo:</span> {npc.segredo}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Separator className="bg-primary/20" />

          {/* Formulário Criar Distrito */}
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-primary font-serif">Parte 1 — Criar Distrito</CardTitle>
              <CardDescription>Expanda a cidade gerando um distrito específico.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={districtForm.handleSubmit(onDistrictSubmit)} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="space-y-2 flex-1 w-full">
                  <Label>Tipo de Distrito</Label>
                  <Select onValueChange={(v) => districtForm.setValue("tipo", v)} defaultValue={districtForm.getValues("tipo")}>
                    <SelectTrigger className="bg-muted border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRICT_TYPES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 w-full md:w-32">
                  <Label>Estabelecimentos</Label>
                  <Input type="number" min={1} max={10} {...districtForm.register("estabelecimentos")} className="bg-muted" />
                </div>
                <div className="space-y-2 w-full md:w-32">
                  <Label>Bases</Label>
                  <Input type="number" min={0} max={5} {...districtForm.register("bases")} className="bg-muted" />
                </div>
                <Button type="submit" disabled={generateDistrict.isPending} className="w-full md:w-auto text-md">
                  {generateDistrict.isPending ? "Gerando..." : "Criar Distrito"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* ZONA 3 — Distritos Gerados */}
          {generateDistrict.isPending && (
            <Card className="border-dashed border-primary/30 p-6 space-y-4">
              <Skeleton className="h-6 w-1/4 bg-muted" />
              <Skeleton className="h-4 w-full bg-muted" />
              <Skeleton className="h-4 w-full bg-muted" />
            </Card>
          )}

          <div className="space-y-6">
            {districts.map((district, idx) => (
              <Card key={idx} className="bg-card/50 backdrop-blur-sm border-primary/20 animate-in fade-in slide-in-from-bottom-4">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                    <div>
                      <CardTitle className="text-2xl text-primary font-serif">{district.nome}</CardTitle>
                      <CardDescription className="text-lg italic text-muted-foreground">{district.tipo}</CardDescription>
                    </div>
                    <span className="text-xs uppercase tracking-wider px-3 py-1 bg-muted rounded border border-border">
                      {district.atmosfera}
                    </span>
                  </div>
                  <p className="pt-2 text-md">{district.descricao}</p>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h3 className="text-primary font-bold uppercase tracking-wider text-sm">População</h3>
                    <p className="text-muted-foreground">{district.populacao}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-primary font-bold uppercase tracking-wider text-sm">Função</h3>
                    <p className="text-muted-foreground">{district.funcao}</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <h3 className="text-destructive font-bold uppercase tracking-wider text-sm">Problemas Locais</h3>
                    <p className="text-muted-foreground">{district.problemasLocais}</p>
                  </div>
                  
                  {district.estabelecimentos && district.estabelecimentos.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-primary font-bold uppercase tracking-wider text-sm">Estabelecimentos</h3>
                      <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1 pl-4">
                        {district.estabelecimentos.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}

                  {district.bases && district.bases.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-primary font-bold uppercase tracking-wider text-sm">Bases / Gangues</h3>
                      <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1 pl-4">
                        {district.bases.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>

                {district.npcs && district.npcs.length > 0 && (
                  <div className="p-6 bg-black/20 border-t border-border/30">
                    <h3 className="text-primary font-bold uppercase tracking-wider text-sm mb-4">NPCs do Distrito</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {district.npcs.map((npc, nidx) => (
                        <Card key={nidx} className="bg-card border-border/50">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="font-serif text-lg text-primary">{npc.nome}</h4>
                              <span className="text-xs text-muted-foreground">{npc.raca} • {npc.classe}</span>
                            </div>
                            <p className="text-sm">{npc.descricao}</p>
                            <div className="text-xs space-y-1 mt-2 p-2 bg-muted/50 rounded border border-border/30">
                              <p><span className="text-primary">Papel:</span> {npc.papel}</p>
                              <p><span className="text-destructive">Segredo:</span> {npc.segredo}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <Separator className="bg-primary/20" />

          {/* ZONA 4 — Botões de Ação Extras */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sticky bottom-6 z-10 bg-background/80 backdrop-blur p-4 rounded-lg border border-primary/20 shadow-2xl">
            <Button variant="outline" onClick={handleGenerateNpc} disabled={generateNpc.isPending} className="border-primary/50 hover:bg-primary/10">
              {generateNpc.isPending ? "Gerando..." : "Gerar NPC Notável"}
            </Button>
            <Button variant="outline" onClick={handleGenerateRumors} disabled={generateRumors.isPending} className="border-primary/50 hover:bg-primary/10">
              {generateRumors.isPending ? "Gerando..." : "Criar Rumores"}
            </Button>
            <Button variant="outline" onClick={handleGenerateHook} disabled={generateAdventureHook.isPending} className="border-primary/50 hover:bg-primary/10">
              {generateAdventureHook.isPending ? "Gerando..." : "Criar Gancho"}
            </Button>
            <Button variant="default" onClick={handleCopyAll}>
              Copiar Tudo
            </Button>
          </div>

          {/* Resultados Acumulados de Botões Extras */}
          <div className="space-y-6 pb-20">
            {generateNpc.isPending && <Skeleton className="h-24 w-full bg-muted" />}
            {npcs.map((npc, idx) => (
              <Card key={`npc-${idx}`} className="bg-card/50 border-primary/30 animate-in fade-in">
                <CardContent className="p-6 space-y-2">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-serif text-2xl text-primary">{npc.nome}</h4>
                      <span className="text-sm text-muted-foreground">{npc.raca} • {npc.classe}</span>
                    </div>
                    <span className="text-xs uppercase bg-muted px-2 py-1 rounded">NPC Extra</span>
                  </div>
                  <p className="text-md">{npc.descricao}</p>
                  <div className="text-sm space-y-2 mt-4 p-4 bg-muted/30 rounded border border-border/50">
                    <p><span className="text-primary font-bold">Papel:</span> {npc.papel}</p>
                    <p><span className="text-destructive font-bold">Segredo:</span> {npc.segredo}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {generateRumors.isPending && <Skeleton className="h-24 w-full bg-muted" />}
            {rumorsList.map((rSet, idx) => (
              <Card key={`rumor-${idx}`} className="bg-card/50 border-primary/30 animate-in fade-in">
                <CardHeader>
                  <CardTitle className="text-xl text-primary font-serif">Rumores Locais</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    {rSet.rumores?.map((r, i) => (
                      <li key={i} className="leading-relaxed">{r}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}

            {generateAdventureHook.isPending && <Skeleton className="h-32 w-full bg-muted" />}
            {hooks.map((h, idx) => (
              <Card key={`hook-${idx}`} className="bg-card/50 border-primary/30 animate-in fade-in">
                <CardHeader>
                  <CardDescription className="uppercase tracking-wider text-xs font-bold text-destructive mb-2">Gancho de Aventura</CardDescription>
                  <CardTitle className="text-2xl text-primary font-serif">{h.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p className="text-foreground leading-relaxed">{h.descricao}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded">
                      <h4 className="text-destructive font-bold text-sm mb-1 uppercase tracking-wider">Complicação</h4>
                      <p className="text-sm">{h.complicacao}</p>
                    </div>
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded">
                      <h4 className="text-primary font-bold text-sm mb-1 uppercase tracking-wider">Recompensa</h4>
                      <p className="text-sm">{h.recompensa}</p>
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