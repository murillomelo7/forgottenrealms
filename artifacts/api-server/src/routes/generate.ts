import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  GenerateCityBody,
  GenerateDistrictBody,
  GenerateNpcBody,
  GenerateRumorsBody,
  GenerateAdventureHookBody,
} from "@workspace/api-zod";

const router = Router();

const SYSTEM_PROMPT = `Você é um mestre de D&D especialista em Forgotten Realms (Faerûn) e D&D 2024.
Você gera conteúdo criativo e coerente para sessões de RPG em português brasileiro.
O conteúdo deve ter sabor de Forgotten Realms sem copiar trechos longos de material oficial.
Seja criativo, detalhado e útil para mestres de jogo.
Sempre responda em JSON válido conforme solicitado.`;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resolveRandom(value: string, options: string[]): string {
  return value === "Qualquer" ? pickRandom(options) : value;
}

const SIZES = ["Vilarejo", "Cidade Pequena", "Cidade Média", "Cidade Grande", "Metrópole"];
const REGIONS = [
  "Costa da Espada", "Vale do Vento Uivante", "Cormyr", "Sembia", "Thay",
  "Amn", "Calimshan", "Chessenta", "Aguas Profundas", "Baldur's Gate",
  "Neverwinter", "Waterdeep", "Luskan", "Icewind Dale", "Anauroch",
];
const CULTURES = [
  "Humana (Faéruniana)", "Élfica", "Anã", "Halfling", "Gnômica",
  "Tiefling", "Draconiana", "Mista", "Exótica Oriental",
];
const ALIGNMENTS = [
  "Leal e Bom", "Neutro e Bom", "Caótico e Bom",
  "Leal e Neutro", "Neutro", "Caótico e Neutro",
  "Leal e Mau", "Neutro e Mau", "Caótico e Mau",
];

const DISTRICT_TYPES = [
  "Mercantil", "Nobre", "Portuário", "Militar", "Templos e Religioso",
  "Mágico e Arcano", "Artesanal", "Boêmio e Entretenimento", "Gueto e Pobres",
  "Subterrâneo / Esgotos", "Residencial", "Criminoso",
];

router.post("/generate/city", async (req, res) => {
  const parsed = GenerateCityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    return;
  }

  const { name, size, region, culture, alignment } = parsed.data;
  const resolvedSize = resolveRandom(size, SIZES);
  const resolvedRegion = resolveRandom(region, REGIONS);
  const resolvedCulture = resolveRandom(culture, CULTURES);
  const resolvedAlignment = resolveRandom(alignment, ALIGNMENTS);

  const prompt = `Gere uma cidade de Forgotten Realms com as seguintes características:
- Nome: ${name}
- Tamanho: ${resolvedSize}
- Região de Faerûn: ${resolvedRegion}
- Cultura predominante: ${resolvedCulture}
- Tendência geral: ${resolvedAlignment}

Responda APENAS com um JSON válido neste formato exato:
{
  "nome": "string (use o nome fornecido)",
  "alcunha": "string (apelido ou título da cidade, ex: 'A Cidade das Torres')",
  "resumo": "string (resumo com até 100 palavras, capturando a essência da cidade)",
  "populacao": "string (população estimada com detalhes sobre composição racial)",
  "geografia": "string (terreno, clima, localização em Faerûn, características naturais)",
  "economia": "string (principais atividades econômicas, comércio, recursos)",
  "governo": "string (tipo de governo, líderes, estrutura política)",
  "marcasFamosos": "string (locais icônicos, monumentos, pontos turísticos notáveis)",
  "culturaLocal": "string (costumes, festivais, crenças, tradições únicas)",
  "problemas": "string (conflitos internos, ameaças externas, problemas sociais coerentes com a cidade)",
  "npcs": [
    {
      "nome": "string",
      "raca": "string",
      "classe": "string",
      "descricao": "string (aparência e personalidade em 1-2 frases)",
      "papel": "string (função na cidade)",
      "segredo": "string (segredo ou motivação oculta)"
    }
  ] (gere 3-5 NPCs importantes e interessantes)
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const cityData = JSON.parse(content);

    res.json(cityData);
  } catch (err) {
    req.log.error({ err }, "Error generating city");
    res.status(500).json({ error: "Erro ao gerar cidade" });
  }
});

router.post("/generate/district", async (req, res) => {
  const parsed = GenerateDistrictBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    return;
  }

  const { tipo, estabelecimentos, bases, cityContext } = parsed.data;
  const resolvedTipo = resolveRandom(tipo, DISTRICT_TYPES);

  const prompt = `Gere um distrito para a seguinte cidade de Forgotten Realms:

CONTEXTO DA CIDADE:
${cityContext}

PARÂMETROS DO DISTRITO:
- Tipo: ${resolvedTipo}
- Número de estabelecimentos notáveis: ${estabelecimentos}
- Número de bases de operação (locais secretos/tocas): ${bases}

Responda APENAS com um JSON válido neste formato exato:
{
  "nome": "string (nome do distrito com sabor de Forgotten Realms)",
  "tipo": "${resolvedTipo}",
  "atmosfera": "string (sensação e atmosfera em 1 frase vívida)",
  "descricao": "string (descrição detalhada do distrito, 2-3 parágrafos)",
  "populacao": "string (habitantes típicos do distrito)",
  "funcao": "string (papel e função do distrito na cidade)",
  "estabelecimentos": ["string", ...] (lista de ${estabelecimentos} estabelecimentos notáveis com nome e descrição breve, ex: "Taverna do Dragão Dourado — famosa pelos drinques élficos"),
  "bases": ${bases > 0 ? `["string", ...] (lista de ${bases} bases/locais ocultos com nome e descrição breve)` : "[]"},
  "problemasLocais": "string (problemas e conflitos específicos do distrito)",
  "npcs": [
    {
      "nome": "string",
      "raca": "string",
      "classe": "string",
      "descricao": "string (aparência e personalidade em 1-2 frases)",
      "papel": "string (função no distrito)",
      "segredo": "string (segredo ou motivação oculta)"
    }
  ] (gere 2-3 NPCs locais interessantes)
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const districtData = JSON.parse(content);

    res.json(districtData);
  } catch (err) {
    req.log.error({ err }, "Error generating district");
    res.status(500).json({ error: "Erro ao gerar distrito" });
  }
});

router.post("/generate/npc", async (req, res) => {
  const parsed = GenerateNpcBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    return;
  }

  const { cityContext, districtContext } = parsed.data;

  const prompt = `Gere um NPC notável para a seguinte localização em Forgotten Realms:

CONTEXTO DA CIDADE:
${cityContext}

${districtContext ? `CONTEXTO DO DISTRITO:\n${districtContext}\n` : ""}

Crie um NPC único, memorável e relevante para o cenário. Responda APENAS com um JSON válido:
{
  "nome": "string (nome com sabor de Forgotten Realms)",
  "raca": "string",
  "classe": "string (ou ocupação se não for aventureiro)",
  "descricao": "string (aparência física e personalidade marcante, 2-3 frases)",
  "papel": "string (função na sociedade local)",
  "segredo": "string (segredo obscuro ou motivação oculta que o torna interessante para a aventura)"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const npcData = JSON.parse(content);

    res.json(npcData);
  } catch (err) {
    req.log.error({ err }, "Error generating NPC");
    res.status(500).json({ error: "Erro ao gerar NPC" });
  }
});

router.post("/generate/rumors", async (req, res) => {
  const parsed = GenerateRumorsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    return;
  }

  const { cityContext } = parsed.data;

  const prompt = `Gere rumores intrigantes para a seguinte cidade de Forgotten Realms:

CONTEXTO DA CIDADE:
${cityContext}

Crie 5 rumores variados — alguns verdadeiros, alguns falsos, alguns parcialmente corretos.
Cada rumor deve ser específico e útil para um mestre de jogo como gancho ou ambientação.
Responda APENAS com um JSON válido:
{
  "rumores": [
    "string (rumor 1 — curto, específico e intrigante)",
    "string (rumor 2)",
    "string (rumor 3)",
    "string (rumor 4)",
    "string (rumor 5)"
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const rumorsData = JSON.parse(content);

    res.json(rumorsData);
  } catch (err) {
    req.log.error({ err }, "Error generating rumors");
    res.status(500).json({ error: "Erro ao gerar rumores" });
  }
});

router.post("/generate/adventure-hook", async (req, res) => {
  const parsed = GenerateAdventureHookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    return;
  }

  const { cityContext, districtsContext } = parsed.data;

  const prompt = `Gere um gancho de aventura criativo para a seguinte cidade de Forgotten Realms:

CONTEXTO DA CIDADE:
${cityContext}

${districtsContext ? `DISTRITOS EXISTENTES:\n${districtsContext}\n` : ""}

Crie um gancho de aventura original, coerente com o cenário e útil para D&D 2024.
Responda APENAS com um JSON válido:
{
  "titulo": "string (nome intrigante para o gancho)",
  "descricao": "string (situação inicial que engaja os personagens, 3-4 frases)",
  "complicacao": "string (complicação ou reviravolta que surge durante a aventura)",
  "recompensa": "string (recompensa possível — dinheiro, informação, favor, item mágico, etc.)"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const hookData = JSON.parse(content);

    res.json(hookData);
  } catch (err) {
    req.log.error({ err }, "Error generating adventure hook");
    res.status(500).json({ error: "Erro ao gerar gancho de aventura" });
  }
});

export default router;
