import React, { useState } from 'react';
import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Topic {
  id: string;
  title: string;
  content: string;
}

const topics: Topic[] = [
  {
    id: 'fundamentos',
    title: 'Fundamentos e Movimentos Corporais',
    content: `
- **Gato**: Movimento rápido e rasteiro para desviar da marcação ou alcançar a bola.
- **Pisadas**: Controle de bola com a sola do pé, essencial para mudar de direção e proteger a posse.
- **Escapadas**: Movimentos para se livrar da marcação e criar espaço, geralmente em velocidade.
- **Segundo Pau**: Posição na segunda trave, esperando um cruzamento ou passe para finalização.
- **Treinos Passes Laterais**: Exercícios para aprimorar a precisão e força nos passes pelas laterais da quadra.
- **Rondon**: Sequência de movimentos e passes para criar superioridade numérica e oportunidades de finalização. Inclui variações como:
  - **21**: Combinação de dois jogadores, um passa e o outro finaliza ou devolve.
  - **Quadrado 21**: Variação do 21, onde os jogadores formam um quadrado para troca de passes.
  - **2 toques**: Limitação de dois toques na bola para agilizar a jogada.
  - **21 pivô meio roda**: O pivô faz um giro no meio da quadra para receber e distribuir a bola.
- **Finalizações**: Técnicas de chute a gol, buscando precisão e potência.
`,
  },
  {
    id: 'marcacao',
    title: 'Marcação',
    content: `
- **Baixa (Quadrante Absoluto)**: Marcação defensiva onde cada jogador é responsável por um quadrante específico da quadra, sem muita perseguição individual.
- **Alta (Pressão Quadrante, Pressão com Cobertura)**: Marcação agressiva no campo adversário, buscando roubar a bola o mais próximo possível do gol. Envolve pressão sobre o portador da bola e cobertura dos companheiros.
- **Goleiro Linha (Quadrante)**: Quando o goleiro atua como um jogador de linha, participando da posse de bola e da construção de jogadas, geralmente em um quadrante específico.
- **Lateral (2 na bola, jogador mais perto do gol adversário pega os da batida)**: Marcação em cobranças de lateral, onde dois jogadores pressionam o portador da bola e o jogador mais próximo do gol adversário se posiciona para interceptar passes ou finalizações.
- **Faltas (3 barreira e jogador base desse)**: Organização defensiva em cobranças de falta, com uma barreira de três jogadores e um jogador posicionado para cobrir o espaço atrás da barreira ou interceptar passes.
- **Escanteios (Marcação em Y)**: Formação defensiva em cobranças de escanteio, onde os jogadores se posicionam em formato de 'Y' para cobrir as áreas de finalização e evitar o gol.
`,
  },
  {
    id: 'rodizios',
    title: 'Rodízios',
    content: `
### 4-0
- **Quebra Meio**: Movimento onde um jogador se infiltra pelo meio da defesa adversária, quebrando as linhas de marcação.
- **Relógio**: Rodízio circular dos jogadores, trocando de posições para confundir a marcação e criar espaços.
- **Ataque Y**: Formação de ataque onde os jogadores se posicionam em 'Y' para criar opções de passe e finalização.

### 3-1
- **Triângulo Troca Ala Fixo (bola entra pivô oposto vai)**: Rodízio onde os alas trocam de posição, e o pivô se movimenta para o lado oposto da bola para receber o passe.
- **Triângulo Fixo Vai no Ala (pressão)**: O pivô se desloca para a lateral para pressionar o adversário, enquanto os alas trocam de posição.
- **Triângulo Ala Fixo**: Formação em triângulo com um ala fixo, mantendo a estrutura defensiva e ofensiva.
- **2x1**: Situação de superioridade numérica no ataque, onde dois jogadores enfrentam um defensor.
- **Escapada Ala Pivô Abre Espaço**: O ala se movimenta para o pivô, que abre espaço para a infiltração do ala ou para um passe em profundidade.
`,
  },
  {
    id: 'jogadas-ensaiadas',
    title: 'Jogadas Ensaiadas',
    content: `
### Faltas
- **2 na bola, rolar frente e jogador pisar**: Dois jogadores se aproximam da bola, um rola para frente e o outro pisa na bola, criando uma oportunidade de passe ou chute.
- **1 padrão Katrina**: Jogada específica com movimentação pré-determinada para surpreender a defesa adversária.
- **3 posição 2 na bola e 2 abertos bola no ala oposto, jogador do passe vai pra receber e deixa passar, na sincronia, ala vai pro chute**: Jogada complexa com movimentação coordenada para criar uma oportunidade de chute para o ala oposto.
- **4 falta colinas**: Jogada específica para cobrança de falta, com movimentação dos jogadores em 'colinas' para confundir a marcação.
- **5 trenzinho passe segundo pau**: Sequência de passes rápidos para o segundo pau, buscando a finalização.

### Laterais
- **1 jogador passa pela bola, da pisada pra trás, pivô se movimenta e faz a pisada, jogador que pisou vai pro chute**: Jogada de lateral com movimentação do pivô e finalização do jogador que fez a pisada.
- **2 Faz triângulo e bola pivô**: Formação em triângulo com passe para o pivô, buscando a finalização ou a distribuição da bola.

### Escanteios
- **1 jogador faz entrada e de trás chuta, goleiro também pode ir pro chute**: Jogada de escanteio onde um jogador se infiltra e outro chuta de trás, com a opção do goleiro também participar da finalização.
- **2 gato pequena área e finalização rápida**: Movimento rápido na pequena área para finalização surpresa.
- **3 jogador entra e pisa entre a linha de marcação**: Jogada de escanteio onde um jogador se infiltra e pisa na bola entre as linhas de marcação para criar espaço.
`,
  },
  {
    id: 'dribles',
    title: 'Dribles e Rabiscadas Essenciais',
    content: `
- **Corpo frente quadra, balança sair meio ou corredor**: Drible para desequilibrar o defensor e sair pelo meio ou pelo corredor.
- **Quebrar chute**: Movimento para simular um chute e desviar da marcação.
- **Pedaladas**: Movimento rápido com os pés sobre a bola para enganar o defensor e mudar de direção.
`,
  },
];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTopic, setActiveTopic] = useState<string>(topics[0].id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-slate-100">Guia de Futsal</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar de Tópicos */}
          <nav className="w-64 bg-slate-900 border-r border-slate-700 overflow-y-auto p-4 flex flex-col gap-2">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(topic.id)}
                className={`text-left px-3 py-2 rounded-lg transition-colors 
                  ${activeTopic === topic.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700'}`}
              >
                {topic.title}
              </button>
            ))}
          </nav>
          {/* Conteúdo do Tópico Ativo */}
          <div className="flex-1 overflow-y-auto p-6 text-slate-300 prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {topics.find(topic => topic.id === activeTopic)?.content || ''}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
