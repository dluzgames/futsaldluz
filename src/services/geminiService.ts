import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const updateBoardTool: FunctionDeclaration = {
  name: "updateBoardWithAnimation",
  description: "Atualiza a lousa tática com uma sequência de frames para criar uma animação de uma jogada ensaiada.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      frames: {
        type: Type.ARRAY,
        description: "Lista de frames da jogada. Cada frame contém a posição de todos os jogadores e da bola.",
        items: {
          type: Type.OBJECT,
          properties: {
            players: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  x: { type: Type.NUMBER, description: "Posição X (0 a 1)" },
                  y: { type: Type.NUMBER, description: "Posição Y (0 a 1)" },
                  team: { type: Type.STRING, enum: ["A", "B"] },
                  number: { type: Type.STRING },
                  color: { type: Type.STRING }
                },
                required: ["id", "x", "y", "team", "number", "color"]
              }
            },
            ball: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER, description: "Posição X (0 a 1)" },
                y: { type: Type.NUMBER, description: "Posição Y (0 a 1)" }
              },
              required: ["x", "y"]
            }
          },
          required: ["players", "ball"]
        }
      },
      explanation: {
        type: Type.STRING,
        description: "Explicação técnica da jogada que será mostrada no chat."
      }
    },
    required: ["frames", "explanation"]
  }
};

const saveTacticTool: FunctionDeclaration = {
  name: "saveTactic",
  description: "Salva a tática ou jogada atual com um nome específico.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "O nome da tática a ser salva."
      }
    },
    required: ["name"]
  }
};

export async function getTacticalAdvice(prompt: string, boardState: any) {
  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: `
        Você é um treinador de futsal profissional de elite. 
        Sua missão é ajudar o usuário a criar estratégias e jogadas ensaiadas, utilizando seu vasto conhecimento em:

        **Fundamentos e movimentos corporais:**
        - Gato
        - Pisadas
        - Escapadas
        - Segundo Pau
        - Treinos passes laterais 
        - Rondon (21, quadrado 21, 21, 2 toques, 21 pivô meio roda)
        - Finalizações 

        **Marcação:**
        - Baixa (Quadrante absoluto)
        - Alta (Pressão Quadrante, pressão com cobertura)
        - Goleiro linha (Quadrante)
        - Lateral (2 na bola, jogador mais perto do gol adversário pega os da batida)
        - Faltas (3 barreira e jogador base desse)
        - Escanteios (marcação em Y)

        **Rodízios:**
        - 4-0 (Quebra meio, relógio, ataque y)
        - 3-1 (Triângulo troca ala fixo (bola entra pivô oposto vai), triângulo fixo vai no ala (pressão), triângulo ala fixo, 2x1, escapada ala pivô abre espaço)

        **Jogadas ensaiadas:**
        - Faltas (2 na bola, rolar frente e jogador pisar; 1 padrão Katrina; 3 posição 2 na bola e 2 abertos bola no ala oposto, jogador do passe vai pra receber e deixa passar, na sincronia, ala vai pro chute; 4 falta colinas; 5 trenzinho passe segundo pau)
        - Laterais (1 jogador passa pela bola, da pisada pra trás, pivô se movimenta e faz a pisada, jogador que pisou vai pro chute; 2 Faz triângulo e bola pivô)
        - Escanteios (1 jogador faz entrada e de trás chuta, goleiro também pode ir pro chute; 2 gato pequena área e finalização rápida; 3 jogador entra e pisa entre a linha de marcação)

        **Dribles e rabiscadas essenciais:**
        - Corpo frente quadra, balança sair meio ou corredor
        - Quebrar chute
        - Pedaladas
        
        Sempre que o usuário pedir para "mostrar", "desenhar", "fazer" ou "criar" uma jogada (ex: escanteio, falta, rodízio), você DEVE usar a ferramenta 'updateBoardWithAnimation'.
        
        Sempre que o usuário pedir para "salvar", "guardar" ou "eternizar" a tática ou jogada atual, você DEVE usar a ferramenta 'saveTactic'.
        
        REGRAS PARA AS COORDENADAS:
        - X e Y devem estar entre 0 e 1.
        - X=0 é a linha de fundo esquerda (Time A), X=1 é a linha de fundo direita (Time B).
        - Y=0 é a lateral superior, Y=1 é a lateral inferior.
        - O centro da quadra é (0.5, 0.5).
        - O gol do Time A fica em X=0.05, Y=0.5.
        - O gol do Time B fica em X=0.95, Y=0.5.
        
        Crie pelo menos 3 a 5 frames para que a animação seja fluida e compreensível.
        No primeiro frame, posicione os jogadores na formação inicial. Nos frames seguintes, mostre a movimentação.
      `,
      tools: [{ functionDeclarations: [updateBoardTool, saveTacticTool] }]
    }
  });

  const response = await chat.sendMessage({
    message: `Estado atual do campo: ${JSON.stringify(boardState)}. Pergunta: ${prompt}`
  });

  return response;
}
